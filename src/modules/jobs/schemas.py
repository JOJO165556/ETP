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
    status: JobStatus = Field(default=JobStatus.DRAFT, description="Le statut initial de l'offre")

class JobUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: JobStatus | None = None
    is_remote: bool | None = None
    formatted_address: str | None = None
    required_skills: List[str] | None = None

class JobResponse(JobBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    company_id: str
    status: JobStatus
