from pydantic import BaseModel, ConfigDict


class NotificationCreate(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "recipient_id": "user-123",
            "subject": "Candidature reçue",
            "body": "Votre candidature pour Dev Python a été enregistrée.",
            "notification_type": "success",
        }
    })
    recipient_id: str
    subject: str
    body: str
    notification_type: str = "info"


class NotificationResponse(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "id": "notif-456",
            "recipient_id": "user-123",
            "subject": "Candidature reçue",
            "body": "Votre candidature a été enregistrée.",
            "notification_type": "success",
            "read": False,
            "created_at": "2026-06-24T10:00:00Z",
        }
    })
    id: str
    recipient_id: str
    subject: str
    body: str
    notification_type: str
    read: bool
    created_at: str | None = None


class EmailNotification(BaseModel):
    to: str
    subject: str
    html_body: str
