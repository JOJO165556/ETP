"""Schemas de notifications in-app."""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from src.modules.notifications.models import NotificationType


class NotificationCreate(BaseModel):
    """Creation interne (service a service), jamais exposee telle quelle."""

    model_config = ConfigDict(extra="forbid")

    user_id: UUID
    title: str = Field(min_length=1, max_length=255)
    message: str = Field(min_length=1)
    type: NotificationType = NotificationType.SYSTEM
    link: str | None = Field(default=None, max_length=512)


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, json_schema_extra={
        "example": {
            "id": "3f2b8c1e-6a4d-4b5e-9c7f-1a2b3c4d5e6f",
            "user_id": "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
            "title": "Candidature reçue",
            "message": "Votre candidature a été enregistrée.",
            "type": "application_status",
            "is_read": False,
            "link": "/applications/123",
            "created_at": "2026-10-28T10:00:00Z",
        }
    })

    id: UUID
    user_id: UUID
    title: str
    message: str
    type: NotificationType
    is_read: bool
    link: str | None = None
    created_at: datetime


class NotificationListResponse(BaseModel):
    """Liste paginee des notifications de l'utilisateur connecte."""

    notifications: list[NotificationResponse]
    total: int
    unread_count: int
    limit: int
    offset: int


class NotificationMarkedResponse(BaseModel):
    message: str
    id: UUID
    is_read: bool = True


class NotificationReadAllResponse(BaseModel):
    message: str
    updated: int
