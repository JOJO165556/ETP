from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.modules.applications.repository import ApplicationRepository
from src.modules.auth.dependencies import get_current_user, require_roles, tenant_company_id
from src.modules.interviews.models import Interview
from src.modules.interviews.schemas import InterviewCreate, InterviewRead, InterviewUpdate
from src.modules.interviews.services import InterviewService
from src.modules.users.models import User, UserRole

router = APIRouter(prefix="/interviews", tags=["Entretiens"])

_RECRUITER_OR_ADMIN = require_roles(UserRole.RECRUITER, UserRole.COMPANY_ADMIN, UserRole.SUPERADMIN)


def _serialize_interview(interview: Interview) -> dict:
    """Serialise un entretien avec les infos d'affichage des relations."""
    application = interview.application
    job = application.job if application is not None else None
    candidate = application.candidate if application is not None else None
    candidate_name = None
    if candidate is not None:
        profile = getattr(candidate, "profile", None)
        full_name = (
            " ".join(p for p in (profile.first_name, profile.last_name) if p).strip()
            if profile is not None
            else ""
        )
        candidate_name = full_name or candidate.email
    return {
        "id": str(interview.id),
        "application_id": str(interview.application_id),
        "interviewer_id": str(interview.interviewer_id),
        "scheduled_at": interview.scheduled_at.isoformat() if interview.scheduled_at else None,
        "duration_minutes": interview.duration_minutes,
        "status": interview.status,
        "meeting_link": interview.meeting_link,
        "location": interview.location,
        "notes": interview.notes,
        "created_at": interview.created_at.isoformat() if interview.created_at else None,
        "updated_at": interview.updated_at.isoformat() if interview.updated_at else None,
        "job_title": job.title if job is not None else None,
        "company_name": job.company.name if job is not None and job.company is not None else None,
        "candidate_name": candidate_name,
    }


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
    "/me",
    response_model=List[InterviewRead],
    summary="Mes entretiens",
)
async def get_my_interviews(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Entretiens où l'utilisateur connecté est recruteur ou candidat.
    """
    service = InterviewService(db)
    interviews = await service.get_interviews_for_user(db, str(current_user.id))
    return [_serialize_interview(i) for i in interviews]


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
