import re
import unicodedata
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.companies.models import Company
from src.modules.companies.repository import CompanyRepository
from src.modules.companies.schemas import CompanyCreate, CompanyUpdate

def generate_slug(text: str) -> str:
    """Génère un slug propre à partir d'une chaîne de caractères."""
    text = unicodedata.normalize('NFKD', text).encode('ASCII', 'ignore').decode('utf-8')
    text = re.sub(r'[^\w\s-]', '', text).strip().lower()
    return re.sub(r'[-\s]+', '-', text)

class CompanyService:
    def __init__(self, db: AsyncSession):
        self.repo = CompanyRepository(db)

    async def create_company(self, company_in: CompanyCreate) -> Company:
        """
        Crée une nouvelle entreprise. Vérifie que le SIRET n'est pas déjà utilisé.
        Génère automatiquement le slug à partir du nom.
        """
        if company_in.siret:
            existing_company = await self.repo.get_by_siret(company_in.siret)
            if existing_company:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"L'entreprise avec le SIRET {company_in.siret} existe déjà."
                )

        # Génération du slug
        base_slug = generate_slug(company_in.name)
        slug = base_slug
        counter = 1
        
        # Vérifier que le slug n'existe pas déjà, sinon incrémenter
        while await self.repo.get_by_slug(slug):
            slug = f"{base_slug}-{counter}"
            counter += 1

        company_data = company_in.model_dump()
        company_data["slug"] = slug

        return await self.repo.create(company_data)

    async def update_company(self, company_id: str, company_in: CompanyUpdate) -> Company:
        """
        Met à jour une entreprise.
        """
        company = await self.repo.get(company_id)
        if not company:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Entreprise introuvable."
            )

        if company_in.siret and company_in.siret != company.siret:
            existing = await self.repo.get_by_siret(company_in.siret)
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Ce SIRET est déjà utilisé par une autre entreprise."
                )

        updated_data = company_in.model_dump(exclude_unset=True)
        return await self.repo.update(company_id, updated_data)
