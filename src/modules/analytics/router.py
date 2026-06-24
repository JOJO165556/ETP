from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.modules.analytics.repository import AnalyticsRepository
from src.modules.analytics.schemas import (
    AnalyticsDashboard, PipelineStats, JobStats, HiringFunnel,
    SkillDemand, CompanyStats,
)

router = APIRouter(prefix="/analytics", tags=["Analytics & Dashboard"])


@router.get("/dashboard", response_model=AnalyticsDashboard, summary="Tableau de bord complet")
async def get_dashboard(db: AsyncSession = Depends(get_db)):
    repo = AnalyticsRepository(db)
    pipeline_data = await repo.get_pipeline_stats()
    jobs_data = await repo.get_job_stats()
    funnel_data = await repo.get_hiring_funnel()
    skills_data = await repo.get_top_skills()

    return AnalyticsDashboard(
        pipeline=PipelineStats(**pipeline_data),
        jobs=JobStats(**jobs_data),
        funnel=HiringFunnel(**funnel_data),
        top_skills=[SkillDemand(**s) for s in skills_data],
    )


@router.get("/pipeline", response_model=PipelineStats, summary="Statistiques du pipeline")
async def get_pipeline_stats(db: AsyncSession = Depends(get_db)):
    repo = AnalyticsRepository(db)
    data = await repo.get_pipeline_stats()
    return PipelineStats(**data)


@router.get("/jobs", response_model=JobStats, summary="Statistiques des offres")
async def get_job_stats(db: AsyncSession = Depends(get_db)):
    repo = AnalyticsRepository(db)
    data = await repo.get_job_stats()
    return JobStats(**data)


@router.get("/funnel", response_model=HiringFunnel, summary="Entonnoir de recrutement")
async def get_hiring_funnel(db: AsyncSession = Depends(get_db)):
    repo = AnalyticsRepository(db)
    data = await repo.get_hiring_funnel()
    return HiringFunnel(**data)


@router.get("/skills", response_model=list[SkillDemand], summary="Compétences les plus demandées")
async def get_top_skills(limit: int = 10, db: AsyncSession = Depends(get_db)):
    repo = AnalyticsRepository(db)
    data = await repo.get_top_skills(limit=limit)
    return [SkillDemand(**s) for s in data]


@router.get("/companies/{company_id}", response_model=CompanyStats, summary="Stats par entreprise")
async def get_company_stats(company_id: str, db: AsyncSession = Depends(get_db)):
    repo = AnalyticsRepository(db)
    data = await repo.get_company_stats(company_id)
    return CompanyStats(**data)
