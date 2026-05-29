from sqlalchemy import select, func, cast
from typing import Sequence
from geoalchemy2 import Geography
from src.core.repository import BaseAsyncRepository
from src.modules.jobs.models import Job, JobStatus
from src.modules.users.models import Profile, User, UserRole

class JobRepository(BaseAsyncRepository[Job]):
    def __init__(self, session):
        super().__init__(Job, session)

    async def get_active_jobs_by_company(self, company_id: str) -> Sequence[Job]:
        """Récupérer uniquement les offres d'emploi actives d'une entreprise"""
        query = (
            select(self.model)
            .where(self.model.company_id == company_id)
            .where(self.model.status == JobStatus.ACTIVE)
        )
        result = await self.session.execute(query)
        return result.scalars().all()

    async def find_jobs_within_radius(self, lon: float, lat: float, radius_km: float) -> Sequence[Job]:
        """
        Recherche SIG : Trouve toutes les offres d'emploi actives dans un rayon donné (en km).
        Utilise ST_DWithin avec un cast en Geography pour calculer la distance en mètres de façon précise sur EPSG:4326.
        """
        radius_meters = radius_km * 1000.0
        
        # Création du point géographique de recherche
        target_point = func.ST_SetSRID(func.ST_MakePoint(lon, lat), 4326)
        
        query = (
            select(self.model)
            .where(self.model.status == JobStatus.ACTIVE)
            .where(
                func.ST_DWithin(
                    cast(self.model.job_location, Geography),
                    cast(target_point, Geography),
                    radius_meters
                )
            )
        )
        result = await self.session.execute(query)
        return result.scalars().all()

    async def find_matching_candidates_for_job(self, job_id: str) -> list[dict]:
        """
        Matching Engine : Trouve les meilleurs candidats pour une offre.
        Combine la distance géographique (PostGIS) et le recouvrement de compétences (JSON).
        """
        job = await self.get(job_id)
        if not job:
            return []

        # 1. Requête pour récupérer les profils candidats actifs avec leur distance (si applicable)
        distance_col = None
        if job.job_location is not None:
            distance_col = func.ST_Distance(
                cast(Profile.location, Geography), 
                cast(job.job_location, Geography)
            ).label('distance')
        else:
            # Colonne factice si pas de géolocalisation
            distance_col = select(func.cast(None, func.float8)).label('distance')

        query = (
            select(Profile, User, distance_col)
            .join(User, Profile.user_id == User.id)
            .where(User.role == UserRole.CANDIDATE)
            .where(User.is_active == True)
        )
        
        result = await self.session.execute(query)
        rows = result.all()

        job_skills = set(job.required_skills) if job.required_skills else set()
        
        matches = []
        for profile, user, distance in rows:
            profile_skills = set(profile.skills) if profile.skills else set()
            
            # Recouvrement
            intersection = job_skills.intersection(profile_skills)
            skill_score = (len(intersection) / len(job_skills) * 100) if job_skills else 0
            
            # Score composite : on privilégie les compétences, puis la proximité
            # Ex: Si distance < 50km, on ajoute un bonus
            distance_km = (distance / 1000.0) if distance is not None else None
            distance_bonus = 0
            if distance_km is not None and distance_km <= 50:
                distance_bonus = 20 # 20 points de bonus si dans un rayon de 50km
                
            total_score = min(skill_score + distance_bonus, 100)
            
            # On ne garde que les profils pertinents (> 0 ou si on veut tout garder)
            matches.append({
                "profile_id": str(profile.id),
                "user_id": str(user.id),
                "first_name": profile.first_name,
                "last_name": profile.last_name,
                "email": user.email,
                "matching_score": round(total_score, 2),
                "distance_km": round(distance_km, 2) if distance_km is not None else None,
                "matched_skills": list(intersection),
                "missing_skills": list(job_skills - profile_skills)
            })

        # Tri décroissant par score total
        matches.sort(key=lambda x: x["matching_score"], reverse=True)
        return matches