from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.modules.auth.dependencies import require_roles
from src.modules.users.models import User, UserRole
from src.modules.gdpr.repository import GDPRRepository
from src.modules.gdpr.schemas import (
    DataExportResponse, DataDeletionRequest, DataDeletionResponse, AnonymizationResponse,
)

router = APIRouter(prefix="/gdpr", tags=["RGPD & Conformité"])

_ADMIN = require_roles(UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN)


@router.get(
    "/export/{user_id}",
    response_model=DataExportResponse,
    summary="Exporter les données d'un utilisateur (RGPD art. 20)",
    responses={404: {"description": "Utilisateur non trouvé"}},
)
async def export_user_data(
    user_id: str,
    current_user: User = Depends(_ADMIN),
    db: AsyncSession = Depends(get_db),
):
    repo = GDPRRepository(db)
    data = await repo.export_user_data(user_id)
    if not data:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    return DataExportResponse(**data)


@router.delete(
    "/delete/{user_id}",
    response_model=DataDeletionResponse,
    summary="Supprimer les données d'un utilisateur (RGPD art. 17)",
    responses={400: {"description": "Confirmation requise"}, 404: {"description": "Utilisateur non trouvé"}},
)
async def delete_user_data(
    user_id: str,
    body: DataDeletionRequest | None = None,
    current_user: User = Depends(_ADMIN),
    db: AsyncSession = Depends(get_db),
):
    if body and not body.confirm:
        raise HTTPException(status_code=400, detail="Confirmation requise.")

    repo = GDPRRepository(db)
    result = await repo.delete_user_data(user_id)
    if not result["deleted"]:
        raise HTTPException(status_code=404, detail=result["message"])

    await db.commit()
    return DataDeletionResponse(user_id=user_id, **result)


@router.post(
    "/anonymize/{user_id}",
    response_model=AnonymizationResponse,
    summary="Anonymiser les données d'un utilisateur",
    responses={404: {"description": "Utilisateur non trouvé"}},
)
async def anonymize_user_data(
    user_id: str,
    current_user: User = Depends(_ADMIN),
    db: AsyncSession = Depends(get_db),
):
    repo = GDPRRepository(db)
    result = await repo.anonymize_user_data(user_id)
    if not result.get("anonymized"):
        raise HTTPException(status_code=404, detail=result["message"])

    await db.commit()
    return AnonymizationResponse(**result)
