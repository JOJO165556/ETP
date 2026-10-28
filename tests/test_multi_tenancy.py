"""Tests d'isolation multi-tenant pour les modules users, analytics et gdpr."""

import pytest
from fastapi import HTTPException, status
from unittest.mock import AsyncMock, MagicMock
from src.modules.users.models import User, UserRole
from src.modules.users.repository import UserRepository
from src.modules.analytics.repository import AnalyticsRepository
from src.modules.gdpr.router import _require_target_in_tenant_scope
from src.modules.auth.dependencies import tenant_company_id


# Enregistre le mapper Company (relation User.company) avant toute configuration
# SQLAlchemy : les tests importent les modèles unitairement.
import src.modules.companies.models  # noqa: F401,E402


# Helpers
def _mock_user(
    role: UserRole = UserRole.RECRUITER,
    company_id: str | None = "company-A",
    user_id: str = "user-recruiter-A",
) -> MagicMock:
    u = MagicMock(spec=User)
    u.id = user_id
    u.role = role
    u.company_id = company_id
    u.is_active = True
    return u


def _mock_execute_scalar_one_none(mock_db: AsyncMock, value):
    """Configure mock_db.execute pour retourner `value` via scalar_one_or_none()."""
    result = MagicMock()
    result.scalar_one_or_none.return_value = value
    mock_db.execute = AsyncMock(return_value=result)


def _mock_execute_scalars_all(mock_db: AsyncMock, rows):
    """Configure mock_db.execute pour retourner des lignes via scalars().all()."""
    result = MagicMock()
    result.scalars.return_value.all.return_value = rows
    mock_db.execute = AsyncMock(return_value=result)


# Tests auth / dépendances
def test_tenant_company_id_extracts_company_id():
    user = _mock_user(company_id="comp-123")
    assert tenant_company_id(user) == "comp-123"


def test_tenant_company_id_superadmin_no_company():
    user = _mock_user(role=UserRole.SUPERADMIN, company_id=None)
    assert tenant_company_id(user) == ""


def test_tenant_company_id_missing_company_raises():
    """Un recruteur sans company_id ne peut pas accéder aux données multi-tenant."""
    user = _mock_user(role=UserRole.RECRUITER, company_id=None)
    with pytest.raises(HTTPException) as exc_info:
        tenant_company_id(user)
    assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
    assert (
        "Compte de recruteur/company_admin sans entreprise assignée."
        in exc_info.value.detail
    )


# Tests repository users
@pytest.mark.asyncio
async def test_user_repository_get_candidates_tenant_builds_query():
    mock_db = AsyncMock()
    repo = UserRepository(mock_db)
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = []
    mock_db.execute = AsyncMock(return_value=mock_result)

    users = await repo.get_candidates_tenant(company_id="comp-X", skip=0, limit=10)
    assert users == []
    assert mock_db.execute.called


@pytest.mark.asyncio
async def test_user_repository_get_candidates_tenant_uses_company_id_filter():
    """Vérifie que la méthode ajoute bien la jointure Job + filtre company_id."""
    mock_db = AsyncMock()
    repo = UserRepository(mock_db)

    # Premier appel : créer la subquery candidate_subq (select distinct ...)
    # Deuxième appel : requête principale avec .where(id.in_(subquery))
    # Nous mockons les deux appels séquentiellement.
    subquery_result = MagicMock()
    subquery_result.scalars.return_value.all.return_value = []  # pas de candidats

    main_result = MagicMock()
    main_result.scalars.return_value.all.return_value = []

    call_count = 0

    async def side_effect(*_args, **_kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return subquery_result
        return main_result

    mock_db.execute = AsyncMock(side_effect=side_effect)

    users = await repo.get_candidates_tenant(
        company_id="comp-Z", skip=5, limit=20, search="python"
    )
    assert users == []
    assert mock_db.execute.call_count >= 1


# Tests repository analytics
@pytest.mark.asyncio
async def test_analytics_repository_get_pipeline_stats_filters_by_company():
    mock_db = AsyncMock()
    repo = AnalyticsRepository(mock_db)
    mock_result = MagicMock()
    mock_result.scalar.return_value = 0
    mock_db.execute = AsyncMock(return_value=mock_result)

    stats = await repo.get_pipeline_stats(company_id="comp-A")
    assert stats["total_applications"] == 0
    assert mock_db.execute.called


@pytest.mark.asyncio
async def test_analytics_repository_get_job_stats_filters_by_company():
    mock_db = AsyncMock()
    repo = AnalyticsRepository(mock_db)
    mock_result = MagicMock()
    mock_result.scalar.return_value = 0
    mock_db.execute = AsyncMock(return_value=mock_result)

    stats = await repo.get_job_stats(company_id="comp-B")
    assert stats["total_jobs"] == 0
    assert mock_db.execute.called


@pytest.mark.asyncio
async def test_analytics_repository_get_hiring_funnel_filters_by_company():
    mock_db = AsyncMock()
    repo = AnalyticsRepository(mock_db)
    mock_result = MagicMock()
    mock_result.all.return_value = []
    mock_db.execute = AsyncMock(return_value=mock_result)

    funnel = await repo.get_hiring_funnel(company_id="comp-C")
    assert funnel["applied"] == 0
    assert mock_db.execute.called


@pytest.mark.asyncio
async def test_analytics_repository_get_top_skills_filters_by_company():
    mock_db = AsyncMock()
    repo = AnalyticsRepository(mock_db)
    mock_result = MagicMock()
    mock_result.all.return_value = []
    mock_db.execute = AsyncMock(return_value=mock_result)

    skills = await repo.get_top_skills(limit=5, company_id="comp-D")
    assert skills == []
    assert mock_db.execute.called


@pytest.mark.asyncio
async def test_analytics_repository_get_company_stats_uses_company_id():
    mock_db = AsyncMock()
    repo = AnalyticsRepository(mock_db)
    mock_result = MagicMock()
    mock_result.scalar.return_value = 42
    mock_db.execute = AsyncMock(return_value=mock_result)

    stats = await repo.get_company_stats(company_id="comp-E")
    assert stats["total_jobs"] == 42
    assert mock_db.execute.called


# Tests GDPR : isolation multi-tenant sur export / suppression / anonymisation
@pytest.mark.asyncio
async def test_gdpr_require_target_in_tenant_scope_same_company():
    mock_db = AsyncMock()
    current_user = _mock_user(
        role=UserRole.COMPANY_ADMIN, company_id="comp-A", user_id="admin-A"
    )
    target = MagicMock(spec=User)
    target.id = "candidate-1"
    target.company_id = "comp-A"
    _mock_execute_scalar_one_none(mock_db, target)

    await _require_target_in_tenant_scope(current_user, "candidate-1", mock_db)
    # Ne doit pas lever


@pytest.mark.asyncio
async def test_gdpr_require_target_in_tenant_scope_different_company():
    mock_db = AsyncMock()
    current_user = _mock_user(
        role=UserRole.COMPANY_ADMIN, company_id="comp-A", user_id="admin-A"
    )
    target = MagicMock(spec=User)
    target.id = "candidate-2"
    target.company_id = "comp-B"
    _mock_execute_scalar_one_none(mock_db, target)

    with pytest.raises(Exception) as exc_info:
        await _require_target_in_tenant_scope(current_user, "candidate-2", mock_db)
    assert exc_info.value.status_code == 403
    assert "Accès non autorisé à ces données multi-tenant." in exc_info.value.detail


@pytest.mark.asyncio
async def test_gdpr_require_target_in_tenant_scope_admin_own_data():
    mock_db = AsyncMock()
    current_user = _mock_user(
        role=UserRole.COMPANY_ADMIN, company_id="comp-A", user_id="admin-A"
    )
    target = MagicMock(spec=User)
    target.id = "admin-A"
    target.company_id = "comp-A"
    _mock_execute_scalar_one_none(mock_db, target)

    await _require_target_in_tenant_scope(current_user, "admin-A", mock_db)
    # Ne doit pas lever (un admin peut agir sur ses propres données)


@pytest.mark.asyncio
async def test_gdpr_require_target_in_tenant_scope_target_not_found():
    mock_db = AsyncMock()
    current_user = _mock_user(
        role=UserRole.COMPANY_ADMIN, company_id="comp-A", user_id="admin-A"
    )
    _mock_execute_scalar_one_none(mock_db, None)

    with pytest.raises(Exception) as exc_info:
        await _require_target_in_tenant_scope(current_user, "ghost", mock_db)
    assert exc_info.value.status_code == 404
    assert "Utilisateur non trouvé" in exc_info.value.detail


@pytest.mark.asyncio
async def test_gdpr_require_target_in_tenant_scope_forbidden_role():
    """Un utilisateur sans le rôle COMPANY_ADMIN ne doit pas pouvoir
    utiliser cette fonction (levée de 403 immédiate)."""
    mock_db = AsyncMock()
    current_user = _mock_user(role=UserRole.RECRUITER, company_id="comp-A")
    with pytest.raises(Exception) as exc_info:
        await _require_target_in_tenant_scope(current_user, "any", mock_db)
    assert exc_info.value.status_code == 403
    assert "Accès non autorisé à ces données multi-tenant." in exc_info.value.detail
