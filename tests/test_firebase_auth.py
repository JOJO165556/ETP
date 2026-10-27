"""Tests du flux d'authentification Firebase (endpoint /auth/firebase + provisionnement).

Notes :
- `verify_id_token` / `verify_app_check_token` / `UserRepository` sont patches
  au niveau du module router (nommage des imports du routeur).
- `get_db` est override au niveau du module `core.database` car le routeur
  importe la dependance par nom.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.modules.auth.router import router as auth_router
from src.modules.users.models import UserRole

import src.core.database as core_db
import src.modules.auth.router as auth_router_mod


def _make_app(session) -> FastAPI:
    app = FastAPI()
    app.include_router(auth_router, prefix="/api/v1")

    async def override_get_db():
        yield session

    core_db.get_db = override_get_db
    return app


@pytest.fixture(autouse=True)
def _restore_get_db():
    original = core_db.get_db
    yield
    core_db.get_db = original


def _social_claims(uid: str, email: str, provider: str) -> dict:
    return {
        "uid": uid,
        "email": email,
        "firebase": {"sign_in_provider": provider},
    }


class TestFirebaseLogin:
    def test_new_user_created(self):
        session = AsyncMock()
        session.commit = AsyncMock()
        client = TestClient(_make_app(session))

        fake_claims = _social_claims("fb-uid-123", "testsocial@example.com", "google.com")
        with (
            patch.object(auth_router_mod, "verify_id_token", return_value=fake_claims),
            patch.object(auth_router_mod, "verify_app_check_token", return_value=True),
            patch.object(auth_router_mod, "UserRepository") as repo_cls,
        ):
            repo = repo_cls.return_value
            repo.get_by_firebase_uid = AsyncMock(return_value=None)
            repo.get_by_email = AsyncMock(return_value=None)
            new_user = MagicMock()
            new_user.id = "u-999"
            new_user.is_active = True
            new_user.email = "testsocial@example.com"
            new_user.role = UserRole.CANDIDATE
            repo.create = AsyncMock(return_value=new_user)

            resp = client.post("/api/v1/auth/firebase", json={"id_token": "tok"})

        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data["token_type"] == "bearer"
        assert data["access_token"]
        assert data["refresh_token"]

        create_kwargs = repo.create.call_args[0][0]
        assert create_kwargs["firebase_uid"] == "fb-uid-123"
        assert create_kwargs["auth_provider"] == "google"
        assert create_kwargs["hashed_password"] == ""

    def test_disabled_firebase_rejects_token(self):
        client = TestClient(_make_app(AsyncMock()))
        with (
            patch.object(auth_router_mod, "verify_id_token", return_value=None),
            patch.object(auth_router_mod, "verify_app_check_token", return_value=True),
        ):
            resp = client.post("/api/v1/auth/firebase", json={"id_token": "tok"})
        assert resp.status_code == 401

    def test_existing_user_linked_by_email(self):
        session = AsyncMock()
        session.commit = AsyncMock()
        client = TestClient(_make_app(session))

        fake_claims = _social_claims("fb-uid-456", "existant@example.com", "facebook.com")
        existing = MagicMock()
        existing.id = "u-777"
        existing.is_active = True
        existing.email = "existant@example.com"
        existing.firebase_uid = None

        with (
            patch.object(auth_router_mod, "verify_id_token", return_value=fake_claims),
            patch.object(auth_router_mod, "verify_app_check_token", return_value=True),
            patch.object(auth_router_mod, "UserRepository") as repo_cls,
        ):
            repo = repo_cls.return_value
            repo.get_by_firebase_uid = AsyncMock(return_value=None)
            repo.get_by_email = AsyncMock(return_value=existing)

            resp = client.post("/api/v1/auth/firebase", json={"id_token": "tok"})

        assert resp.status_code == 200, resp.text
        assert existing.firebase_uid == "fb-uid-456"
        assert existing.auth_provider == "facebook"

    def test_app_check_rejected(self):
        client = TestClient(_make_app(AsyncMock()))
        with (
            patch.object(auth_router_mod, "verify_id_token", return_value={"uid": "x", "email": "a@b.com"}),
            patch.object(auth_router_mod, "verify_app_check_token", return_value=False),
        ):
            resp = client.post("/api/v1/auth/firebase", json={"id_token": "tok"})
        assert resp.status_code == 401

    def test_superadmin_role_rejected(self):
        """Pas d'escalade de privileges via le role du payload."""
        client = TestClient(_make_app(AsyncMock()))
        fake_claims = _social_claims("fb-uid-789", "escalade@example.com", "google.com")
        with (
            patch.object(auth_router_mod, "verify_id_token", return_value=fake_claims),
            patch.object(auth_router_mod, "verify_app_check_token", return_value=True),
            patch.object(auth_router_mod, "UserRepository") as repo_cls,
        ):
            repo = repo_cls.return_value
            repo.get_by_firebase_uid = AsyncMock(return_value=None)
            repo.get_by_email = AsyncMock(return_value=None)

            resp = client.post(
                "/api/v1/auth/firebase",
                json={"id_token": "tok", "role": "superadmin"},
            )

        assert resp.status_code == 422
        repo.create.assert_not_called()


class TestFirebaseProvisioning:
    @pytest.mark.asyncio
    async def test_register_provisions_firebase_user(self):
        from src.modules.auth.services import AuthService
        from src.modules.auth.schemas import RegisterRequest

        user = MagicMock()
        user.id = "u-abc-123"
        user.email = "register@example.com"

        with (
            patch("src.modules.auth.services.provision_user", new=AsyncMock(return_value="fb-uid-abc")) as provision,
            patch("src.modules.auth.services.AuthService.__init__", lambda self, db: setattr(self, 'db', db) or setattr(self, 'user_repo', MagicMock())),
        ):
            db = AsyncMock()
            service = AuthService(db)
            service.user_repo.get_by_email = AsyncMock(return_value=None)
            service.user_repo.create = AsyncMock(return_value=user)

            token = await service.register(RegisterRequest(
                email="register@example.com",
                password="secret123",
                first_name="Marie",
            ))

            assert token.access_token
            provision.assert_awaited_once_with(
                email="register@example.com",
                password="secret123",
                user_id="u-abc-123",
                display_name="Marie",
            )
            assert user.firebase_uid == "fb-uid-abc"

    @pytest.mark.asyncio
    async def test_register_without_firebase_noop(self):
        """Firebase desactive : provision_user retourne None (no-op), inscription OK."""
        from src.modules.auth.services import AuthService
        from src.modules.auth.schemas import RegisterRequest

        user = MagicMock()
        user.id = "u-noop"

        with patch("src.modules.auth.services.AuthService.__init__", lambda self, db: setattr(self, 'db', db) or setattr(self, 'user_repo', MagicMock())):
            db = AsyncMock()
            service = AuthService(db)
            service.user_repo.get_by_email = AsyncMock(return_value=None)
            service.user_repo.create = AsyncMock(return_value=user)

            token = await service.register(RegisterRequest(
                email="noop@example.com",
                password="secret123",
            ))
            assert token.access_token