from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import List

from src.core.database import get_db
from src.core.storage import AsyncStorageService
from src.modules.auth.dependencies import get_current_user, require_roles, tenant_company_id
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
        task_result = parse_resume.delay(str(application.id), application.resume_storage_path)
        await db.execute(
            update(Application)
            .where(Application.id == application.id)
            .values(celery_task_id=task_result.id, celery_task_status=CELERY_TASK_PENDING)
        )
        await db.commit()

    repo = ApplicationRepository(db)
    application = await repo.get_with_details(str(application.id))
    return ApplicationSubmitResponse(
        application=ApplicationResponse.model_validate(application),
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
    application = await db.execute(
        select(Application)
        .where(Application.celery_task_id == task_id)
        .where(Application.candidate_id == str(current_user.id))
    ).scalar_one_or_none()
    
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


@router.get(
    "/{app_id}/cv",
    summary="Obtenir le lien signé du CV d'une candidature",
    responses={403: {"description": "Accès non autorisé"}, 404: {"description": "Candidature ou CV introuvable"}},
)
async def get_application_cv_link(
    app_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Génère une URL signée temporaire pour le CV d'une candidature.

    Règles de possession (anti-IDOR) :
    - CANDIDATE : uniquement ses propres candidatures ;
    - RECRUITER / COMPANY_ADMIN : uniquement les candidatures dont l'offre
      appartient à son entreprise ;
    - SUPERADMIN : accès global.
    """
    repo = ApplicationRepository(db)
    application = await repo.get_with_details(app_id)
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidature introuvable.",
        )

    if current_user.role == UserRole.SUPERADMIN:
        pass
    elif current_user.role == UserRole.CANDIDATE:
        if str(application.candidate_id) != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Accès non autorisé à ce fichier.",
            )
    elif current_user.role in (UserRole.RECRUITER, UserRole.COMPANY_ADMIN):
        company_id = tenant_company_id(current_user)
        job = application.job
        if job is None or str(job.company_id) != company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Accès non autorisé à ces données multi-tenant.",
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès non autorisé.",
        )

    if not application.resume_storage_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aucun CV n'est associé à cette candidature.",
        )

    try:
        secure_url = await AsyncStorageService().generate_presigned_url(
            file_key=application.resume_storage_path,
            expires_in=3600,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Erreur lors de la génération du lien sécurisé : {exc}",
        ) from exc

    return {"download_url": secure_url}


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
    return await repo.get_with_details(str(application.id))
