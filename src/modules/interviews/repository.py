from datetime import datetime, timedelta
from typing import List, Optional

from sqlalchemy import and_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.repository import BaseAsyncRepository
from src.modules.interviews.models import Interview, InterviewStatus


class InterviewRepository(BaseAsyncRepository[Interview]):
    def __init__(self, session):
        super().__init__(Interview, session)

    async def get_by_application(self, db: AsyncSession, application_id: str) -> List[Interview]:
        """Récupère tous les entretiens d'une candidature."""
        result = await db.execute(
            select(self.model)
            .where(self.model.application_id == application_id)
            .order_by(self.model.scheduled_at)
        )
        return result.scalars().all()

    async def get_by_interviewer(
        self,
        db: AsyncSession,
        interviewer_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[Interview]:
        """Récupère les entretiens d'un recruteur sur une période."""
        query = select(self.model).where(self.model.interviewer_id == interviewer_id)

        if start_date:
            query = query.where(self.model.scheduled_at >= start_date)
        if end_date:
            query = query.where(self.model.scheduled_at <= end_date)

        query = query.order_by(self.model.scheduled_at)
        result = await db.execute(query)
        return result.scalars().all()

    async def get_upcoming_interviews(
        self, db: AsyncSession, interviewer_id: str, days: int = 7
    ) -> List[Interview]:
        """Récupère les entretiens à venir d'un recruteur."""
        now = datetime.utcnow()
        future = now + timedelta(days=days)

        result = await db.execute(
            select(self.model)
            .where(
                and_(
                    self.model.interviewer_id == interviewer_id,
                    self.model.scheduled_at >= now,
                    self.model.scheduled_at <= future,
                    self.model.status == InterviewStatus.SCHEDULED,
                )
            )
            .order_by(self.model.scheduled_at)
        )
        return result.scalars().all()

    async def check_overlapping_interview(
        self,
        db: AsyncSession,
        interviewer_id: str,
        scheduled_at: datetime,
        duration_minutes: int,
        exclude_interview_id: Optional[str] = None,
    ) -> bool:
        """Vérifie si un entretien chevauche un créneau existant pour le même recruteur."""
        start_time = scheduled_at
        end_time = scheduled_at + timedelta(minutes=duration_minutes)

        query = select(self.model).where(
            and_(
                self.model.interviewer_id == interviewer_id,
                self.model.status == InterviewStatus.SCHEDULED,
                self.model.scheduled_at < end_time,
                self.model.scheduled_at
                + (self.model.duration_minutes * text("interval '1 minute'"))
                > start_time,
            )
        )

        if exclude_interview_id:
            query = query.where(self.model.id != exclude_interview_id)

        result = await db.execute(query)
        return result.scalars().first() is not None
