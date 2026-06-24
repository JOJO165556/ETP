from pydantic import BaseModel


class DataExportRequest(BaseModel):
    user_id: str


class DataExportResponse(BaseModel):
    user_id: str
    email: str | None = None
    profile: dict | None = None
    applications: list[dict] = []
    consent_records: list[dict] = []


class DataDeletionRequest(BaseModel):
    user_id: str
    confirm: bool = False


class DataDeletionResponse(BaseModel):
    user_id: str
    deleted: bool
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
