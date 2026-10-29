from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.applications.models import Application, ApplicationStage
from src.modules.applications.repository import ApplicationRepository
from src.modules.users.repository import UserProfileRepository
from src.modules.jobs.repository import JobRepository
from src.modules.jobs.models import JobStatus

class ApplicationService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = ApplicationRepository(db)
        self.profile_repo = UserProfileRepository(db)
        self.job_repo = JobRepository(db)

    async def apply_to_job(self, job_id: str, candidate_id: str) -> Application:
        """
        Postuler à une offre d'emploi.
        Vérifie si le job existe et est actif.
        Vérifie si le candidat a déjà postulé.
        Associe le CV du profil s'il existe.
        """
        # 1. Vérifier si l'offre existe et est active
        job = await self.job_repo.get(job_id)
        if not job or job.status != JobStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Offre d'emploi introuvable ou inactive."
            )

        # 2. Vérifier si déjà postulé
        existing_app = await self.repo.get_by_candidate_and_job(candidate_id, job_id)
        if existing_app:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vous avez déjà postulé à cette offre."
            )

        # 3. Récupérer le CV du profil du candidat
        profile = await self.profile_repo.get_by_user_id(candidate_id)
        cv_key = profile.cv_key if profile else None

        # 4. Créer la candidature
        app_data = {
            "job_id": job_id,
            "candidate_id": candidate_id,
            "resume_storage_path": cv_key,
            "stage": ApplicationStage.APPLIED
        }

        return await self.repo.create(app_data)

    async def update_stage(self, app_id: str, new_stage: ApplicationStage, recruiter_company_id: str, is_superadmin: bool = False, modified_by: str | None = None) -> Application:
        """
        Modifie le statut d'une candidature.
        Vérifie que le recruteur a le droit (l'offre appartient à son entreprise).
        """
        application = await self.repo.get(app_id)
        if not application:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Candidature introuvable."
            )

        if not is_superadmin:
            job = await self.job_repo.get(application.job_id)
            if not job or str(job.company_id) != recruiter_company_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Vous n'êtes pas autorisé à gérer cette candidature."
                )

        update_data = {"stage": new_stage}
        if modified_by is not None:
            update_data["modified_by"] = str(modified_by)

        return await self.repo.update(app_id, update_data)

    async def create_note(self, application_id: str, author_id: str, content: str, rating: int | None = None) -> dict:
        """Crée une note d'évaluation pour une candidature."""
        note = await self.repo.create_note(application_id, author_id, content, rating)
        await self.db.commit()
        await self.db.refresh(note)
        return {
            "id": str(note.id),
            "application_id": str(note.application_id),
            "author_id": str(note.author_id),
            "content": note.content,
            "rating": note.rating,
            "created_at": note.created_at.isoformat() if note.created_at else None,
        }

    async def get_notes(self, application_id: str) -> list[dict]:
        """Récupère toutes les notes d'une candidature."""
        notes = await self.repo.get_notes_by_application(application_id)
        return [
            {
                "id": str(note.id),
                "application_id": str(note.application_id),
                "author_id": str(note.author_id),
                "content": note.content,
                "rating": note.rating,
                "created_at": note.created_at.isoformat() if note.created_at else None,
            }
            for note in notes
        ]
