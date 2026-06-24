from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.modules.auth.dependencies import get_current_user
from src.modules.users.models import User
from src.modules.search.repository import SearchRepository
from src.modules.search.schemas import JobSearchFilters, CandidateSearchFilters, SearchResult

router = APIRouter(prefix="/search", tags=["Recherche Avancée"])


@router.post("/jobs", response_model=SearchResult, summary="Recherche d'offres avec filtres")
async def search_jobs(
    filters: JobSearchFilters,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = SearchRepository(db)
    result = await repo.search_jobs(
        query=filters.query,
        skills=filters.skills,
        status=filters.status,
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
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = SearchRepository(db)
    result = await repo.search_candidates(
        query=filters.query,
        skills=filters.skills,
        role=filters.role,
        page=filters.page,
        page_size=filters.page_size,
    )
    return SearchResult(**result)
