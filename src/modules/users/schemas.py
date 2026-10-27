from uuid import UUID
from datetime import date, datetime
from pydantic import BaseModel, EmailStr, ConfigDict
from src.modules.users.models import UserRole


class ExperienceBase(BaseModel):
    """Bloc de base d'une expérience professionnelle."""
    entreprise: str
    poste: str
    type_contrat: str | None = None
    date_debut: date
    date_fin: date | None = None
    en_cours: bool = False
    description: str | None = None


class ExperienceCreate(ExperienceBase):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "entreprise": "TechCorp",
            "poste": "Développeur Python",
            "type_contrat": "CDI",
            "date_debut": "2022-03-01",
            "en_cours": True,
            "description": "Développement backend FastAPI.",
        }
    })


class ExperienceUpdate(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {"poste": "Développeur Python Senior", "en_cours": False}
    })
    entreprise: str | None = None
    poste: str | None = None
    type_contrat: str | None = None
    date_debut: date | None = None
    date_fin: date | None = None
    en_cours: bool | None = None
    description: str | None = None
    ordre: int | None = None


class ExperienceResponse(ExperienceBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    profile_id: UUID
    ordre: int = 0


class FormationBase(BaseModel):
    """Bloc de base d'une formation / diplôme."""
    etablissement: str
    diplome: str
    domaine: str | None = None
    annee: int


class FormationCreate(FormationBase):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "etablissement": "Université Paris-Saclay",
            "diplome": "Master Informatique",
            "domaine": "Développement logiciel",
            "annee": 2022,
        }
    })


class FormationUpdate(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {"domaine": "Ingénierie logicielle"}
    })
    etablissement: str | None = None
    diplome: str | None = None
    domaine: str | None = None
    annee: int | None = None
    ordre: int | None = None


class FormationResponse(FormationBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    profile_id: UUID
    ordre: int = 0


class ExperienceResume(BaseModel):
    """Version compacte d'une expérience pour le vivier (vue recruteur)."""
    model_config = ConfigDict(from_attributes=True)
    poste: str
    entreprise: str
    type_contrat: str | None = None
    date_debut: date | None = None
    date_fin: date | None = None
    en_cours: bool = False
    description: str | None = None


class FormationResume(BaseModel):
    """Version compacte d'une formation pour le vivier (vue recruteur)."""
    model_config = ConfigDict(from_attributes=True)
    diplome: str
    etablissement: str
    domaine: str | None = None
    annee: int | None = None


class ProfileBase(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    raw_address: str | None = None
    is_profile_public: bool | None = True
    is_searchable: bool | None = True

class ProfileResponse(ProfileBase):
    model_config = ConfigDict(from_attributes=True, json_schema_extra={
        "example": {
            "id": "prof-123",
            "user_id": "user-456",
            "first_name": "Jean",
            "last_name": "Dupont",
            "phone": "+33612345678",
            "cv_key": "cvs/user-456.pdf",
            "skills": ["python", "fastapi", "postgresql"],
        }
    })
    id: UUID
    user_id: UUID
    cv_key: str | None = None
    skills: list[str] | None = None
    experiences: list[ExperienceResponse] | None = None
    formations: list[FormationResponse] | None = None


class ProfileUpdate(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {"first_name": "Jean", "last_name": "Dupont", "phone": "+33612345678"}
    })
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    raw_address: str | None = None
    skills: list[str] | None = None
    is_profile_public: bool | None = None
    is_searchable: bool | None = None

    
class UserBase(BaseModel):
    email: EmailStr
    role: UserRole = UserRole.CANDIDATE


class UserCreate(UserBase):
    model_config = ConfigDict(json_schema_extra={
        "example": {"email": "jean@example.com", "password": "Secret123!", "role": "candidate"}
    })
    password: str

class UserAdminCreate(UserCreate):
    model_config = ConfigDict(json_schema_extra={
        "example": {"email": "marie@techcorp.com", "password": "Secret123!", "role": "recruiter", "company_id": "comp-789"}
    })
    company_id: str | None = None

class UserUpdate(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {"email": "newemail@example.com", "is_active": True, "role": "recruiter"}
    })
    email: EmailStr | None = None
    is_active: bool | None = None
    role: UserRole | None = None
    company_id: str | None = None


class UserMeUpdate(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {"email": "newemail@example.com", "profile": {"first_name": "Jean"}}
    })
    email: EmailStr | None = None
    password: str | None = None
    profile: ProfileUpdate | None = None


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True, json_schema_extra={
        "example": {
            "id": "user-123",
            "email": "jean@example.com",
            "role": "candidate",
            "is_active": True,
            "company_id": None,
            "profile": {"first_name": "Jean", "last_name": "Dupont", "skills": ["python"]},
        }
    })
    id: UUID
    is_active: bool
    company_id: UUID | None = None
    profile: ProfileResponse | None = None


class UserBriefResponse(BaseModel):
    """Fiche candidat du vivier (vue recruteur) — uniquement des données réelles."""
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "id": "user-123",
            "email": "jean@example.com",
            "nom_complet": "Jean Dupont",
            "titre": None,
            "localisation": "Paris",
            "skills": ["python", "fastapi"],
            "has_cv": True,
            "profil_public": True,
            "recherchable": True,
            "created_at": "2025-01-15T10:30:00Z",
        }
    })
    id: UUID
    email: EmailStr
    nom_complet: str | None = None
    titre: str | None = None
    localisation: str | None = None
    skills: list[str] = []
    has_cv: bool = False
    profil_public: bool = True
    recherchable: bool = True
    created_at: datetime | None = None
    experiences: list[ExperienceResume] = []
    formations: list[FormationResume] = []
