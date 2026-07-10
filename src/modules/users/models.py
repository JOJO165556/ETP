from enum import Enum
from typing import TYPE_CHECKING
from sqlalchemy import String, Boolean, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from geoalchemy2 import Geometry  # Préparé pour l'extension PostGIS
from src.core.database import Base
from src.models.mixins import BaseUUIDMixin, AuditMixin, SoftDeleteMixin

# Évite les imports circulaires au runtime pour les outils d'analyse statique (Mypy/Pylance)
if TYPE_CHECKING:
    from src.modules.companies.models import Company

class UserRole(str, Enum):
    SUPERADMIN = "superadmin"
    COMPANY_ADMIN = "company_admin"
    RECRUITER = "recruiter"
    CANDIDATE = "candidate"


class User(Base, BaseUUIDMixin, AuditMixin, SoftDeleteMixin):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(SQLEnum(UserRole), default=UserRole.CANDIDATE, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")

    # Clé étrangère vers l'organisation (Nullable si Candidat libre avant affectation)
    company_id: Mapped[str | None] = mapped_column(ForeignKey("companies.id", ondelete="SET NULL"), nullable=True)

    # Relations
    company: Mapped["Company | None"] = relationship("Company", back_populates="users")
    profile: Mapped["Profile | None"] = relationship("Profile", back_populates="user", uselist=False, cascade="all, delete-orphan")


class Profile(Base, BaseUUIDMixin, AuditMixin, SoftDeleteMixin):
    """Profil unifié hébergeant les structures ATS vectorisées et les attributs GIS"""
    __tablename__ = "user_profiles"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    first_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    last_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)

    # PORTION STOCKAGE CV
    # Stocke la clé unique du fichier dans MinIO (ex: 'cvs/uuid.pdf')
    cv_key: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # PORTION INTÉGRATION GIS (PostGIS)
    # Stocke le point géographique précis de résidence (SRID 4326 - WGS 84)
    location = mapped_column(Geometry(geometry_type="POINT", srid=4326), nullable=True, index=True)
    raw_address: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # PORTION INTÉGRATION ATS & RECOMMENDATION ENGINE
    # Stockage de la structure de compétences normalisée pour les requêtes de graphes complexes et encodages vectoriels
    skills: Mapped[list[str] | None] = mapped_column(JSONB, nullable=True, server_default="[]")

    # Relations
    user: Mapped["User"] = relationship("User", back_populates="profile")