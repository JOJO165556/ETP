"""Modele de persistance des notifications in-app."""
import uuid
from enum import Enum

from sqlalchemy import Boolean, ForeignKey, Index, String, Text
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.core.database import Base
from src.models.mixins import AuditMixin, BaseUUIDMixin


class NotificationType(str, Enum):
    APPLICATION_STATUS = "application_status"
    NEW_APPLICATION = "new_application"
    INTERVIEW = "interview"
    SYSTEM = "system"


class Notification(Base, BaseUUIDMixin, AuditMixin):
    """Notification destinee a un utilisateur unique (pas de diffusion globale)."""

    __tablename__ = "notifications"
    __table_args__ = (
        # Index composite couvrant la requete GET /notifications/me
        # (filtre user_id + is_read, tri par created_at).
        Index(
            "ix_notifications_user_read_created",
            "user_id",
            "is_read",
            "created_at",
        ),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[NotificationType] = mapped_column(
        SQLEnum(NotificationType),
        nullable=False,
        default=NotificationType.SYSTEM,
        server_default=NotificationType.SYSTEM.name,
    )
    is_read: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
        index=True,
    )
    link: Mapped[str | None] = mapped_column(String(512), nullable=True)
