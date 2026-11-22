from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from src.modules.interviews.models import InterviewStatus


class InterviewBase(BaseModel):
    application_id: str = Field(..., description="ID de la candidature")
    interviewer_id: str = Field(..., description="ID du recruteur")
    scheduled_at: datetime = Field(..., description="Date et heure de l'entretien")
    duration_minutes: int = Field(default=45, ge=1, description="Durée en minutes")
    meeting_link: Optional[str] = Field(None, max_length=512, description="Lien de réunion")
    location: Optional[str] = Field(None, max_length=255, description="Lieu de l'entretien")
    notes: Optional[str] = Field(None, description="Notes de l'entretien")


class InterviewCreate(InterviewBase):
    status: InterviewStatus = Field(default=InterviewStatus.SCHEDULED)


class InterviewUpdate(BaseModel):
    scheduled_at: Optional[datetime] = None
    duration_minutes: Optional[int] = Field(None, ge=1)
    status: Optional[InterviewStatus] = None
    meeting_link: Optional[str] = Field(None, max_length=512)
    location: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = None

    @field_validator("duration_minutes")
    @classmethod
    def validate_duration(cls, v):
        if v is not None and v <= 0:
            raise ValueError("duration_minutes must be greater than 0")
        return v


class InterviewRead(InterviewBase):
    id: UUID
    application_id: UUID
    interviewer_id: UUID
    status: InterviewStatus
    created_at: datetime
    updated_at: datetime
    job_title: Optional[str] = None
    company_name: Optional[str] = None
    candidate_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
