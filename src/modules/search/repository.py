"""Repository pour la recherche avancée avec filtres et géolocalisation."""
import math
from sqlalchemy import select, func, or_, and_, text
from sqlalchemy.ext.asyncio import AsyncSession
from geoalchemy2.functions import ST_DWithin, ST_MakePoint, ST_SetSRID

from src.modules.jobs.models import Job, JobStatus
from src.modules.users.models import User, Profile, UserRole
from src.modules.applications.models import Application


class SearchRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def search_jobs(
        self,
        query: str | None = None,
        skills: list[str] | None = None,
        status: str | None = None,
        is_remote: bool | None = None,
        company_id: str | None = None,
        latitude: float | None = None,
        longitude: float | None = None,
        radius_km: float | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> dict:
        """Recherche avancée d'offres avec filtres multiples + géolocalisation."""
        stmt = select(Job)

        # Filtres
        if status:
            stmt = stmt.where(Job.status == status)
        else:
            stmt = stmt.where(Job.status == JobStatus.ACTIVE)

        if is_remote is not None:
            stmt = stmt.where(Job.is_remote == is_remote)

        if company_id:
            stmt = stmt.where(Job.company_id == company_id)

        if query:
            search_pattern = f"%{query}%"
            stmt = stmt.where(
                or_(
                    Job.title.ilike(search_pattern),
                    Job.description.ilike(search_pattern),
                )
            )

        if skills:
            for skill in skills:
                stmt = stmt.where(
                    Job.required_skills.ilike(f"%{skill}%")
                )

        # Filtre géospatial PostGIS (FIX: paramètres lat/lon/radius étaient ignorés)
        if latitude is not None and longitude is not None and radius_km is not None:
            point = func.ST_SetSRID(func.ST_MakePoint(longitude, latitude), 4326)
            radius_m = radius_km * 1000
            stmt = stmt.where(
                ST_DWithin(
                    func.geography(Job.job_location),
                    func.geography(point),
                    radius_m,
                )
            )

        # Compter le total
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_result = await self.session.execute(count_stmt)
        total = total_result.scalar() or 0

        # Pagination
        offset = (page - 1) * page_size
        stmt = stmt.offset(offset).limit(page_size)

        result = await self.session.execute(stmt)
        jobs = result.scalars().all()

        items = []
        for job in jobs:
            item = {
                "id": str(job.id),
                "title": job.title,
                "description": job.description[:200] + "..." if len(job.description) > 200 else job.description,
                "status": job.status.value,
                "is_remote": job.is_remote,
                "company_id": str(job.company_id),
                "required_skills": job.required_skills,
            }
            items.append(item)

        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": math.ceil(total / page_size) if total > 0 else 0,
        }

    async def search_candidates(
        self,
        query: str | None = None,
        skills: list[str] | None = None,
        role: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> dict:
        """Recherche avancée de candidats."""
        stmt = select(User, Profile).join(Profile, Profile.user_id == User.id, isouter=True)
        stmt = stmt.where(User.role == UserRole.CANDIDATE, User.is_active == True)

        if role:
            stmt = stmt.where(User.role == role)

        if query:
            search_pattern = f"%{query}%"
            stmt = stmt.where(
                or_(
                    Profile.first_name.ilike(search_pattern),
                    Profile.last_name.ilike(search_pattern),
                    User.email.ilike(search_pattern),
                )
            )

        if skills:
            for skill in skills:
                stmt = stmt.where(Profile.skills.ilike(f"%{skill}%"))

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_result = await self.session.execute(count_stmt)
        total = total_result.scalar() or 0

        offset = (page - 1) * page_size
        stmt = stmt.offset(offset).limit(page_size)

        result = await self.session.execute(stmt)
        rows = result.all()

        items = []
        for user, profile in rows:
            item = {
                "id": str(user.id),
                "email": user.email,
                "first_name": profile.first_name if profile else None,
                "last_name": profile.last_name if profile else None,
                "skills": profile.skills if profile else [],
            }
            items.append(item)

        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": math.ceil(total / page_size) if total > 0 else 0,
        }
