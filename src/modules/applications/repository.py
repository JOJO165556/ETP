from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import Sequence
from src.core.repository import BaseAsyncRepository
from src.modules.applications.models import Application, ApplicationNote
from src.modules.jobs.models import Job

class ApplicationRepository(BaseAsyncRepository[Application]):
    def __init__(self, session):
        super().__init__(Application, session)

    async def get(self, id: str) -> Application | None:
        """Récupère une candidature avec ses relations job et company."""
        query = (
            select(self.model)
            .options(
                selectinload(self.model.job).selectinload(Job.company),
                selectinload(self.model.candidate),
            )
            .where(self.model.id == id)
        )
        if hasattr(self.model, "is_deleted"):
            query = query.where(self.model.is_deleted.is_(False))
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def get_applications_by_job(self, job_id: str) -> Sequence[Application]:
        """Lister toutes les candidatures reçues pour un poste spécifique"""
        query = select(self.model).where(self.model.job_id == job_id)
        result = await self.session.execute(query)
        return result.scalars().all()

    async def get_applications_by_candidate(self, candidate_id: str) -> Sequence[Application]:
        """Lister toutes les candidatures d'un candidat"""
        query = select(self.model).where(self.model.candidate_id == candidate_id)
        result = await self.session.execute(query)
        return result.scalars().all()

    async def get_by_candidate_and_job(self, candidate_id: str, job_id: str) -> Application | None:
        """Vérifier si un candidat a déjà postulé à une offre"""
        query = (
            select(self.model)
            .where(self.model.candidate_id == candidate_id)
            .where(self.model.job_id == job_id)
        )
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def create_note(self, application_id: str, author_id: str, content: str, rating: int | None = None) -> ApplicationNote:
        """Crée une note d'évaluation pour une candidature."""
        note = ApplicationNote(
            application_id=application_id,
            author_id=author_id,
            content=content,
            rating=rating
        )
        self.session.add(note)
        await self.session.flush()
        return note

    async def get_notes_by_application(self, application_id: str) -> Sequence[ApplicationNote]:
        """Récupère toutes les notes d'une candidature, triées par date de création."""
        query = (
            select(ApplicationNote)
            .where(ApplicationNote.application_id == application_id)
            .order_by(ApplicationNote.created_at.desc())
        )
        result = await self.session.execute(query)
        return result.scalars().all()