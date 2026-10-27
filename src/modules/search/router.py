from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.modules.auth.dependencies import (
    get_current_user,
    require_roles,
    tenant_company_id,
)
from src.modules.users.models import User, UserRole
from src.modules.search.repository import SearchRepository
from src.modules.search.schemas import JobSearchFilters, CandidateSearchFilters, SearchResult
from src.modules.jobs.models import JobStatus

router = APIRouter(prefix="/search", tags=["Recherche Avancée"])

_RECRUITER_OR_ADMIN = require_roles(
    UserRole.RECRUITER, UserRole.COMPANY_ADMIN, UserRole.SUPERADMIN
)


@router.post("/jobs", response_model=SearchResult, summary="Recherche d'offres avec filtres")
async def search_jobs(
    filters: JobSearchFilters,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Recherche d'offres.

    Un utilisateur non superadmin ne peut rechercher que des offres ACTIVE :
    les brouillons et offres archivées d'autres entreprises ne doivent pas
    fuiter via le filtre ``status`` fourni par le client.
    """
    is_superadmin = current_user.role == UserRole.SUPERADMIN
    result = await SearchRepository(db).search_jobs(
        query=filters.query,
        skills=filters.skills,
        status=filters.status if is_superadmin else JobStatus.ACTIVE,
        is_remote=filters.is_remote,
        company_id=filters.company_id,
        latitude=filters.latitude,
        longitude=filters.longitude,
        radius_km=filters.radius_km,
        page=filters.page,
        page_size=filters.page_size,
    )
    return SearchResult(**result)


@router.post("/candidates", response_model=SearchResult, summary="Recherche de candidats")
async def search_candidates(
    filters: CandidateSearchFilters,
    current_user: User = Depends(_RECRUITER_OR_ADMIN),
    db: AsyncSession = Depends(get_db),
):
    """Recherche de candidats réservée aux recruteurs/admin.

    Un recruteur ou company_admin est strictement restreint aux candidats ayant
    postulé à une offre de son entreprise. Le superadmin a un accès global.
    """
    if current_user.role == UserRole.SUPERADMIN:
        company_id = None
    else:
        company_id = tenant_company_id(current_user) or None

    result = await SearchRepository(db).search_candidates(
        query=filters.query,
        skills=filters.skills,
        role=filters.role,
        company_id=company_id,
        page=filters.page,
        page_size=filters.page_size,
    )
    return SearchResult(**result)
