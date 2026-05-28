from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.jobs.models import Job, JobStatus
from src.modules.jobs.repository import JobRepository
from src.modules.jobs.schemas import JobCreate, JobUpdate

class JobService:
    def __init__(self, db: AsyncSession):
        self.repo = JobRepository(db)

    async def create_job(self, job_in: JobCreate, company_id: str) -> Job:
        """
        Crée une nouvelle offre d'emploi rattachée à l'entreprise de l'utilisateur.
        """
        job_data = job_in.model_dump()
        job_data["company_id"] = company_id
        
        # Traitement SIG : Conversion lat/lon en POINT PostGIS (WKT)
        lon = job_data.pop("longitude", None)
        lat = job_data.pop("latitude", None)
        if lon is not None and lat is not None:
            job_data["job_location"] = f"POINT({lon} {lat})"

        return await self.repo.create(job_data)

    async def update_job(self, job_id: str, job_in: JobUpdate, company_id: str, is_superadmin: bool = False) -> Job:
        """
        Met à jour une offre d'emploi.
        Vérifie que l'offre appartient bien à l'entreprise du recruteur (sauf pour le Superadmin).
        """
        job = await self.repo.get(job_id)
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Offre d'emploi introuvable."
            )

        if not is_superadmin and str(job.company_id) != company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Vous n'êtes pas autorisé à modifier cette offre d'emploi."
            )

        updated_data = job_in.model_dump(exclude_unset=True)
        
        # Traitement SIG lors de la mise à jour
        lon = updated_data.pop("longitude", None)
        lat = updated_data.pop("latitude", None)
        if lon is not None and lat is not None:
            updated_data["job_location"] = f"POINT({lon} {lat})"
            
        return await self.repo.update(job_id, updated_data)
