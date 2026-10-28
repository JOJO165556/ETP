from datetime import date
from enum import Enum
from typing import TYPE_CHECKING
from sqlalchemy import String, Boolean, ForeignKey, Integer, Text, Date, Enum as SQLEnum, Index
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


class AuthProvider(str, Enum):
    """Fournisseur d'identite ayant cree le compte (par defaut: credentials locaux)."""
    EMAIL = "email"
    GOOGLE = "google"
    FACEBOOK = "facebook"
    PHONE = "phone"


class User(Base, BaseUUIDMixin, AuditMixin, SoftDeleteMixin):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(SQLEnum(UserRole), default=UserRole.CANDIDATE, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    # Verification obligatoire de l'adresse email a l'inscription
    is_verified: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false", nullable=False
    )

    # Identifiant Firebase (verified id token) — lie le compte local au provider d'identite
    firebase_uid: Mapped[str | None] = mapped_column(String(128), unique=True, nullable=True, index=True)
    auth_provider: Mapped[AuthProvider | None] = mapped_column(
        SQLEnum(AuthProvider), nullable=True
    )

    # Clé étrangère vers l'organisation (Nullable si Candidat libre avant affectation)
    company_id: Mapped[str | None] = mapped_column(ForeignKey("companies.id", ondelete="SET NULL"), nullable=True)

    # Relations
    company: Mapped["Company | None"] = relationship("Company", back_populates="users")
    profile: Mapped["Profile | None"] = relationship("Profile", back_populates="user", uselist=False, cascade="all, delete-orphan")


class Profile(Base, BaseUUIDMixin, AuditMixin, SoftDeleteMixin):
    """Profil unifié hébergeant les structures ATS vectorisées et les attributs GIS"""
    __tablename__ = "user_profiles"
    __table_args__ = (
        Index("ix_profiles_skills_gin", "skills", postgresql_using="gin"),
    )

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

    # PORTION VISIBILITÉ & CONFIDENTIALITÉ (RGPD by design)
    is_profile_public: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true", nullable=False)
    is_searchable: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true", nullable=False)

    # Relations
    user: Mapped["User"] = relationship("User", back_populates="profile")
    experiences: Mapped[list["Experience"]] = relationship(
        "Experience", back_populates="profile", cascade="all, delete-orphan"
    )
    formations: Mapped[list["Formation"]] = relationship(
        "Formation", back_populates="profile", cascade="all, delete-orphan"
    )


class Experience(Base, BaseUUIDMixin, AuditMixin, SoftDeleteMixin):
    """Expérience professionnelle d'un candidat (parcours)."""
    __tablename__ = "experiences"

    profile_id: Mapped[str] = mapped_column(
        ForeignKey("user_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    entreprise: Mapped[str] = mapped_column(String(255), nullable=False)
    poste: Mapped[str] = mapped_column(String(255), nullable=False)
    type_contrat: Mapped[str | None] = mapped_column(String(50), nullable=True)
    date_debut: Mapped[date] = mapped_column(Date, nullable=False)
    date_fin: Mapped[date | None] = mapped_column(Date, nullable=True)
    en_cours: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    ordre: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)

    # Relations
    profile: Mapped["Profile"] = relationship("Profile", back_populates="experiences")


class Formation(Base, BaseUUIDMixin, AuditMixin, SoftDeleteMixin):
    """Formation / diplôme d'un candidat (parcours académique)."""
    __tablename__ = "formations"

    profile_id: Mapped[str] = mapped_column(
        ForeignKey("user_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    etablissement: Mapped[str] = mapped_column(String(255), nullable=False)
    diplome: Mapped[str] = mapped_column(String(255), nullable=False)
    domaine: Mapped[str | None] = mapped_column(String(255), nullable=True)
    annee: Mapped[int] = mapped_column(Integer, nullable=False)
    ordre: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)

    # Relations
    profile: Mapped["Profile"] = relationship("Profile", back_populates="formations")