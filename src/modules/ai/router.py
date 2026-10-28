"""Endpoints d'administration et de diagnostic de la couche IA."""
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.modules.ai.schemas import (
    AIAuditLogResponse,
    AIJobConfigResponse,
    AIJobConfigUpdate,
    AIProviderConfigCreate,
    AIProviderConfigResponse,
    AIProviderConfigUpdate,
    ExtractionPreviewRequest,
    ExtractionPreviewResponse,
    ProviderTestRequest,
    ProviderTestResponse,
)
from src.modules.ai.services import AIService
from src.modules.auth.dependencies import require_roles
from src.modules.users.models import User, UserRole

router = APIRouter(prefix="/ai", tags=["Intelligence Artificielle"])

_SUPERADMIN = require_roles(UserRole.SUPERADMIN)
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
    "/providers",
    response_model=List[AIProviderConfigResponse],
    summary="Lister les fournisseurs IA",
)


async def list_providers(
    current_admin: User = Depends(_SUPERADMIN),
    db: AsyncSession = Depends(get_db),
) -> List[AIProviderConfigResponse]:
    """Liste les fournisseurs actifs, fournisseur par defaut en tete."""
    return await AIService(db).list_providers()


@router.post(
    "/providers",
    response_model=AIProviderConfigResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Ajouter un fournisseur IA",
)


async def create_provider(
    provider_in: AIProviderConfigCreate,
    current_admin: User = Depends(_SUPERADMIN),
    db: AsyncSession = Depends(get_db),
) -> AIProviderConfigResponse:
    """Enregistre un fournisseur. ``api_key_ref`` doit etre un nom de variable
    d'environnement : aucune cle n'est stockee en base."""
    provider = await AIService(db).create_provider(
        provider_in, modified_by=str(current_admin.id)
    )
    await db.commit()
    return provider


@router.patch(
    "/providers/{provider_id}",
    response_model=AIProviderConfigResponse,
    summary="Modifier un fournisseur IA",
)


async def update_provider(
    provider_id: UUID,
    provider_in: AIProviderConfigUpdate,
    current_admin: User = Depends(_SUPERADMIN),
    db: AsyncSession = Depends(get_db),
) -> AIProviderConfigResponse:
    provider = await AIService(db).update_provider(
        provider_id, provider_in, modified_by=str(current_admin.id)
    )
    await db.commit()
    return provider


@router.post(
    "/providers/{provider_id}/test",
    response_model=ProviderTestResponse,
    summary="Tester un fournisseur IA",
)


async def test_provider(
    provider_id: UUID,
    body: ProviderTestRequest,
    current_admin: User = Depends(_SUPERADMIN),
    db: AsyncSession = Depends(get_db),
) -> ProviderTestResponse:
    """Execute une extraction reelle sur un texte d'exemple et journalise le resultat."""
    result = await AIService(db).test_provider(provider_id, body.sample_text)
    await db.commit()
    return result


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


@router.get(
    "/audit-logs",
    response_model=List[AIAuditLogResponse],
    summary="Consulter le journal d'audit IA",
)


async def list_audit_logs(
    company_id: UUID | None = Query(None, description="Perimetre entreprise"),
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(_ADMIN),
    db: AsyncSession = Depends(get_db),
) -> List[AIAuditLogResponse]:
    """Journal append-only : fournisseur, latence, statut, sans aucune PII."""
    scoped_id = _scoped_company_id(current_user, company_id)
    return await AIService(db).list_audit_logs(company_id=scoped_id, limit=limit)


@router.post(
    "/extraction/preview",
    response_model=ExtractionPreviewResponse,
    summary="Tester l'extraction d'un CV",
)


async def preview_extraction(
    body: ExtractionPreviewRequest,
    current_user: User = Depends(_ADMIN),
    db: AsyncSession = Depends(get_db),
) -> ExtractionPreviewResponse:
    """Execute le pipeline d'extraction (avec repli) sur un texte fourni.

    Aucun document n'est persiste : l'endpoint sert au diagnostic de la chaine
    de fournisseurs.
    """
    scoped_id = _scoped_company_id(current_user, body.company_id)
    return await AIService(db).preview_extraction(body.cv_text, scoped_id)
