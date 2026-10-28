"""Modeles de persistance de la couche IA (fournisseurs, configuration ATS, audit)."""
import uuid
from datetime import datetime
from decimal import Decimal
from enum import Enum

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.core.database import Base
from src.models.mixins import AuditMixin, BaseUUIDMixin


class AIProviderName(str, Enum):
    """Fournisseurs supportes par la couche d'abstraction."""

    HUGGINGFACE = "huggingface"
    GEMINI = "gemini"


class AITaskType(str, Enum):
    EXTRACTION = "extraction"
    MATCHING = "matching"


class AIAuditStatus(str, Enum):
    SUCCESS = "success"
    ERROR = "error"
    FALLBACK = "fallback"

DEFAULT_WEIGHT_SKILLS = Decimal("0.600")
DEFAULT_WEIGHT_EXPERIENCE = Decimal("0.250")
DEFAULT_WEIGHT_EDUCATION = Decimal("0.150")
DEFAULT_THRESHOLD_SCREENING = Decimal("80.00")
DEFAULT_THRESHOLD_REJECT = Decimal("25.00")


class AIProviderConfig(Base, BaseUUIDMixin, AuditMixin):
    """Configuration d'un fournisseur LLM, sans cle API en clair."""

    __tablename__ = "ai_provider_configs"
    __table_args__ = (
        Index(
            "ux_ai_provider_configs_default",
            "is_default",
            unique=True,
            postgresql_where=text("is_default"),
        ),
        Index("ix_ai_provider_configs_provider_active", "provider", "is_active"),
    )

    name: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    provider: Mapped[str] = mapped_column(String(32), nullable=False)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )
    is_default: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("false")
    )
    api_key_ref: Mapped[str] = mapped_column(String(128), nullable=False)
    model_id: Mapped[str | None] = mapped_column(String(256), nullable=True)
    model_params: Mapped[dict] = mapped_column(
        JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb")
    )
    supports_extraction: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )
    supports_matching: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )
    supports_embeddings: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("false")
    )


class AIJobConfig(Base, BaseUUIDMixin, AuditMixin):
    """Ponderation du matching et seuils ATS, globale ou par entreprise."""

    __tablename__ = "ai_job_configs"
    __table_args__ = (
        CheckConstraint(
            "abs(weight_skills + weight_experience + weight_education - 1.000) <= 0.001",
            name="ck_ai_job_configs_weights_sum",
        ),
        CheckConstraint(
            "weight_skills >= 0 AND weight_skills <= 1",
            name="ck_ai_job_configs_weight_skills_range",
        ),
        CheckConstraint(
            "weight_experience >= 0 AND weight_experience <= 1",
            name="ck_ai_job_configs_weight_experience_range",
        ),
        CheckConstraint(
            "weight_education >= 0 AND weight_education <= 1",
            name="ck_ai_job_configs_weight_education_range",
        ),
        CheckConstraint(
            "threshold_screening >= 0 AND threshold_screening <= 100",
            name="ck_ai_job_configs_threshold_screening_range",
        ),
        CheckConstraint(
            "threshold_reject >= 0 AND threshold_reject <= 100",
            name="ck_ai_job_configs_threshold_reject_range",
        ),
        CheckConstraint(
            "threshold_reject <= threshold_screening",
            name="ck_ai_job_configs_thresholds_order",
        ),
        # Index d'expression : PostgreSQL considere les NULL comme distincts.
        Index(
            "ux_ai_job_configs_company",
            "company_id",
            unique=True,
            postgresql_where=text("company_id IS NOT NULL"),
        ),
        Index(
            "ux_ai_job_configs_global",
            text("(company_id IS NULL)"),
            unique=True,
            postgresql_where=text("company_id IS NULL"),
        ),
    )

    company_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=True,
    )
    provider_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ai_provider_configs.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    weight_skills: Mapped[Decimal] = mapped_column(
        Numeric(4, 3), nullable=False, default=DEFAULT_WEIGHT_SKILLS,
        server_default=text("0.600"),
    )
    weight_experience: Mapped[Decimal] = mapped_column(
        Numeric(4, 3), nullable=False, default=DEFAULT_WEIGHT_EXPERIENCE,
        server_default=text("0.250"),
    )
    weight_education: Mapped[Decimal] = mapped_column(
        Numeric(4, 3), nullable=False, default=DEFAULT_WEIGHT_EDUCATION,
        server_default=text("0.150"),
    )
    threshold_screening: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), nullable=False, default=DEFAULT_THRESHOLD_SCREENING,
        server_default=text("80.00"),
    )
    threshold_reject: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), nullable=False, default=DEFAULT_THRESHOLD_REJECT,
        server_default=text("25.00"),
    )
    auto_stage_update: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )
    semantic_matching: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("false")
    )


class AIAuditLog(Base, BaseUUIDMixin):
    """Journal d'audit append-only, sans aucune donnee personnelle."""

    __tablename__ = "ai_audit_logs"
    __table_args__ = (
        Index("ix_ai_audit_logs_created_at", "created_at"),
        Index("ix_ai_audit_logs_company_created", "company_id", "created_at"),
        Index("ix_ai_audit_logs_task_status", "task_type", "status"),
    )

    company_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="SET NULL"),
        nullable=True,
    )
    provider: Mapped[str] = mapped_column(String(32), nullable=False)
    model_id: Mapped[str | None] = mapped_column(String(256), nullable=True)
    task_type: Mapped[str] = mapped_column(String(32), nullable=False)
    latency_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
