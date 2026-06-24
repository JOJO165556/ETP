from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional
from src.modules.jobs.models import JobStatus

class JobBase(BaseModel):
    title: str = Field(..., description="Le titre du poste")
    description: str = Field(..., description="La description détaillée de l'offre")
    is_remote: bool = Field(default=False, description="Télétravail autorisé")
    formatted_address: str | None = Field(None, description="Adresse physique du poste")
    required_skills: List[str] | None = Field(default_factory=list, description="Liste des compétences requises")

class JobCreate(JobBase):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "title": "Développeur Python Senior",
            "description": "Nous recherchons un développeur Python expérimenté pour rejoindre notre équipe backend.",
            "is_remote": True,
            "formatted_address": "15 Rue de Rivoli, 75001 Paris",
            "required_skills": ["python", "fastapi", "postgresql", "docker"],
            "status": "draft",
            "longitude": 2.3522,
            "latitude": 48.8566,
        }
    })
    status: JobStatus = Field(default=JobStatus.DRAFT, description="Le statut initial de l'offre")
    longitude: float | None = Field(None, description="Longitude pour le SIG (ex: 2.3522)")
    latitude: float | None = Field(None, description="Latitude pour le SIG (ex: 48.8566)")

class JobUpdate(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {"title": "Dev Python Senior (confirmé)", "status": "active", "is_remote": True}
    })
    title: str | None = None
    description: str | None = None
    status: JobStatus | None = None
    is_remote: bool | None = None
    formatted_address: str | None = None
    required_skills: List[str] | None = None
    longitude: float | None = None
    latitude: float | None = None

class JobResponse(JobBase):
    model_config = ConfigDict(from_attributes=True, json_schema_extra={
        "example": {
            "id": "job-123",
            "title": "Développeur Python Senior",
            "description": "Nous recherchons un développeur Python expérimenté...",
            "is_remote": True,
            "formatted_address": "15 Rue de Rivoli, 75001 Paris",
            "required_skills": ["python", "fastapi", "postgresql"],
            "company_id": "comp-456",
            "status": "active",
        }
    })
    id: str
    company_id: str
    status: JobStatus

class CandidateMatchResponse(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "profile_id": "prof-789",
            "user_id": "user-012",
            "first_name": "Jean",
            "last_name": "Dupont",
            "email": "jean@example.com",
            "matching_score": 85.5,
            "distance_km": 3.2,
            "matched_skills": ["python", "fastapi"],
            "missing_skills": ["docker"],
        }
    })
    profile_id: str
    user_id: str
    first_name: str | None
    last_name: str | None
    email: str
    matching_score: float
    distance_km: float | None
    matched_skills: List[str]
    missing_skills: List[str]
