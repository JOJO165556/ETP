from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.core.database import get_db
from src.modules.auth.dependencies import require_roles, get_tenant_company_id
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
    """Exporter les données USER_ID. Seul un SUPERADMIN ou un COMPANY_ADMIN
    peut exporter les données d'un utilisateur appartenant à son entreprise."""
    if current_user.role != UserRole.SUPERADMIN:
        await _require_target_in_tenant_scope(current_user, user_id, db)

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
    """Supprimer les données USER_ID. Seul un SUPERADMIN ou un COMPANY_ADMIN
    peut supprimer les données d'un utilisateur appartenant à son entreprise."""
    if body and not body.confirm:
        raise HTTPException(status_code=400, detail="Confirmation requise.")

    if current_user.role != UserRole.SUPERADMIN:
        await _require_target_in_tenant_scope(current_user, user_id, db)

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
    """Anonymiser les données USER_ID. Seul un SUPERADMIN ou un COMPANY_ADMIN
    peut anonymiser les données d'un utilisateur appartenant à son entreprise."""
    if current_user.role != UserRole.SUPERADMIN:
        await _require_target_in_tenant_scope(current_user, user_id, db)

    repo = GDPRRepository(db)
    result = await repo.anonymize_user_data(user_id)
    if not result.get("anonymized"):
        raise HTTPException(status_code=404, detail=result["message"])

    await db.commit()
    return AnonymizationResponse(**result)


async def _require_target_in_tenant_scope(
    current_user: User,
    target_user_id: str,
    db: AsyncSession,
) -> None:
    """Vérifie que TARGET_USER_ID appartient au périmètre multi-tenant du
    demandeur (COMPANY_ADMIN). Retourne une 403 si hors périmètre."""
    if current_user.role not in (UserRole.COMPANY_ADMIN,):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès non autorisé à ces données multi-tenant.",
        )

    if str(current_user.id) == target_user_id:
        return  # un admin peut agir sur ses propres données

    company_id = get_tenant_company_id(current_user)

    target_result = await db.execute(select(User).where(User.id == target_user_id))
    target_user = target_result.scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    # Restriction : le demandeur ne peut agir que sur les utilisateurs
    # rattachés à la même entreprise.
    if target_user.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès non autorisé à ces données multi-tenant.",
        )
