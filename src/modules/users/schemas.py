from pydantic import BaseModel, EmailStr, ConfigDict
from src.modules.users.models import UserRole


class UserBase(BaseModel):
    email: EmailStr
    role: UserRole = UserRole.CANDIDATE


class UserCreate(UserBase):
    password: str


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    is_active: bool