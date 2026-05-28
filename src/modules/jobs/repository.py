from sqlalchemy import select, func, cast
from typing import Sequence
from geoalchemy2 import Geography
from src.core.repository import BaseAsyncRepository
from src.modules.jobs.models import Job, JobStatus

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