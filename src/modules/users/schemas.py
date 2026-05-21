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

    
class UserBase(BaseModel):
    email: EmailStr
    role: UserRole = UserRole.CANDIDATE


class UserCreate(UserBase):
    password: str


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    is_active: bool
    profile: ProfileResponse | None = None
