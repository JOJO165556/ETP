from sqlalchemy import select
from src.core.repository import BaseAsyncRepository
from src.modules.companies.models import Company

class CompanyRepository(BaseAsyncRepository[Company]):
    def __init__(self, session):
        super().__init__(Company, session)

    async def get_by_siret(self, siret: str) -> Company | None:
        """Vérification de l'existence d'une entreprise"""
        query = select(self.model).where(self.model.siret == siret)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()