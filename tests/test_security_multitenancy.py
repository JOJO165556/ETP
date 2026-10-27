"""Tests de non-régression sécurité : isolation multi-tenant, anti-IDOR,
escalade de privilèges, validation des uploads et des schémas d'authentification.

Ces tests sont volontairement unitaires (TestClient + dependency_overrides)
afin de ne dépendre ni de PostgreSQL, ni de Redis, ni de MinIO.
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.core.database import get_db
from src.modules.auth.dependencies import get_current_user
from src.modules.auth.schemas import RegisterRequest
from src.modules.users.models import User, UserRole

import src.modules.analytics.router as analytics_router_mod
import src.modules.applications.router as applications_router_mod
from src.modules.analytics.router import router as analytics_router
from src.modules.applications.router import router as applications_router
from src.modules.auth.router import router as auth_router
from src.modules.search.router import router as search_router
from src.modules.users.router import router as users_router

API = "/api/v1"


# ----------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------


def _user(
    role: UserRole = UserRole.CANDIDATE,
    user_id: str = "user-A",
    company_id: str | None = None,
) -> MagicMock:
    u = MagicMock(spec=User)
    u.id = user_id
    u.role = role
    u.company_id = company_id
    u.is_active = True
    return u


def _make_app(*routers, current_user: MagicMock | None = None, session=None) -> FastAPI:
    app = FastAPI()
    for router in routers:
        app.include_router(router, prefix=API)

    if current_user is not None:
        app.dependency_overrides[get_current_user] = lambda: current_user

    async def _override_get_db():
        yield session if session is not None else AsyncMock()

    app.dependency_overrides[get_db] = _override_get_db
    return app


# ----------------------------------------------------------------------
# 1. Inscription : impossible d'injecter un rôle élevé
# ----------------------------------------------------------------------


def test_register_rejects_injected_role():
    """Un champ `role` injecté est refusé par le schéma (extra=forbid)."""
    client = TestClient(_make_app(auth_router))
    resp = client.post(
        f"{API}/auth/register",
        json={
            "email": "candidat@example.com",
            "password": "MonSecret123!",
            "role": "superadmin",
        },
    )
    assert resp.status_code == 422, resp.text
    assert "role" not in RegisterRequest.model_fields


@pytest.mark.asyncio
async def test_auth_service_always_creates_candidate():
    """Le service force systématiquement UserRole.CANDIDATE."""
    from src.modules.auth.services import AuthService

    fake_user = MagicMock()
    fake_user.id = "user-new"

    with patch(
        "src.modules.auth.services.provision_user",
        new=AsyncMock(return_value=None),
    ):
        service = AuthService.__new__(AuthService)
        service.db = AsyncMock()
        service.user_repo = MagicMock()
        service.user_repo.get_by_email = AsyncMock(return_value=None)
        service.user_repo.create = AsyncMock(return_value=fake_user)

        await service.register(
            RegisterRequest(email="candidat@example.com", password="MonSecret123!")
        )

    created_payload = service.user_repo.create.call_args[0][0]
    assert created_payload["role"] == UserRole.CANDIDATE


# ----------------------------------------------------------------------
# 2. Anti-IDOR CV (utilisateurs)
# ----------------------------------------------------------------------


def test_candidate_cannot_download_another_candidate_cv():
    """Candidat A -> CV du candidat B : 403."""
    current_user = _user(UserRole.CANDIDATE, user_id="candidate-A")
    client = TestClient(_make_app(users_router, current_user=current_user))

    resp = client.get(f"{API}/users/profile/cv/candidate-B")

    assert resp.status_code == 403, resp.text


def test_recruiter_cannot_download_cv_outside_tenant():
    """Recruteur A -> CV d'un candidat sans candidature dans son entreprise : 403."""
    current_user = _user(
        UserRole.RECRUITER, user_id="recruiter-A", company_id="company-A"
    )
    session = AsyncMock()
    empty_result = MagicMock()
    empty_result.fetchall.return_value = []
    session.execute = AsyncMock(return_value=empty_result)
    client = TestClient(
        _make_app(users_router, current_user=current_user, session=session)
    )

    resp = client.get(f"{API}/users/profile/cv/candidate-B")

    assert resp.status_code == 403, resp.text


# ----------------------------------------------------------------------
# 3. Anti-IDOR CV (candidatures)
# ----------------------------------------------------------------------


def test_candidate_cannot_download_another_application_cv():
    """Candidat A -> CV d'une candidature du candidat B : 403."""
    current_user = _user(UserRole.CANDIDATE, user_id="candidate-A")
    application = MagicMock()
    application.candidate_id = "candidate-B"
    application.job = MagicMock()
    application.resume_storage_path = "cvs/b.pdf"

    client = TestClient(_make_app(applications_router, current_user=current_user))
    with patch.object(applications_router_mod, "ApplicationRepository") as repo_cls:
        repo_cls.return_value.get_with_details = AsyncMock(return_value=application)
        resp = client.get(f"{API}/applications/app-B/cv")

    assert resp.status_code == 403, resp.text


# ----------------------------------------------------------------------
# 4. Isolation multi-tenant analytics et recherche
# ----------------------------------------------------------------------


def test_recruiter_cannot_read_other_company_stats():
    """Recruteur company-A -> /analytics/companies/company-B : 403."""
    current_user = _user(
        UserRole.RECRUITER, user_id="recruiter-A", company_id="company-A"
    )
    client = TestClient(_make_app(analytics_router, current_user=current_user))

    resp = client.get(f"{API}/analytics/companies/company-B")

    assert resp.status_code == 403, resp.text


@pytest.mark.asyncio
async def test_analytics_dashboard_is_scoped_to_tenant():
    """Les agrégats sont calculés avec le company_id de l'utilisateur connecté."""
    current_user = _user(
        UserRole.RECRUITER, user_id="recruiter-A", company_id="company-A"
    )
    fake_repo = MagicMock()
    fake_repo.get_pipeline_stats = AsyncMock(
        return_value={"total_applications": 0, "by_stage": {}, "avg_matching_score": None}
    )
    fake_repo.get_job_stats = AsyncMock(
        return_value={
            "total_jobs": 0,
            "active_jobs": 0,
            "closed_jobs": 0,
            "avg_applications_per_job": 0,
        }
    )
    fake_repo.get_hiring_funnel = AsyncMock(
        return_value={
            "applied": 0,
            "screening": 0,
            "interview": 0,
            "offer": 0,
            "hired": 0,
            "rejected": 0,
        }
    )
    fake_repo.get_top_skills = AsyncMock(return_value=[])

    with patch.object(analytics_router_mod, "AnalyticsRepository", return_value=fake_repo):
        await analytics_router_mod.get_dashboard(current_user=current_user, db=AsyncMock())

    fake_repo.get_pipeline_stats.assert_awaited_once_with("company-A")
    fake_repo.get_job_stats.assert_awaited_once_with("company-A")
    fake_repo.get_hiring_funnel.assert_awaited_once_with("company-A")
    fake_repo.get_top_skills.assert_awaited_once_with(company_id="company-A")


def test_candidate_search_requires_recruiter_role():
    """Un candidat ne peut pas utiliser la recherche de candidats."""
    current_user = _user(UserRole.CANDIDATE, user_id="candidate-A")
    client = TestClient(_make_app(
        search_router,
        current_user=current_user,
        session=AsyncMock(),
    ))

    resp = client.post(f"{API}/search/candidates", json={})

    assert resp.status_code == 403, resp.text


# ----------------------------------------------------------------------
# 5. Validation binaire des fichiers uploadés
# ----------------------------------------------------------------------


def test_upload_rejects_fake_pdf_by_magic_bytes():
    """Un fichier texte renommé resume.pdf est rejeté (400)."""
    current_user = _user(UserRole.CANDIDATE, user_id="candidate-A")
    client = TestClient(_make_app(users_router, current_user=current_user))

    resp = client.post(
        f"{API}/users/profile/upload-cv",
        files={"file": ("resume.pdf", b"<?php echo 'pwned'; ?>", "application/pdf")},
    )

    assert resp.status_code == 400, resp.text
    assert "PDF" in resp.json()["detail"]


# ----------------------------------------------------------------------
# 6. Schémas forgot-password / reset-password
# ----------------------------------------------------------------------


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"email": ""},
        {"email": "pas-un-email"},
        {"email": "a@b.com", "role": "superadmin"},
    ],
)
def test_forgot_password_rejects_malformed_payload(payload):
    client = TestClient(_make_app(auth_router))
    resp = client.post(f"{API}/auth/forgot-password", json=payload)
    assert resp.status_code == 422, resp.text


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"token": "abc"},
        {"new_password": "MotDePasse123!"},
        {"token": "abc", "new_password": "court"},
        {"token": "", "new_password": "MotDePasse123!"},
    ],
)
def test_reset_password_rejects_malformed_payload(payload):
    client = TestClient(_make_app(auth_router))
    resp = client.post(f"{API}/auth/reset-password", json=payload)
    assert resp.status_code == 422, resp.text


# ----------------------------------------------------------------------
# 7. Statut Celery : un échec est persisté en base
# ----------------------------------------------------------------------


@pytest.mark.asyncio
async def test_parse_resume_failure_is_persisted():
    """Une erreur de téléchargement/parsing positionne la candidature en FAILURE."""
    from src.modules.applications import tasks as tasks_mod

    storage = MagicMock()
    storage.download_file = AsyncMock(side_effect=RuntimeError("MinIO indisponible"))

    with (
        patch.object(tasks_mod, "AsyncStorageService", return_value=storage),
        patch.object(
            tasks_mod, "_mark_application_failed", new=AsyncMock()
        ) as mark_failed,
    ):
        with pytest.raises(RuntimeError):
            await tasks_mod.async_parse_resume_task("app-1", "cvs/cv.pdf")

    mark_failed.assert_awaited_once()
    assert mark_failed.call_args[0][0] == "app-1"
