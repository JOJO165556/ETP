from pydantic import BaseModel, EmailStr, ConfigDict
from src.modules.users.models import UserRole


class ProfileBase(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    raw_address: str | None = None

class ProfileResponse(ProfileBase):
    model_config = ConfigDict(from_attributes=True, json_schema_extra={
        "example": {
            "id": "prof-123",
            "user_id": "user-456",
            "first_name": "Jean",
            "last_name": "Dupont",
            "phone": "+33612345678",
            "cv_key": "cvs/user-456.pdf",
            "skills": ["python", "fastapi", "postgresql"],
        }
    })
    id: str
    user_id: str
    cv_key: str | None = None
    skills: list[str] | None = None


class ProfileUpdate(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {"first_name": "Jean", "last_name": "Dupont", "phone": "+33612345678"}
    })
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    raw_address: str | None = None

    
class UserBase(BaseModel):
    email: EmailStr
    role: UserRole = UserRole.CANDIDATE


class UserCreate(UserBase):
    model_config = ConfigDict(json_schema_extra={
        "example": {"email": "jean@example.com", "password": "Secret123!", "role": "candidate"}
    })
    password: str

class UserAdminCreate(UserCreate):
    model_config = ConfigDict(json_schema_extra={
        "example": {"email": "marie@techcorp.com", "password": "Secret123!", "role": "recruiter", "company_id": "comp-789"}
    })
    company_id: str | None = None

class UserUpdate(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {"email": "newemail@example.com", "is_active": True, "role": "recruiter"}
    })
    email: EmailStr | None = None
    is_active: bool | None = None
    role: UserRole | None = None
    company_id: str | None = None


class UserMeUpdate(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {"email": "newemail@example.com", "profile": {"first_name": "Jean"}}
    })
    email: EmailStr | None = None
    password: str | None = None
    profile: ProfileUpdate | None = None


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True, json_schema_extra={
        "example": {
            "id": "user-123",
            "email": "jean@example.com",
            "role": "candidate",
            "is_active": True,
            "company_id": None,
            "profile": {"first_name": "Jean", "last_name": "Dupont", "skills": ["python"]},
        }
    })
    id: str
    is_active: bool
    company_id: str | None = None
    profile: ProfileResponse | None = None
