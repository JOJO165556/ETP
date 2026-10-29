from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.modules.applications.repository import ApplicationRepository
from src.modules.auth.dependencies import require_roles, tenant_company_id
from src.modules.interviews.schemas import InterviewCreate, InterviewRead, InterviewUpdate
from src.modules.interviews.services import InterviewService
from src.modules.users.models import User, UserRole

router = APIRouter(prefix="/interviews", tags=["Entretiens"])

_RECRUITER_OR_ADMIN = require_roles(UserRole.RECRUITER, UserRole.COMPANY_ADMIN, UserRole.SUPERADMIN)


@router.post(
    "",
    response_model=InterviewRead,
    status_code=status.HTTP_201_CREATED,
    summary="Créer un entretien",
    responses={
        403: {"description": "Accès non autorisé"},
        404: {"description": "Candidature introuvable"},
        409: {"description": "Chevauchement d'horaire"},
    },
)
async def create_interview(
    interview_data: InterviewCreate,
    current_user: User = Depends(_RECRUITER_OR_ADMIN),
    db: AsyncSession = Depends(get_db),
):
    """
    Crée un nouvel entretien pour une candidature.
    Transfert automatiquement la candidature vers l'étape INTERVIEW.
    Vérifie les chevauchements d'horaire via contrainte GIST.
    """
    # Vérifier que l'application appartient à l'entreprise du recruteur
    app_repo = ApplicationRepository(db)
    application = await app_repo.get(interview_data.application_id)

    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    if current_user.role != UserRole.SUPERADMIN:
        company_id = tenant_company_id(current_user)
        if str(application.job.company_id) != company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this application",
            )

    service = InterviewService(db)
    interview = await service.create_interview(db, interview_data, str(current_user.id))
    return interview


@router.get(
    "/application/{application_id}",
    response_model=List[InterviewRead],
    summary="Lister les entretiens d'une candidature",
    responses={403: {"description": "Accès non autorisé"}},
)
async def get_application_interviews(
    application_id: str,
    current_user: User = Depends(_RECRUITER_OR_ADMIN),
    db: AsyncSession = Depends(get_db),
):
    """
    Récupère tous les entretiens associés à une candidature.
    """
    # Vérifier l'accès à la candidature
    app_repo = ApplicationRepository(db)
    application = await app_repo.get(application_id)

    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    if current_user.role != UserRole.SUPERADMIN:
        company_id = tenant_company_id(current_user)
        if str(application.job.company_id) != company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this application",
            )

    service = InterviewService(db)
    interviews = await service.get_interviews_by_application(db, application_id)
    return interviews


@router.get(
    "/upcoming",
    response_model=List[InterviewRead],
    summary="Entretiens à venir du recruteur",
)
async def get_upcoming_interviews(
    days: int = 7,
    current_user: User = Depends(_RECRUITER_OR_ADMIN),
    db: AsyncSession = Depends(get_db),
):
    """
    Récupère les entretiens à venir du recruteur connecté.
    """
    service = InterviewService(db)
    interviews = await service.get_upcoming_interviews(db, str(current_user.id), days)
    return interviews


@router.patch(
    "/{interview_id}",
    response_model=InterviewRead,
    summary="Modifier un entretien",
    responses={
        403: {"description": "Accès non autorisé"},
        404: {"description": "Entretien introuvable"},
        409: {"description": "Chevauchement d'horaire"},
    },
)
async def update_interview(
    interview_id: str,
    interview_data: InterviewUpdate,
    current_user: User = Depends(_RECRUITER_OR_ADMIN),
    db: AsyncSession = Depends(get_db),
):
    """
    Met à jour les informations d'un entretien.
    """
    service = InterviewService(db)
    interview = await service.update_interview(db, interview_id, interview_data)
    return interview


@router.post(
    "/{interview_id}/cancel",
    response_model=InterviewRead,
    summary="Annuler un entretien",
    responses={
        403: {"description": "Accès non autorisé"},
        404: {"description": "Entretien introuvable"},
    },
)
async def cancel_interview(
    interview_id: str,
    reason: str = None,
    current_user: User = Depends(_RECRUITER_OR_ADMIN),
    db: AsyncSession = Depends(get_db),
):
    """
    Annule un entretien.
    """
    service = InterviewService(db)
    interview = await service.cancel_interview(db, interview_id, reason)
    return interview
