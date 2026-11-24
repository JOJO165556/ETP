from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import List

from src.core.database import get_db
from src.modules.auth.dependencies import require_roles
from src.modules.users.models import User, UserRole
from src.modules.applications.schemas import ApplicationResponse, ApplicationUpdateStage, ApplicationSubmitResponse, TaskStatusResponse
from src.modules.applications.services import ApplicationService
from src.modules.applications.repository import ApplicationRepository
from src.modules.applications.tasks import parse_resume, CELERY_TASK_PENDING
from src.modules.applications.models import Application
from src.modules.jobs.repository import JobRepository

router = APIRouter(prefix="/applications", tags=["Candidatures"])

_CANDIDATE_OR_ADMIN = require_roles(UserRole.CANDIDATE, UserRole.SUPERADMIN)
_RECRUITER_OR_ADMIN = require_roles(UserRole.RECRUITER, UserRole.COMPANY_ADMIN, UserRole.SUPERADMIN)


def _serialize_application(app: Application) -> dict:
    """Serialise une candidature en decorant avec les infos d'affichage
    (titre d'offre, entreprise, dates) issues des relations eager-loaded."""
    job = app.job if app is not None else None
    company_name = None
    if job is not None and job.company is not None:
        company_name = job.company.name
    candidate = app.candidate if app is not None else None
    candidate_name = None
    candidate_email = None
    if candidate is not None:
        candidate_email = candidate.email
        profile = getattr(candidate, "profile", None)
        if profile is not None:
            full_name = " ".join(
                part for part in (profile.first_name, profile.last_name) if part
            ).strip()
            candidate_name = full_name or candidate.email
        else:
            candidate_name = candidate.email
    return {
        "id": str(app.id),
        "job_id": str(app.job_id),
        "candidate_id": str(app.candidate_id),
        "stage": app.stage,
        "resume_storage_path": app.resume_storage_path,
        "matching_score": float(app.matching_score) if app.matching_score is not None else None,
        "celery_task_id": app.celery_task_id,
        "celery_task_status": app.celery_task_status,
        "celery_task_result": app.celery_task_result,
        "job_title": job.title if job is not None else None,
        "company_name": company_name,
        "candidate_name": candidate_name,
        "candidate_email": candidate_email,
        "created_at": app.created_at.isoformat() if app.created_at else None,
        "updated_at": app.updated_at.isoformat() if app.updated_at else None,
    }


@router.post(
    "/jobs/{job_id}/apply",
    response_model=ApplicationSubmitResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Postuler à une offre",
    responses={
        404: {"description": "Offre introuvable"},
        409: {"description": "Vous avez déjà postulé"},
    },
)
async def apply_to_job(
    job_id: str,
    current_user: User = Depends(_CANDIDATE_OR_ADMIN),
    db: AsyncSession = Depends(get_db)
):
    """
    Permet à un candidat de postuler à une offre d'emploi.
    Son profil (et son CV) est automatiquement lié à la candidature.
    """
    service = ApplicationService(db)
    application = await service.apply_to_job(job_id, str(current_user.id))
    await db.commit()

    task_result = None
    if application.resume_storage_path:
        try:
            task_result = parse_resume.delay(str(application.id), application.resume_storage_path)
            await db.execute(
                update(Application)
                .where(Application.id == application.id)
                .values(celery_task_id=task_result.id, celery_task_status=CELERY_TASK_PENDING)
            )
            await db.commit()
        except Exception as exc:
            import logging
            logging.getLogger(__name__).warning("Echec programmation Celery parse_resume: %s", exc)

    repo = ApplicationRepository(db)
    application = await repo.get(str(application.id))
    return ApplicationSubmitResponse(
        application=ApplicationResponse.model_validate(_serialize_application(application)),
        task_id=task_result.id if task_result else None,
        task_status="PENDING" if task_result else None,
    )


@router.get("/me", response_model=List[ApplicationResponse], summary="Mes candidatures")
async def get_my_applications(
    current_user: User = Depends(_CANDIDATE_OR_ADMIN),
    db: AsyncSession = Depends(get_db)
):
    """
    Permet à un candidat de lister toutes ses candidatures.
    """
    repo = ApplicationRepository(db)
    applications = await repo.get_applications_by_candidate(str(current_user.id))
    return [_serialize_application(app) for app in applications]


@router.get(
    "/tasks/{task_id}/status",
    response_model=TaskStatusResponse,
    summary="Vérifier le statut d'une tâche Celery",
    responses={404: {"description": "Tâche introuvable"}},
)
async def get_task_status(
    task_id: str,
    current_user: User = Depends(_CANDIDATE_OR_ADMIN),
    db: AsyncSession = Depends(get_db)
):
    """Permet de vérifier le statut d'une tâche Celery."""
    res = await db.execute(
        select(Application)
        .where(Application.celery_task_id == task_id)
        .where(Application.candidate_id == str(current_user.id))
    )
    application = res.scalar_one_or_none()
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tâche non trouvée."
        )
    
    return TaskStatusResponse(
        task_id=task_id,
        application_id=str(application.id),
        status=application.celery_task_status or "UNKNOWN",
        result=application.celery_task_result,
        matching_score=float(application.matching_score) if application.matching_score else None,
        stage=application.stage.value if application.stage else None,
    )


@router.get("/jobs/{job_id}", response_model=List[ApplicationResponse], summary="Candidatures d'une offre")
async def get_job_applications(
    job_id: str,
    current_user: User = Depends(_RECRUITER_OR_ADMIN),
    db: AsyncSession = Depends(get_db)
):
    """
    Permet à un recruteur de lister toutes les candidatures reçues pour une offre spécifique.
    Vérifie que l'offre appartient bien à l'entreprise du recruteur.
    """
    job_repo = JobRepository(db)
    job = await job_repo.get(job_id)
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Offre d'emploi introuvable."
        )

    if current_user.role != UserRole.SUPERADMIN and str(job.company_id) != str(current_user.company_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous n'êtes pas autorisé à voir les candidatures de cette offre."
        )

    repo = ApplicationRepository(db)
    applications = await repo.get_applications_by_job(job_id)
    return [_serialize_application(app) for app in applications]


@router.patch("/{app_id}/stage", response_model=ApplicationResponse, summary="Modifier le statut d'une candidature")
async def update_application_stage(
    app_id: str,
    stage_update: ApplicationUpdateStage,
    current_user: User = Depends(_RECRUITER_OR_ADMIN),
    db: AsyncSession = Depends(get_db)
):
    """
    Permet au recruteur de faire avancer une candidature dans le pipeline (ATS).
    (ex: APPLIED -> INTERVIEW)
    """
    service = ApplicationService(db)
    
    is_superadmin = (current_user.role == UserRole.SUPERADMIN)
    company_id = str(current_user.company_id) if current_user.company_id else ""

    application = await service.update_stage(
        app_id=app_id, 
        new_stage=stage_update.stage, 
        recruiter_company_id=company_id, 
        is_superadmin=is_superadmin,
        modified_by=str(current_user.id),
    )
    await db.commit()
    repo = ApplicationRepository(db)
    application = await repo.get(str(application.id))
    return _serialize_application(application)


@router.post(
    "/{app_id}/notes",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
    summary="Ajouter une note d'évaluation",
    responses={
        403: {"description": "Accès non autorisé (candidat ou hors tenant)"},
        404: {"description": "Candidature introuvable"},
    },
)
async def create_application_note(
    app_id: str,
    note_data: dict,
    current_user: User = Depends(_RECRUITER_OR_ADMIN),
    db: AsyncSession = Depends(get_db)
):
    """
    Permet à un recruteur d'ajouter une note d'évaluation privée à une candidature.
    L'accès est réservé aux recruteurs et admins de l'entreprise de l'offre.
    """
    repo = ApplicationRepository(db)
    application = await repo.get(app_id)
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidature introuvable."
        )
    
    # Vérifier que l'utilisateur a le droit d'ajouter une note
    if current_user.role != UserRole.SUPERADMIN:
        job = await JobRepository(db).get(application.job_id)
        if not job or str(job.company_id) != str(current_user.company_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Vous n'êtes pas autorisé à ajouter une note à cette candidature."
            )
    
    service = ApplicationService(db)
    return await service.create_note(
        application_id=app_id,
        author_id=str(current_user.id),
        content=note_data.get("content"),
        rating=note_data.get("rating")
    )


@router.get(
    "/{app_id}/notes",
    response_model=List[dict],
    summary="Lister les notes d'une candidature",
    responses={
        403: {"description": "Accès non autorisé (candidat ou hors tenant)"},
        404: {"description": "Candidature introuvable"},
    },
)
async def get_application_notes(
    app_id: str,
    current_user: User = Depends(_RECRUITER_OR_ADMIN),
    db: AsyncSession = Depends(get_db)
):
    """
    Permet à un recruteur de lister toutes les notes d'évaluation d'une candidature.
    Les notes sont triées par date de création (plus récent en premier).
    """
    repo = ApplicationRepository(db)
    application = await repo.get(app_id)
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidature introuvable."
        )
    
    # Vérifier que l'utilisateur a le droit de voir les notes
    if current_user.role != UserRole.SUPERADMIN:
        job = await JobRepository(db).get(application.job_id)
        if not job or str(job.company_id) != str(current_user.company_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Vous n'êtes pas autorisé à voir les notes de cette candidature."
            )
    
    service = ApplicationService(db)
    return await service.get_notes(application_id=app_id)
