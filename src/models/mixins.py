import uuid
from datetime import datetime
from sqlalchemy import Boolean, DateTime, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

class BaseUUIDMixin:
    """Garantit l'utilisation d'UUID v4 comme clé primaire non prédictible"""

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )

class AuditMixin:
    """Injecte auto les metas de cycle de vie de l'enregistrement"""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    # Qui a effectué la dernière modification (audit trail)
    modified_by: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )

class SoftDeleteMixin:
    """Permet l'archivage logique des données sans rupture d'intégrité physique
    Crucial pour l'entraînement continue de l'engine de recommandation
    """

    is_deleted: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False, server_default="false"
    )
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    async def soft_delete(self, db_session) -> None:
        self.is_deleted = True
        self.deleted_at = func.now()
        db_session.add(self)
        