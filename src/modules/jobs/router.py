from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from src.core.database import get_db
from src.modules.auth.dependencies import require_roles
from src.modules.users.models import User, UserRole
from src.modules.jobs.schemas import JobCreate, JobUpdate, JobResponse, CandidateMatchResponse
from src.modules.jobs.services import JobService
from src.modules.jobs.repository import JobRepository
from src.modules.jobs.models import JobStatus

router = APIRouter(prefix="/jobs", tags=["Offres d'emploi"])

_RECRUITER_OR_ADMIN = require_roles(UserRole.RECRUITER, UserRole.COMPANY_ADMIN, UserRole.SUPERADMIN)

@router.post("/", response_model=JobResponse, status_code=status.HTTP_201_CREATED, summary="Créer une offre d'emploi")
async def create_job(
    job_in: JobCreate,
    current_user: User = Depends(_RECRUITER_OR_ADMIN),
    db: AsyncSession = Depends(get_db)
):
    """
    Crée une nouvelle offre d'emploi.
    Restreint aux recruteurs, admins d'entreprise et superadmins.
    L'offre est automatiquement rattachée à l'entreprise du créateur.
    """
    if not current_user.company_id and current_user.role != UserRole.SUPERADMIN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vous n'êtes rattaché à aucune entreprise."
        )
    
    # Pour un SUPERADMIN sans entreprise, on devrait théoriquement demander le company_id
    # Ici on simplifie : on utilise le company_id de l'utilisateur
    if not current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Impossible de créer une offre sans company_id valide."
        )

    service = JobService(db)
    job = await service.create_job(job_in, str(current_user.company_id))
    await db.commit()
    return job

@router.get("/", response_model=List[JobResponse], summary="Lister les offres d'emploi actives")
async def list_jobs(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """
    Récupère la liste des offres d'emploi. 
    (À terme, ajouter des filtres par statut ACTIVE et géolocalisation)
    """
    repo = JobRepository(db)
    # Pour l'instant on liste tout, mais on pourrait filtrer par ACTIVE
    jobs = await repo.list(skip=skip, limit=limit)
    return [job for job in jobs if job.status == JobStatus.ACTIVE]

@router.get("/{job_id}", response_model=JobResponse, summary="Détails d'une offre")
async def get_job(
    job_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Récupère les détails d'une offre d'emploi.
    """
    repo = JobRepository(db)
    job = await repo.get(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Offre d'emploi introuvable."
        )
    return job

@router.patch("/{job_id}", response_model=JobResponse, summary="Modifier une offre")
async def update_job(
    job_id: str,
    job_in: JobUpdate,
    current_user: User = Depends(_RECRUITER_OR_ADMIN),
    db: AsyncSession = Depends(get_db)
):
    """
    Met à jour une offre d'emploi.
    Le recruteur ne peut modifier que les offres de son entreprise.
    """
    is_superadmin = (current_user.role == UserRole.SUPERADMIN)
    company_id = str(current_user.company_id) if current_user.company_id else ""
    
    service = JobService(db)
    job = await service.update_job(job_id, job_in, company_id, is_superadmin)
    await db.commit()
    return job

@router.get("/company/{company_id}", response_model=List[JobResponse], summary="Lister les offres actives d'une entreprise")
async def list_company_jobs(
    company_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Récupère toutes les offres actives d'une entreprise spécifique.
    """
    repo = JobRepository(db)
    jobs = await repo.get_active_jobs_by_company(company_id)
    return jobs

@router.get("/search/location", response_model=List[JobResponse], summary="Recherche d'offres par géolocalisation (PostGIS)")
async def search_jobs_by_location(
    lon: float,
    lat: float,
    radius_km: float = 50.0,
    db: AsyncSession = Depends(get_db)
):
    """
    Recherche des offres d'emploi actives dans un rayon géographique donné.
    Utilise PostGIS (ST_DWithin) pour un filtrage haute performance sur la base de données.
    """
    repo = JobRepository(db)
    jobs = await repo.find_jobs_within_radius(lon=lon, lat=lat, radius_km=radius_km)
    return jobs

@router.get("/{job_id}/match", response_model=List[CandidateMatchResponse], summary="Matching Engine : Trouver des candidats")
async def match_candidates_for_job(
    job_id: str,
    current_user: User = Depends(_RECRUITER_OR_ADMIN),
    db: AsyncSession = Depends(get_db)
):
    """
    Retourne la liste des profils candidats correspondant à l'offre.
    Le score combine l'intersection des compétences et la distance géographique PostGIS.
    Restreint au recruteur de l'entreprise ou au Superadmin.
    """
    repo = JobRepository(db)
    job = await repo.get(job_id)
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Offre d'emploi introuvable."
        )

    # Vérification des droits : le recruteur doit appartenir à la même entreprise
    if current_user.role != UserRole.SUPERADMIN and str(job.company_id) != str(current_user.company_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous n'êtes pas autorisé à voir les matchs pour cette offre."
        )

    matches = await repo.find_matching_candidates_for_job(job_id)
    return matches

