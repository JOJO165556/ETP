from pydantic import BaseModel, ConfigDict


class DataExportRequest(BaseModel):
    user_id: str


class DataExportResponse(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "user_id": "user-123",
            "email": "jean@example.com",
            "profile": {"first_name": "Jean", "last_name": "Dupont"},
            "applications": [{"id": "app-456", "job_title": "Dev Python", "stage": "interview"}],
            "consent_records": [],
        }
    })
    user_id: str
    email: str | None = None
    profile: dict | None = None
    applications: list[dict] = []
    consent_records: list[dict] = []


class DataDeletionRequest(BaseModel):
    model_config = ConfigDict(json_schema_extra={"example": {"user_id": "user-123", "confirm": True}})
    user_id: str
    confirm: bool = False


class DataDeletionResponse(BaseModel):
    model_config = ConfigDict(json_schema_extra={"example": {"user_id": "user-123", "deleted": True, "message": "Supprimé"}})
    user_id: str
    deleted: bool
    message: str


class AnonymizationResponse(BaseModel):
    model_config = ConfigDict(json_schema_extra={"example": {"user_id": "user-123", "anonymized": True, "message": "Anonymisé"}})
    user_id: str
    anonymized: bool
    message: str


class ConsentRecord(BaseModel):
    user_id: str
    consent_type: str
    granted: bool
    ip_address: str | None = None


class AuditLogEntry(BaseModel):
    id: str | None = None
    user_id: str
    action: str
    details: dict | None = None
