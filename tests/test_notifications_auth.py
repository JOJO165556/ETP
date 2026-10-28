"""Tests des notifications persistees et du durcissement de l'authentification.

Les tests sont volontairement unitaires (TestClient + dependency_overrides +
repositories en memoire) afin de ne dependre ni de PostgreSQL, ni de Redis, ni
d'un serveur SMTP.
"""
import uuid
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from src.core import token_blacklist
from src.core.database import get_db
from src.core.security import (
    create_email_verification_token,
    create_refresh_token,
    get_password_hash,
    verify_refresh_token,
)
from src.modules.auth.dependencies import get_current_user
from src.modules.auth.router import router as auth_router
from src.modules.auth.services import AuthService, UNVERIFIED_EMAIL_DETAIL
from src.modules.companies.models import Company  # noqa: F401 - enregistre le mapper Company
from src.modules.notifications.models import Notification, NotificationType
from src.modules.notifications.router import router as notifications_router
from src.modules.notifications.services import NotificationService
from src.modules.users.models import User

API = "/api/v1"

USER_A = "11111111-1111-1111-1111-111111111111"
USER_B = "22222222-2222-2222-2222-222222222222"


# ----------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------


def _user(user_id: str = USER_A) -> MagicMock:
    user = MagicMock(spec=User)
    user.id = user_id
    user.email = "user@example.com"
    user.is_active = True
    user.is_verified = True
    return user


def _make_app(*routers, current_user=None, session=None) -> FastAPI:
    app = FastAPI()
    for router in routers:
        app.include_router(router, prefix=API)

    if current_user is not None:
        app.dependency_overrides[get_current_user] = lambda: current_user

    async def _override_get_db():
        yield session if session is not None else AsyncMock()

    app.dependency_overrides[get_db] = _override_get_db
    return app


class FakeNotificationRepository:
    """Repository en memoire reproduisant le filtrage par proprietaire."""

    def __init__(self):
        self.items: list[Notification] = []

    async def create(self, data: dict) -> Notification:
        notification = Notification(
            id=uuid.uuid4(),
            user_id=data["user_id"],
            title=data["title"],
            message=data["message"],
            type=data["type"],
            is_read=data.get("is_read", False),
            link=data.get("link"),
        )
        notification.created_at = datetime.now(timezone.utc)
        self.items.append(notification)
        return notification

    def _owned(self, user_id):
        return [n for n in self.items if str(n.user_id) == str(user_id)]

    async def list_for_user(self, user_id, unread_only=False, limit=20, offset=0):
        items = self._owned(user_id)
        if unread_only:
            items = [n for n in items if not n.is_read]
        items = sorted(items, key=lambda n: n.created_at, reverse=True)
        return items[offset:offset + limit]

    async def count_for_user(self, user_id, unread_only=False):
        items = self._owned(user_id)
        if unread_only:
            items = [n for n in items if not n.is_read]
        return len(items)

    async def count_unread(self, user_id):
        return len([n for n in self._owned(user_id) if not n.is_read])

    async def get_for_user(self, notification_id, user_id):
        for notification in self._owned(user_id):
            if str(notification.id) == str(notification_id):
                return notification
        return None

    async def mark_all_read(self, user_id):
        updated = 0
        for notification in self._owned(user_id):
            if not notification.is_read:
                notification.is_read = True
                updated += 1
        return updated


# ----------------------------------------------------------------------
# 1 & 2. Notifications : isolation et anti-IDOR
# ----------------------------------------------------------------------


@pytest.mark.asyncio
async def test_notification_isolation_between_users():
    fake = FakeNotificationRepository()
    service = NotificationService(AsyncMock())
    service.repo = fake

    await service.create(
        user_id=USER_A,
        title="Candidature reçue",
        message="Votre candidature a été enregistrée.",
        notification_type=NotificationType.APPLICATION_STATUS,
    )

    notifications_a, total_a, unread_a = await service.list_for_user(USER_A)
    notifications_b, total_b, unread_b = await service.list_for_user(USER_B)

    assert total_a == 1 and unread_a == 1 and len(notifications_a) == 1
    assert total_b == 0 and unread_b == 0 and notifications_b == []


def test_notification_route_only_returns_owner_notifications(monkeypatch):
    fake = FakeNotificationRepository()
    monkeypatch.setattr(
        "src.modules.notifications.services.NotificationRepository",
        lambda db: fake,
    )

    user_a = _user(USER_A)
    user_b = _user(USER_B)
    client_b = TestClient(_make_app(notifications_router, current_user=user_b))
    client_a = TestClient(_make_app(notifications_router, current_user=user_a))

    # B cree une notification, A aussi.
    resp = client_b.post(f"{API}/notifications/read-all")
    assert resp.status_code == 200

    import asyncio

    asyncio.run(NotificationService(AsyncMock()).create(
        user_id=USER_A, title="A", message="Pour A"
    ))
    asyncio.run(NotificationService(AsyncMock()).create(
        user_id=USER_B, title="B", message="Pour B"
    ))

    resp_a = client_a.get(f"{API}/notifications/me")
    resp_b = client_b.get(f"{API}/notifications/me")

    assert resp_a.status_code == 200
    assert resp_b.status_code == 200
    assert resp_a.json()["total"] == 1
    assert resp_a.json()["notifications"][0]["message"] == "Pour A"
    assert resp_b.json()["total"] == 1
    assert resp_b.json()["notifications"][0]["message"] == "Pour B"


@pytest.mark.asyncio
async def test_mark_as_read_is_anti_idor():
    fake = FakeNotificationRepository()
    service = NotificationService(AsyncMock())
    service.repo = fake

    notification = await service.create(
        user_id=USER_A, title="Test", message="Notification de A"
    )

    with pytest.raises(HTTPException) as exc:
        await service.mark_as_read(notification.id, USER_B)

    assert exc.value.status_code == 404
    assert notification.is_read is False

    updated = await service.mark_as_read(notification.id, USER_A)
    assert updated.is_read is True


def test_mark_as_read_route_returns_404_for_other_user(monkeypatch):
    fake = FakeNotificationRepository()
    monkeypatch.setattr(
        "src.modules.notifications.services.NotificationRepository",
        lambda db: fake,
    )

    import asyncio

    notification = asyncio.run(NotificationService(AsyncMock()).create(
        user_id=USER_A, title="Test", message="Notification de A"
    ))

    client = TestClient(_make_app(notifications_router, current_user=_user(USER_B)))
    resp = client.patch(f"{API}/notifications/{notification.id}/read")

    assert resp.status_code == 404


def test_read_all_route_updates_only_current_user(monkeypatch):
    fake = FakeNotificationRepository()
    monkeypatch.setattr(
        "src.modules.notifications.services.NotificationRepository",
        lambda db: fake,
    )

    import asyncio

    asyncio.run(NotificationService(AsyncMock()).create(user_id=USER_A, title="A", message="A"))
    asyncio.run(NotificationService(AsyncMock()).create(user_id=USER_B, title="B", message="B"))

    client = TestClient(_make_app(notifications_router, current_user=_user(USER_A)))
    resp = client.post(f"{API}/notifications/read-all")

    assert resp.status_code == 200
    assert resp.json()["updated"] == 1
    assert all(n.is_read for n in fake._owned(USER_A))
    assert all(not n.is_read for n in fake._owned(USER_B))


# ----------------------------------------------------------------------
# 3. Login : compte non verifie refuse
# ----------------------------------------------------------------------


@pytest.mark.asyncio
async def test_login_rejects_unverified_account():
    user = _user(USER_A)
    user.is_verified = False
    user.hashed_password = get_password_hash("MonSecret123!")

    service = AuthService.__new__(AuthService)
    service.db = AsyncMock()
    service.user_repo = MagicMock()
    service.user_repo.get_by_email = AsyncMock(return_value=user)

    form = SimpleNamespace(username=user.email, password="MonSecret123!")

    with pytest.raises(HTTPException) as exc:
        await service.authenticate_user(form)

    assert exc.value.status_code == 403
    assert exc.value.detail == UNVERIFIED_EMAIL_DETAIL


@pytest.mark.asyncio
async def test_login_accepts_verified_account():
    user = _user(USER_A)
    user.is_verified = True
    user.hashed_password = get_password_hash("MonSecret123!")

    service = AuthService.__new__(AuthService)
    service.db = AsyncMock()
    service.user_repo = MagicMock()
    service.user_repo.get_by_email = AsyncMock(return_value=user)

    token = await service.authenticate_user(
        SimpleNamespace(username=user.email, password="MonSecret123!")
    )

    assert token.access_token
    assert token.refresh_token
    assert verify_refresh_token(token.refresh_token)["jti"]


# ----------------------------------------------------------------------
# 4 & 5. Verification d'email : token valide, invalide, expire
# ----------------------------------------------------------------------


def test_verify_email_with_valid_token():
    session = AsyncMock()
    user = _user(USER_A)
    user.is_verified = False

    token = create_email_verification_token(USER_A)
    client = TestClient(_make_app(auth_router, session=session))

    with patch("src.modules.auth.services.UserRepository") as repo_cls:
        repo_cls.return_value.get = AsyncMock(return_value=user)
        resp = client.get(f"{API}/auth/verify-email", params={"token": token})

    assert resp.status_code == 200, resp.text
    assert resp.json()["verified"] is True
    assert user.is_verified is True
    session.flush.assert_awaited_once()


@pytest.mark.parametrize("token", ["token-invalide", ""])
def test_verify_email_with_invalid_token(token):
    client = TestClient(_make_app(auth_router))
    resp = client.get(f"{API}/auth/verify-email", params={"token": token})

    # Token vide -> 422 (validation FastAPI), token malforme -> 400.
    assert resp.status_code in (400, 422)


def test_verify_email_with_expired_token():
    token = create_email_verification_token(
        USER_A, expires_delta=timedelta(seconds=-1)
    )
    client = TestClient(_make_app(auth_router))
    resp = client.get(f"{API}/auth/verify-email", params={"token": token})

    assert resp.status_code == 400


# ----------------------------------------------------------------------
# 6. Logout : blacklist du JTI et rejet du refresh
# ----------------------------------------------------------------------


class FakeRedis:
    def __init__(self):
        self.store: dict[str, tuple[str, int | None]] = {}

    async def set(self, key, value, ex=None):
        self.store[key] = (value, ex)
        return True

    async def exists(self, key):
        return int(key in self.store)


@pytest.mark.asyncio
async def test_logout_blacklists_refresh_token_and_refresh_is_rejected(monkeypatch):
    fake_redis = FakeRedis()

    async def fake_get_redis():
        return fake_redis

    monkeypatch.setattr(token_blacklist, "_get_redis", fake_get_redis)

    refresh_token = create_refresh_token(USER_A)
    jti = verify_refresh_token(refresh_token)["jti"]

    client = TestClient(_make_app(auth_router, session=AsyncMock()))
    resp = client.post(
        f"{API}/auth/logout", json={"refresh_token": refresh_token}
    )

    assert resp.status_code == 200, resp.text
    key = f"{token_blacklist.REDIS_KEY_PREFIX}{jti}"
    assert key in fake_redis.store
    _, ttl = fake_redis.store[key]
    assert ttl is not None and ttl > 0

    service = AuthService.__new__(AuthService)
    service.db = AsyncMock()
    service.user_repo = MagicMock()

    with pytest.raises(HTTPException) as exc:
        await service.refresh_access_token(refresh_token)

    assert exc.value.status_code == 401
