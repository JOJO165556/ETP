from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.modules.gdpr.repository import GDPRRepository
from src.modules.gdpr.schemas import (
    DataExportResponse, DataDeletionRequest, DataDeletionResponse,
)

router = APIRouter(prefix="/gdpr", tags=["RGPD & Conformité"])


@router.get(
    "/export/{user_id}",
    response_model=DataExportResponse,
    summary="Exporter les données d'un utilisateur (RGPD art. 20)",
)
async def export_user_data(user_id: str, db: AsyncSession = Depends(get_db)):
    repo = GDPRRepository(db)
    data = await repo.export_user_data(user_id)
    if not data:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    return DataExportResponse(**data)


@router.delete(
    "/delete/{user_id}",
    response_model=DataDeletionResponse,
    summary="Supprimer les données d'un utilisateur (RGPD art. 17)",
)
async def delete_user_data(
    user_id: str,
    body: DataDeletionRequest | None = None,
    db: AsyncSession = Depends(get_db),
):
    if body and not body.confirm:
        raise HTTPException(
            status_code=400,
            detail="Confirmation requise. Envoyez {\"confirm\": true} pour supprimer.",
        )

    repo = GDPRRepository(db)
    result = await repo.delete_user_data(user_id)
    if not result["deleted"]:
        raise HTTPException(status_code=404, detail=result["message"])

    await db.commit()
    return DataDeletionResponse(user_id=user_id, **result)


@router.post(
    "/anonymize/{user_id}",
    summary="Anonymiser les données d'un utilisateur",
)
async def anonymize_user_data(user_id: str, db: AsyncSession = Depends(get_db)):
    repo = GDPRRepository(db)
    result = await repo.anonymize_user_data(user_id)
    if not result.get("anonymized"):
        raise HTTPException(status_code=404, detail=result["message"])

    await db.commit()
    return result
