from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.core.database import get_db
from src.modules.auth.dependencies import require_roles, get_current_user, get_tenant_company_id
from src.modules.users.models import User, UserRole
from src.modules.analytics.repository import AnalyticsRepository
from src.modules.analytics.schemas import (
    AnalyticsDashboard, PipelineStats, JobStats, HiringFunnel,
    SkillDemand, CompanyStats, CandidateResume,
)
from src.modules.jobs.models import Job, JobStatus
from src.modules.applications.models import Application, ApplicationStage

router = APIRouter(prefix="/analytics", tags=["Analytics & Dashboard"])

_RECRUITER_OR_ADMIN = require_roles(UserRole.RECRUITER, UserRole.COMPANY_ADMIN, UserRole.SUPERADMIN)


def _tenant_from_context(current_user: User) -> str | None:
    """Extrait le tenant company_id depuis le contexte authentifié.
    Retourne None pour les superadmins (pas de filtrage)."""
    if current_user.role == UserRole.SUPERADMIN:
        return None
    return get_tenant_company_id(current_user)


@router.get("/candidates/me", response_model=CandidateResume, summary="Résumé KPI du candidat")
async def get_candidate_resume(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Indicateurs candidat (Overview). Tout est calculé depuis les données
    réelles : candidatures actives, nouveaux matchs (offres partageant au
    moins une compétence), taux d'entretien/offre. Les compteurs sans source
    (vues du profil) restent à 0 — aucune donnée inventée."""
    await db.refresh(current_user, attribute_names=["profile"])
    skills = set((current_user.profile.skills or [])) if current_user.profile else set()

    apps = (
        await db.execute(
            select(Application).where(Application.candidate_id == str(current_user.id))
        )
    ).scalars().all()
    active_apps = [a for a in apps if a.stage != ApplicationStage.REJECTED]
    interview_stage = {
        ApplicationStage.INTERVIEW,
        ApplicationStage.OFFER,
        ApplicationStage.HIRED,
    }
    offer_stage = {ApplicationStage.OFFER, ApplicationStage.HIRED}
    total = max(len(apps), 1)
    taux_entretien = round(len([a for a in apps if a.stage in interview_stage]) / total * 100, 1)
    taux_offre = round(len([a for a in apps if a.stage in offer_stage]) / total * 100, 1)

    nouveaux_matchs = 0
    if skills:
        jobs = (
            await db.execute(
                select(Job).where(Job.status == JobStatus.ACTIVE)
            )
        ).scalars().all()
        nouveaux_matchs = len([
            j for j in jobs
            if j.required_skills and set(j.required_skills or []) & skills
        ])

    return CandidateResume(
        vues_profil=0,
        evolution_vues=0,
        nouveaux_matchs=nouveaux_matchs,
        candidatures_actives=len(active_apps),
        taux_entretien=taux_entretien,
        taux_offre=taux_offre,
    )


@router.get("/dashboard", response_model=AnalyticsDashboard, summary="Tableau de bord complet")
async def get_dashboard(
    current_user: User = Depends(_RECRUITER_OR_ADMIN),
    db: AsyncSession = Depends(get_db),
):
    repo = AnalyticsRepository(db)
    tenant = _tenant_from_context(current_user)
    pipeline_data = await repo.get_pipeline_stats(tenant)
    jobs_data = await repo.get_job_stats(tenant)
    funnel_data = await repo.get_hiring_funnel(tenant)
    skills_data = await repo.get_top_skills(company_id=tenant)

    return AnalyticsDashboard(
        pipeline=PipelineStats(**pipeline_data),
        jobs=JobStats(**jobs_data),
        funnel=HiringFunnel(**funnel_data),
        top_skills=[SkillDemand(**s) for s in skills_data],
    )


@router.get("/pipeline", response_model=PipelineStats, summary="Statistiques du pipeline")
async def get_pipeline_stats(
    current_user: User = Depends(_RECRUITER_OR_ADMIN),
    db: AsyncSession = Depends(get_db),
):
    repo = AnalyticsRepository(db)
    tenant = _tenant_from_context(current_user)
    data = await repo.get_pipeline_stats(tenant)
    return PipelineStats(**data)


@router.get("/jobs", response_model=JobStats, summary="Statistiques des offres")
async def get_job_stats(
    current_user: User = Depends(_RECRUITER_OR_ADMIN),
    db: AsyncSession = Depends(get_db),
):
    repo = AnalyticsRepository(db)
    tenant = _tenant_from_context(current_user)
    data = await repo.get_job_stats(tenant)
    return JobStats(**data)


@router.get("/funnel", response_model=HiringFunnel, summary="Entonnoir de recrutement")
async def get_hiring_funnel(
    current_user: User = Depends(_RECRUITER_OR_ADMIN),
    db: AsyncSession = Depends(get_db),
):
    repo = AnalyticsRepository(db)
    tenant = _tenant_from_context(current_user)
    data = await repo.get_hiring_funnel(tenant)
    return HiringFunnel(**data)


@router.get("/skills", response_model=list[SkillDemand], summary="Compétences les plus demandées")
async def get_top_skills(
    limit: int = 10,
    current_user: User = Depends(_RECRUITER_OR_ADMIN),
    db: AsyncSession = Depends(get_db),
):
    repo = AnalyticsRepository(db)
    tenant = _tenant_from_context(current_user)
    data = await repo.get_top_skills(limit=limit, company_id=tenant)
    return [SkillDemand(**s) for s in data]


@router.get("/companies/{company_id}", response_model=CompanyStats, summary="Stats par entreprise")
async def get_company_stats(
    company_id: str,
    current_user: User = Depends(_RECRUITER_OR_ADMIN),
    db: AsyncSession = Depends(get_db),
):
    repo = AnalyticsRepository(db)
    if current_user.role != UserRole.SUPERADMIN:
        tenant = get_tenant_company_id(current_user)
        if tenant != company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Accès non autorisé à ces données multi-tenant.",
            )
    data = await repo.get_company_stats(company_id)
    return CompanyStats(**data)
