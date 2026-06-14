from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from src.modules.applications.models import ApplicationStage

class ApplicationBase(BaseModel):
    # Plus tard on pourrait rajouter la lettre de motivation en texte ici
    pass

class ApplicationCreate(ApplicationBase):
    pass

class ApplicationUpdateStage(BaseModel):
    stage: ApplicationStage = Field(..., description="Le nouveau statut de la candidature")

class ApplicationResponse(ApplicationBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    job_id: str
    candidate_id: str
    stage: ApplicationStage
    resume_storage_path: str | None = None
    matching_score: float | None = None
    
    # Celery Task Tracking
    celery_task_id: str | None = None
    celery_task_status: str | None = None
    celery_task_result: dict | None = None
