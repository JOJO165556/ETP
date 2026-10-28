"""Acces base de donnees pour les notifications in-app."""
from typing import Sequence
from uuid import UUID

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.repository import BaseAsyncRepository
from src.modules.notifications.models import Notification


class NotificationRepository(BaseAsyncRepository[Notification]):
    def __init__(self, session: AsyncSession):
        super().__init__(Notification, session)

    async def list_for_user(
        self,
        user_id: str | UUID,
        unread_only: bool = False,
        limit: int = 20,
        offset: int = 0,
    ) -> Sequence[Notification]:
        """Notifications d'un utilisateur, les plus recentes en premier."""
        query = (
            select(self.model)
            .where(self.model.user_id == user_id)
            .order_by(self.model.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        if unread_only:
            query = query.where(self.model.is_read == False)  # noqa: E712
        result = await self.session.execute(query)
        return result.scalars().all()

    async def count_unread(self, user_id: str | UUID) -> int:
        """Nombre de notifications non lues pour un utilisateur."""
        query = (
            select(func.count())
            .select_from(self.model)
            .where(
                self.model.user_id == user_id,
                self.model.is_read == False,  # noqa: E712
            )
        )
        result = await self.session.execute(query)
        return int(result.scalar_one() or 0)

    async def count_for_user(self, user_id: str | UUID, unread_only: bool = False) -> int:
        """Nombre total de notifications (filtre optionnellement non lues)."""
        query = (
            select(func.count())
            .select_from(self.model)
            .where(self.model.user_id == user_id)
        )
        if unread_only:
            query = query.where(self.model.is_read == False)  # noqa: E712
        result = await self.session.execute(query)
        return int(result.scalar_one() or 0)

    async def get_for_user(
        self, notification_id: str | UUID, user_id: str | UUID
    ) -> Notification | None:
        """Recupere une notification en verifiant son proprietaire (anti-IDOR)."""
        query = select(self.model).where(
            self.model.id == notification_id,
            self.model.user_id == user_id,
        )
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def mark_all_read(self, user_id: str | UUID) -> int:
        """Marque toutes les notifications non lues d'un utilisateur comme lues."""
        query = (
            update(self.model)
            .where(
                self.model.user_id == user_id,
                self.model.is_read == False,  # noqa: E712
            )
            .values(is_read=True)
            .execution_options(synchronize_session="fetch")
        )
        result = await self.session.execute(query)
        return int(result.rowcount or 0)
