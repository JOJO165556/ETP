from enum import Enum
from typing import TYPE_CHECKING
from sqlalchemy import String, ForeignKey, Enum as SQLEnum, JSON, Numeric, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.core.database import Base
from src.models.mixins import BaseUUIDMixin, AuditMixin, SoftDeleteMixin

if TYPE_CHECKING:
    from src.modules.jobs.models import Job
    from src.modules.users.models import User


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
    