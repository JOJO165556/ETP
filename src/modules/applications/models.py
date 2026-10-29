from enum import Enum
from typing import TYPE_CHECKING
import sqlalchemy as sa
from sqlalchemy import String, ForeignKey, Enum as SQLEnum, JSON, Numeric, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.core.database import Base
from src.models.mixins import BaseUUIDMixin, AuditMixin, SoftDeleteMixin

if TYPE_CHECKING:
    from src.modules.jobs.models import Job
    from src.modules.users.models import User
    from src.modules.interviews.models import Interview


class ApplicationStage(str, Enum):
    APPLIED = "applied"
    SCREENING = "screening"
    INTERVIEW = "interview"
    OFFER = "offer"
    HIRED = "hired"
    REJECTED = "rejected"


class Application(Base, BaseUUIDMixin, AuditMixin, SoftDeleteMixin):
    __tablename__ = "applications"

    job_id: Mapped[str] = mapped_column(
        ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    candidate_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    stage: Mapped[ApplicationStage] = mapped_column(
        SQLEnum(ApplicationStage), default=ApplicationStage.APPLIED, nullable=False, index=True
    )

    # DOCUMENT MANAGEMENT FOUNDATION (MinIO / S3)
    # Chemins d'accès vers le stockage d'objets pour les documents originaux
    resume_storage_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    cover_letter_storage_path: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # AI / PARSING & MATCHING DATA
    # Score brut généré par le moteur de recommandation ou l'ATS (ex: 85.50)
    matching_score: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    # Données brutes extraites par le parser (historique de carrière, éducation au format JSON structural)
    parsed_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    
    # Celery Task Tracking
    celery_task_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    celery_task_status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    celery_task_result: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Relations
    job: Mapped["Job"] = relationship("Job", back_populates="applications")
    candidate: Mapped["User"] = relationship("User")
    notes: Mapped[list["ApplicationNote"]] = relationship(
        "ApplicationNote", back_populates="application", cascade="all, delete-orphan"
    )
    interviews: Mapped[list["Interview"]] = relationship(
        "Interview", back_populates="application", cascade="all, delete-orphan"
    )


class ApplicationNote(Base, BaseUUIDMixin, AuditMixin):
    __tablename__ = "application_notes"
    __table_args__ = (
        sa.CheckConstraint("rating BETWEEN 1 AND 5", name="ck_application_note_rating_range"),
    )

    application_id: Mapped[str] = mapped_column(
        ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True
    )
    author_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    rating: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Relations
    application: Mapped["Application"] = relationship("Application", back_populates="notes")
    author: Mapped["User"] = relationship("User")


class ApplicationStageHistory(Base, BaseUUIDMixin):
    __tablename__ = "application_stage_history"

    application_id: Mapped[str] = mapped_column(
        ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True
    )
    from_stage: Mapped[ApplicationStage] = mapped_column(SQLEnum(ApplicationStage), nullable=False)
    to_stage: Mapped[ApplicationStage] = mapped_column(SQLEnum(ApplicationStage), nullable=False)
    changed_by_user_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    reason: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Relations
    application: Mapped["Application"] = relationship("Application")
    