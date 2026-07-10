from enum import Enum
from typing import TYPE_CHECKING
from sqlalchemy import String, Text, Boolean, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from geoalchemy2 import Geometry
from src.core.database import Base
from src.models.mixins import BaseUUIDMixin, AuditMixin, SoftDeleteMixin

if TYPE_CHECKING:
    from src.modules.companies.models import Company
    from src.modules.applications.models import Application


class JobStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    CLOSED = "closed"
    ARCHIVED = "archived"


class Job(Base, BaseUUIDMixin, AuditMixin, SoftDeleteMixin):
    __tablename__ = "jobs"

    company_id: Mapped[str] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[JobStatus] = mapped_column(
        SQLEnum(JobStatus), default=JobStatus.DRAFT, nullable=False, index=True
    )
    is_remote: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")

    # INTÉGRATION GIS (PostGIS)
    # Zone géographique ou point précis de l'offre pour le calcul des temps de trajet
    job_location = mapped_column(Geometry(geometry_type="POINT", srid=4326), nullable=True, index=True)
    formatted_address: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # INTÉGRATION RECOMMENDATION & GRAPHE
    # Matrice de compétences cibles normalisées (ex: ["Python", "FastAPI", "PostgreSQL"])
    required_skills: Mapped[dict | list | None] = mapped_column(JSONB, nullable=True, server_default="[]")

    # Relations
    company: Mapped["Company"] = relationship("Company", back_populates="jobs")
    applications: Mapped[list["Application"]] = relationship(
        "Application", back_populates="job", cascade="all, delete-orphan"
    )
    