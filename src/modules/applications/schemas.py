from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from src.modules.applications.models import ApplicationStage

class ApplicationBase(BaseModel):
    pass

class ApplicationCreate(ApplicationBase):
    pass

class ApplicationUpdateStage(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "examples": [{"stage": "screening"}]
    })
    stage: ApplicationStage = Field(..., description="Le nouveau statut de la candidature")

class ApplicationResponse(ApplicationBase):
    model_config = ConfigDict(from_attributes=True, json_schema_extra={
        "example": {
            "id": "app-123",
            "job_id": "job-456",
            "candidate_id": "user-789",
            "stage": "applied",
            "matching_score": 82.5,
        }
    })
    id: str
    job_id: str
    candidate_id: str
    stage: ApplicationStage
    resume_storage_path: str | None = None
    matching_score: float | None = None
    celery_task_id: str | None = None
    celery_task_status: str | None = None
    celery_task_result: dict | None = None


class ApplicationSubmitResponse(BaseModel):
    """Réponse retournée lors d'une candidature."""
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "application": {"id": "app-123", "job_id": "job-456", "stage": "applied"},
            "task_id": "celery-task-789",
            "task_status": "PENDING",
        }
    })
    application: ApplicationResponse
    task_id: str | None = None
    task_status: str | None = None


class TaskStatusResponse(BaseModel):
    """Statut d'une tâche Celery."""
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "task_id": "celery-task-789",
            "application_id": "app-123",
            "status": "SUCCESS",
            "result": {"matching_score": 85.5},
            "matching_score": 85.5,
            "stage": "screening",
        }
    })
    task_id: str
    application_id: str
    status: str
    result: dict | None = None
    matching_score: float | None = None
    stage: str | None = None
