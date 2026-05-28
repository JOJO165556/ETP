from typing import TYPE_CHECKING, List
from sqlalchemy import String, Boolean, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.core.database import Base
from src.models.mixins import BaseUUIDMixin, AuditMixin, SoftDeleteMixin

if TYPE_CHECKING:
    from src.modules.users.models import User
    from src.modules.jobs.models import Job


class Company(Base, BaseUUIDMixin, AuditMixin, SoftDeleteMixin):
    __tablename__ = "companies"

    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    siret: Mapped[str | None] = mapped_column(String(14), unique=True, nullable=True, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    
    # Préparation multi-tenant & billing
    settings: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Relations d'entreprise
    users: Mapped[list["User"]] = relationship("User", back_populates="company", cascade="all, delete-orphan")
    jobs: Mapped[list["Job"]] = relationship("Job", back_populates="company", cascade="all, delete-orphan")