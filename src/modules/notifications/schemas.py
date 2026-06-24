from pydantic import BaseModel


class NotificationCreate(BaseModel):
    recipient_id: str
    subject: str
    body: str
    notification_type: str = "info"


class NotificationResponse(BaseModel):
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
