from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from src.core.database import get_db
from src.modules.auth.dependencies import get_current_user, require_roles
from src.modules.users.models import User, UserRole
from src.modules.companies.schemas import CompanyCreate, CompanyUpdate, CompanyResponse
from src.modules.companies.services import CompanyService
from src.modules.companies.repository import CompanyRepository

router = APIRouter(prefix="/companies", tags=["Entreprises"])

_SUPERADMIN = require_roles(UserRole.SUPERADMIN)
_COMPANY_ADMIN_OR_SUPERADMIN = require_roles(UserRole.COMPANY_ADMIN, UserRole.SUPERADMIN)

@router.post("/", response_model=CompanyResponse, status_code=status.HTTP_201_CREATED, summary="Créer une entreprise")
async def create_company(
    company_in: CompanyCreate,
    current_admin: User = Depends(_SUPERADMIN),
    db: AsyncSession = Depends(get_db)
):
    """
    Crée une nouvelle entreprise.
    Seul un SUPERADMIN peut créer des entreprises de base.
    """
    service = CompanyService(db)
    company = await service.create_company(company_in)
    await db.commit()
    return company

@router.get("/", response_model=List[CompanyResponse], summary="Lister les entreprises")
async def list_companies(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """
    Récupère la liste de toutes les entreprises actives.
    """
    repo = CompanyRepository(db)
    return await repo.list(skip=skip, limit=limit)

@router.get("/{company_id}", response_model=CompanyResponse, summary="Détails d'une entreprise")
async def get_company(
    company_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Récupère les détails d'une entreprise par son ID.
    """
    repo = CompanyRepository(db)
    company = await repo.get(company_id)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entreprise introuvable."
        )
    return company

@router.patch("/{company_id}", response_model=CompanyResponse, summary="Modifier une entreprise")
async def update_company(
    company_id: str,
    company_in: CompanyUpdate,
    current_user: User = Depends(_COMPANY_ADMIN_OR_SUPERADMIN),
    db: AsyncSession = Depends(get_db)
):
    """
    Met à jour les informations d'une entreprise.
    Restreint au SUPERADMIN ou au COMPANY_ADMIN de cette même entreprise.
    """
    # Vérification des droits pour un COMPANY_ADMIN
    if current_user.role == UserRole.COMPANY_ADMIN and str(current_user.company_id) != company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous n'êtes pas autorisé à modifier les informations d'une autre entreprise."
        )

    service = CompanyService(db)
    company = await service.update_company(company_id, company_in)
    await db.commit()
    return company
