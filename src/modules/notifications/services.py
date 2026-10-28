"""Service metier des notifications in-app.

L'envoi d'emails est desormais delegue a ``src.core.email`` et execute de
facon asynchrone par la tache Celery ``send_templated_email``.
"""
import logging
from typing import Sequence

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.email import render_email  # noqa: F401 - re-export de compatibilite
from src.modules.notifications.models import Notification, NotificationType
from src.modules.notifications.repository import NotificationRepository

logger = logging.getLogger(__name__)


class NotificationService:
    """Gestion des notifications persistees en base."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = NotificationRepository(db)

    async def create(
        self,
        user_id,
        title: str,
        message: str,
        notification_type: NotificationType | str = NotificationType.SYSTEM,
        link: str | None = None,
    ) -> Notification:
        """Cree et persiste une notification pour un utilisateur."""
        if not isinstance(notification_type, NotificationType):
            notification_type = NotificationType(notification_type)

        notification = await self.repo.create({
            "user_id": user_id,
            "title": title,
            "message": message,
            "type": notification_type,
            "is_read": False,
            "link": link,
        })
        return notification

    async def list_for_user(
        self,
        user_id,
        unread_only: bool = False,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[Sequence[Notification], int, int]:
        """Retourne (notifications, total, non lues)."""
        notifications = await self.repo.list_for_user(
            user_id=user_id,
            unread_only=unread_only,
            limit=limit,
            offset=offset,
        )
        total = await self.repo.count_for_user(user_id, unread_only=unread_only)
        unread_count = await self.repo.count_unread(user_id)
        return notifications, total, unread_count

    async def mark_as_read(self, notification_id, user_id) -> Notification:
        """Marque une notification comme lue apres verification de propriete."""
        notification = await self.repo.get_for_user(notification_id, user_id)
        if notification is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification introuvable.",
            )

        if not notification.is_read:
            notification.is_read = True
            notification.modified_by = str(user_id)
            await self.db.flush()

        return notification

    async def mark_all_as_read(self, user_id) -> int:
        """Marque toutes les notifications de l'utilisateur comme lues."""
        return await self.repo.mark_all_read(user_id)

    async def notify_application_received(
        self, user_id, job_title: str, company_name: str | None = None
    ) -> Notification:
        """Notifie un candidat que sa candidature a ete enregistree."""
        return await self.create(
            user_id=user_id,
            title=f"Candidature reçue - {job_title}",
            message=(
                f"Votre candidature pour {job_title}"
                + (f" chez {company_name}" if company_name else "")
                + " a été enregistrée."
            ),
            notification_type=NotificationType.APPLICATION_STATUS,
        )

    async def notify_stage_changed(
        self,
        user_id,
        job_title: str,
        new_stage: str,
        message: str = "",
    ) -> Notification:
        """Notifie un candidat d'un changement d'etape de candidature."""
        return await self.create(
            user_id=user_id,
            title=f"Candidature mise à jour - {job_title}",
            message=(
                f"Votre candidature pour {job_title} est maintenant au stage: {new_stage}."
                + (f" {message}" if message else "")
            ),
            notification_type=NotificationType.APPLICATION_STATUS,
        )
