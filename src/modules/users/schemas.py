from pydantic import BaseModel, EmailStr, ConfigDict
from src.modules.users.models import UserRole


class ProfileBase(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    raw_address: str | None = None

class ProfileResponse(ProfileBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    user_id: str
    cv_key: str | None = None  # Permet de voir si le candidat a un CV enregistré
    skills: list[str] | None = None


class ProfileUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    raw_address: str | None = None

    
class UserBase(BaseModel):
    email: EmailStr
    role: UserRole = UserRole.CANDIDATE


class UserCreate(UserBase):
    password: str

class UserAdminCreate(UserCreate):
    company_id: str | None = None

class UserUpdate(BaseModel):
    email: EmailStr | None = None
    is_active: bool | None = None
    role: UserRole | None = None
    company_id: str | None = None


class UserMeUpdate(BaseModel):
    email: EmailStr | None = None
    password: str | None = None
    profile: ProfileUpdate | None = None


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    is_active: bool
    company_id: str | None = None
    profile: ProfileResponse | None = None
