"""Repository pour les requêtes d'agrégation analytics."""
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.applications.models import Application, ApplicationStage
from src.modules.jobs.models import Job, JobStatus
from src.modules.users.models import User


class AnalyticsRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_pipeline_stats(self, company_id: str | None = None) -> dict:
        """Statistiques du pipeline de candidatures, filtrées par tenant si
        company_id est fourni (cas recruteur/company_admin)."""
        base = select(func.count(Application.id))
        if company_id:
            base = base.join(Application.job).where(Job.company_id == company_id)
        total_result = await self.session.execute(base)
        total_applications = total_result.scalar() or 0

        stage_base = (
            select(Application.stage, func.count(Application.id))
            .group_by(Application.stage)
        )
        if company_id:
            stage_base = stage_base.join(Application.job).where(Job.company_id == company_id)
        stage_result = await self.session.execute(stage_base)
        by_stage = {row[0].value: row[1] for row in stage_result.all()}

        avg_base = select(func.avg(Application.matching_score))
        if company_id:
            avg_base = avg_base.join(Application.job).where(Job.company_id == company_id)
        avg_result = await self.session.execute(avg_base)
        avg_score = avg_result.scalar()

        return {
            "total_applications": total_applications,
            "by_stage": by_stage,
            "avg_matching_score": round(float(avg_score), 2) if avg_score else None,
        }

    async def get_job_stats(self, company_id: str | None = None) -> dict:
        """Statistiques des offres, filtrées par tenant si company_id est fourni."""
        total_base = select(func.count(Job.id))
        if company_id:
            total_base = total_base.where(Job.company_id == company_id)
        total_result = await self.session.execute(total_base)
        total_jobs = total_result.scalar() or 0

        active_result = await self.session.execute(
            select(func.count(Job.id))
            .where(Job.status == JobStatus.ACTIVE)
            .where(Job.company_id == company_id) if company_id
            else select(func.count(Job.id)).where(Job.status == JobStatus.ACTIVE)
        )
        active_jobs = active_result.scalar() or 0

        closed_result = await self.session.execute(
            select(func.count(Job.id))
            .where(Job.status == JobStatus.CLOSED)
            .where(Job.company_id == company_id) if company_id
            else select(func.count(Job.id)).where(Job.status == JobStatus.CLOSED)
        )
        closed_jobs = closed_result.scalar() or 0

        subq = (
            select(Job.id, func.count(Application.id).label("app_count"))
            .join(Application, Application.job_id == Job.id, isouter=True)
            .group_by(Job.id)
        )
        if company_id:
            subq = subq.where(Job.company_id == company_id)
        subq = subq.subquery()
        avg_result = await self.session.execute(
            select(func.avg(subq.c.app_count)).select_from(subq)
        )
        avg_apps = avg_result.scalar()

        return {
            "total_jobs": total_jobs,
            "active_jobs": active_jobs,
            "closed_jobs": closed_jobs,
            "avg_applications_per_job": round(float(avg_apps), 2) if avg_apps else 0,
        }

    async def get_hiring_funnel(self, company_id: str | None = None) -> dict:
        """Entonnoir de recrutement, filtré par tenant si company_id est fourni."""
        base = (
            select(Application.stage, func.count(Application.id))
            .group_by(Application.stage)
        )
        if company_id:
            base = base.join(Application.job).where(Job.company_id == company_id)
        result = await self.session.execute(base)
        counts = {row[0].value: row[1] for row in result.all()}
        return {
            "applied": counts.get(ApplicationStage.APPLIED, 0),
            "screening": counts.get(ApplicationStage.SCREENING, 0),
            "interview": counts.get(ApplicationStage.INTERVIEW, 0),
            "offer": counts.get(ApplicationStage.OFFER, 0),
            "hired": counts.get(ApplicationStage.HIRED, 0),
            "rejected": counts.get(ApplicationStage.REJECTED, 0),
        }

    async def get_top_skills(self, limit: int = 10, company_id: str | None = None) -> list[dict]:
        """Compétences les plus demandées dans les offres, filtrées par tenant
        si company_id est fourni."""
        from collections import Counter
        base = select(Job.required_skills).where(Job.required_skills.isnot(None))
        if company_id:
            base = base.where(Job.company_id == company_id)
        result = await self.session.execute(base)
        all_skills: list[str] = []
        for row in result.all():
            skills = row[0]
            if isinstance(skills, list):
                all_skills.extend(s.lower().strip() for s in skills)
            elif isinstance(skills, dict):
                all_skills.extend(k.lower().strip() for k in skills.keys())

        counter = Counter(all_skills)
        total = sum(counter.values()) or 1
        return [
            {"skill": skill, "count": count, "percentage": round(count / total * 100, 1)}
            for skill, count in counter.most_common(limit)
        ]

    async def get_company_stats(self, company_id: str) -> dict:
        """Statistiques pour une entreprise spécifique (déjà filtrée)."""
        jobs_result = await self.session.execute(
            select(func.count(Job.id)).where(Job.company_id == company_id)
        )
        total_jobs = jobs_result.scalar() or 0

        apps_result = await self.session.execute(
            select(func.count(Application.id))
            .join(Job, Application.job_id == Job.id)
            .where(Job.company_id == company_id)
        )
        total_applications = apps_result.scalar() or 0

        hired_result = await self.session.execute(
            select(func.count(Application.id))
            .join(Job, Application.job_id == Job.id)
            .where(Job.company_id == company_id, Application.stage == ApplicationStage.HIRED)
        )
        hired_count = hired_result.scalar() or 0

        conversion = (hired_count / total_applications * 100) if total_applications > 0 else 0

        return {
            "company_id": company_id,
            "total_jobs": total_jobs,
            "total_applications": total_applications,
            "hired_count": hired_count,
            "conversion_rate": round(conversion, 2),
        }
