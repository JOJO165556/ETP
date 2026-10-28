import logging
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.applications.models import Application, ApplicationStage
from src.modules.applications.repository import ApplicationRepository
from src.modules.interviews.models import Interview, InterviewStatus
from src.modules.interviews.repository import InterviewRepository
from src.modules.interviews.schemas import InterviewCreate, InterviewUpdate

logger = logging.getLogger(__name__)


class InterviewService:
    def __init__(self):
        self.interview_repo = InterviewRepository()
        self.application_repo = ApplicationRepository()

    async def create_interview(
        self, db: AsyncSession, interview_data: InterviewCreate, user_id: str
    ) -> Interview:
        """Crée un entretien et déclenche les transitions automatiques."""
        # Vérifier que la candidature existe
        application = await self.application_repo.get_by_id(db, interview_data.application_id)
        if not application:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Application not found"
            )

        # Vérifier le chevauchement via la contrainte GIST (la DB rejettera si problème)
        # On fait quand même une vérification applicative pour un message d'erreur plus clair
        overlapping = await self.interview_repo.check_overlapping_interview(
            db,
            interview_data.interviewer_id,
            interview_data.scheduled_at,
            interview_data.duration_minutes,
        )
        if overlapping:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Interviewer already has an interview scheduled at this time",
            )

        # Créer l'entretien
        interview = Interview(**interview_data.model_dump())
        db.add(interview)
        await db.flush()

        # Transition automatique de la candidature vers INTERVIEW
        if application.stage != ApplicationStage.INTERVIEW:
            application.stage = ApplicationStage.INTERVIEW
            db.add(application)

        # Envoyer les notifications (si le module est disponible)
        try:
            from src.modules.notifications.services import NotificationService

            notification_service = NotificationService(db)
            await self._send_interview_notifications(
                db, interview, application, notification_service
            )
        except Exception as e:
            # Continuer sans bloquer la création de l'entretien
            logger.warning(f"Notification non envoyée pour l'entretien: {e}")

        await db.commit()
        await db.refresh(interview)
        return interview

    async def update_interview(
        self, db: AsyncSession, interview_id: str, interview_data: InterviewUpdate
    ) -> Interview:
        """Met à jour un entretien."""
        interview = await self.interview_repo.get_by_id(db, interview_id)
        if not interview:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found")

        # Si modification de l'horaire, vérifier le chevauchement
        if interview_data.scheduled_at or interview_data.duration_minutes:
            scheduled_at = interview_data.scheduled_at or interview.scheduled_at
            duration = interview_data.duration_minutes or interview.duration_minutes

            overlapping = await self.interview_repo.check_overlapping_interview(
                db,
                interview.interviewer_id,
                scheduled_at,
                duration,
                exclude_interview_id=interview_id,
            )
            if overlapping:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Interviewer already has an interview scheduled at this time",
                )

        # Appliquer les mises à jour
        update_data = interview_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(interview, field, value)

        await db.commit()
        await db.refresh(interview)
        return interview

    async def cancel_interview(
        self, db: AsyncSession, interview_id: str, reason: Optional[str] = None
    ) -> Interview:
        """Annule un entretien."""
        interview = await self.interview_repo.get_by_id(db, interview_id)
        if not interview:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found")

        interview.status = InterviewStatus.CANCELLED
        if reason:
            interview.notes = f"CANCELLED: {reason}\n{interview.notes or ''}"

        await db.commit()
        await db.refresh(interview)
        return interview

    async def get_interviews_by_application(
        self, db: AsyncSession, application_id: str
    ) -> list[Interview]:
        """Récupère tous les entretiens d'une candidature."""
        return await self.interview_repo.get_by_application(db, application_id)

    async def get_upcoming_interviews(
        self, db: AsyncSession, interviewer_id: str, days: int = 7
    ) -> list[Interview]:
        """Récupère les entretiens à venir d'un recruteur."""
        return await self.interview_repo.get_upcoming_interviews(db, interviewer_id, days)

    async def _send_interview_notifications(
        self, db: AsyncSession, interview: Interview, application: Application, notification_service
    ) -> None:
        """Envoie les notifications email au candidat et au recruteur."""
        # Notification au candidat
        try:
            await notification_service.send_email(
                db=db,
                to_email=application.candidate.email,
                subject="Entretien programmé",
                template_name="interview_scheduled",
                context={
                    "candidate_name": application.candidate.profile.first_name or "Candidat",
                    "job_title": application.job.title,
                    "company_name": application.job.company.name,
                    "scheduled_at": interview.scheduled_at,
                    "duration_minutes": interview.duration_minutes,
                    "meeting_link": interview.meeting_link,
                    "location": interview.location,
                },
            )
        except Exception as e:
            # Log l'erreur mais ne pas bloquer la création de l'entretien
            print(f"Failed to send candidate notification: {e}")

        # Notification au recruteur
        try:
            await notification_service.send_email(
                db=db,
                to_email=interview.interviewer.email,
                subject="Nouvel entretien programmé",
                template_name="interview_recruiter_notification",
                context={
                    "recruiter_name": interview.interviewer.profile.first_name or "Recruteur",
                    "candidate_name": application.candidate.profile.first_name or "Candidat",
                    "job_title": application.job.title,
                    "scheduled_at": interview.scheduled_at,
                    "duration_minutes": interview.duration_minutes,
                    "meeting_link": interview.meeting_link,
                    "location": interview.location,
                },
            )
        except Exception as e:
            print(f"Failed to send recruiter notification: {e}")
