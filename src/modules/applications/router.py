from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from src.core.database import get_db
from src.modules.auth.dependencies import get_current_user, require_roles
from src.modules.users.models import User, UserRole
from src.modules.applications.schemas import ApplicationResponse, ApplicationUpdateStage
from src.modules.applications.services import ApplicationService
from src.modules.applications.repository import ApplicationRepository
from src.modules.applications.tasks import parse_resume, CELERY_TASK_PENDING
from src.modules.applications.models import Application
from src.modules.jobs.repository import JobRepository

router = APIRouter(prefix="/applications", tags=["Candidatures"])

_CANDIDATE_OR_ADMIN = require_roles(UserRole.CANDIDATE, UserRole.SUPERADMIN)
_RECRUITER_OR_ADMIN = require_roles(UserRole.RECRUITER, UserRole.COMPANY_ADMIN, UserRole.SUPERADMIN)


@router.post("/jobs/{job_id}/apply", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED, summary="Postuler à une offre")
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

    # Dispatch asynchrone du parsing — n'impacte pas le temps de réponse HTTP
    # Le worker Celery prend le relais via Redis
    task_result = None
    if application.resume_storage_path:
        task_result = parse_resume.delay(str(application.id), application.resume_storage_path)
        # Enregistrer l'ID de la tâche dans l'application
        await db.execute(
            update(src.modules.applications.models.Application)
            .where(src.modules.applications.models.Application.id == application.id)
            .values(celery_task_id=task_result.id, celery_task_status=CELERY_TASK_PENDING)
        )
        await db.commit()

    # Retourner l'application avec l'ID de la tâche si disponible
    return {
        "application": application,
        "task_id": task_result.id if task_result else None,
        "task_status": "PENDING" if task_result else None
    }


@router.get("/me", response_model=List[ApplicationResponse], summary="Mes candidatures")
async def get_my_applications(
    current_user: User = Depends(_CANDIDATE_OR_ADMIN),
    db: AsyncSession = Depends(get_db)
):
    """
    Permet à un candidat de lister toutes ses candidatures.
    """
    repo = ApplicationRepository(db)
    return await repo.get_applications_by_candidate(str(current_user.id))


@router.get("/tasks/{task_id}/status", summary="Vérifier le statut d'une tâche Celery")
async def get_task_status(
    task_id: str,
    current_user: User = Depends(_CANDIDATE_OR_ADMIN),
    db: AsyncSession = Depends(get_db)
):
    """
    Permet de vérifier le statut d'une tâche Celery.
    Retourne l'état actuel de la tâche et ses résultats.
    """
    # Récupérer l'application associée à la tâche
    application = await db.execute(
        select(Application)
        .where(Application.celery_task_id == task_id)
        .where(Application.candidate_id == str(current_user.id))
    ).scalar_one_or_none()
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tâche non trouvée ou vous n'êtes pas autorisé à y accéder."
        )
    
    return {
        "task_id": task_id,
        "application_id": str(application.id),
        "status": application.celery_task_status or "UNKNOWN",
        "result": application.celery_task_result,
        "matching_score": application.matching_score,
        "stage": application.stage.value if application.stage else None
    }


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
    return await repo.get_applications_by_job(job_id)


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
        is_superadmin=is_superadmin
    )
    await db.commit()
    return application
