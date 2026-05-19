from sqlalchemy import select
from typing import Sequence
from src.core.repository import BaseAsyncRepository
from src.modules.applications.models import Application

class ApplicationRepository(BaseAsyncRepository[Application]):
    def __init__(self, session):
        super().__init__(Application, session)

    async def get_applications_by_job(self, job_id: str) -> Sequence[Application]:
        """Lister toutes les candidatures reçues pour un poste spécifique"""
        query = select(self.model).where(self.model.job_id == job_id)
        result = await self.session.execute(query)
        return result.scalars().all()