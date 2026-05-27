from sqlalchemy import select
from typing import Sequence
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