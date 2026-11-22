"""Configuration ATS de la couche IA (pondérations et seuils)."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.modules.ai.schemas import AIJobConfigResponse, AIJobConfigUpdate
from src.modules.ai.services import AIService
from src.modules.auth.dependencies import require_roles
from src.modules.users.models import User, UserRole

router = APIRouter(prefix="/ai", tags=["Intelligence Artificielle"])

_ADMIN = require_roles(UserRole.SUPERADMIN, UserRole.COMPANY_ADMIN)


def _scoped_company_id(
    current_user: User, requested_company_id: UUID | None
) -> UUID | None:
    """Determine le perimetre autorise pour la configuration ATS.

    Un SUPERADMIN peut viser la configuration globale (``None``) ou une
    entreprise precise. Un COMPANY_ADMIN est toujours restreint a la sienne.
    """
    if current_user.role == UserRole.SUPERADMIN:
        return requested_company_id

    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Compte sans entreprise assignee.",
        )
    company_id = UUID(str(current_user.company_id))
    if requested_company_id is not None and requested_company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acces non autorise a la configuration d'une autre entreprise.",
        )
    return company_id


@router.get(
    "/config",
    response_model=AIJobConfigResponse,
    summary="Lire la configuration ATS",
)
async def get_job_config(
    company_id: UUID | None = Query(
        None, description="Perimetre entreprise (SUPERADMIN uniquement)"
    ),
    current_user: User = Depends(_ADMIN),
    db: AsyncSession = Depends(get_db),
) -> AIJobConfigResponse:
    """Configuration effective : entreprise, globale, puis valeurs par defaut."""
    scoped_id = _scoped_company_id(current_user, company_id)
    return await AIService(db).get_job_config(scoped_id)


@router.put(
    "/config",
    response_model=AIJobConfigResponse,
    summary="Mettre a jour la configuration ATS",
)
async def upsert_job_config(
    config_in: AIJobConfigUpdate,
    company_id: UUID | None = Query(
        None, description="Perimetre entreprise (SUPERADMIN uniquement)"
    ),
    current_user: User = Depends(_ADMIN),
    db: AsyncSession = Depends(get_db),
) -> AIJobConfigResponse:
    """Ponderation du matching et seuils ATS.

    La somme des trois ponderations doit valoir 1.000 (validation 422 sinon) et
    ``threshold_reject`` doit rester inferieur ou egal a ``threshold_screening``.
    """
    scoped_id = _scoped_company_id(current_user, company_id)
    config = await AIService(db).upsert_job_config(
        scoped_id, config_in, modified_by=str(current_user.id)
    )
    await db.commit()
    return config
