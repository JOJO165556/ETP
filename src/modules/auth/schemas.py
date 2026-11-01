from pydantic import BaseModel, ConfigDict, EmailStr, Field
from src.modules.users.models import UserRole


class Token(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "access_token": "eyJhbGciOiJIUzI1NiIs...",
            "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
            "token_type": "bearer",
        }
    })
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: str | None = None
    token_type: str = "access"


class RegisterRequest(BaseModel):
    """Inscription publique directe.
    Le role est toujours CANDIDATE (aucun champ role accepte).
    """
    model_config = ConfigDict(extra="forbid", json_schema_extra={
        "example": {
            "email": "jean.dupont@example.com",
            "password": "MonSecret123!",
            "first_name": "Jean",
            "last_name": "Dupont",
        }
    })
    email: EmailStr
    password: str = Field(min_length=8, max_length=128, description="Mot de passe d'au moins 8 caractères")
    first_name: str | None = None
    last_name: str | None = None


class RefreshTokenRequest(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {"refresh_token": "eyJhbGciOiJIUzI1NiIs..."}
    })
    refresh_token: str


class FirebaseLoginRequest(BaseModel):
    """Echange un ID token Firebase contre une session ETP (JWT).

    Les champs de profil (first_name, last_name, role) sont optionnels et
    uniquement appliques lors d'une inscription 100% Firebase (escape
    client-side Firebase / auth/firebase), pas lors d'une connexion simple.
    """
    model_config = ConfigDict(json_schema_extra={
        "example": {"id_token": "eyJhbGciOiJSUzI1NiIs..."}
    })
    id_token: str
    first_name: str | None = None
    last_name: str | None = None
    role: UserRole | None = None


class ChangePasswordRequest(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {"current_password": "AncienMot2Passe!", "new_password": "NouveauMot2Passe!"}
    })
    current_password: str
    new_password: str


class ForgotPasswordRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", json_schema_extra={
        "example": {"email": "jean.dupont@example.com"}
    })
    email: EmailStr


class ResendVerificationRequest(BaseModel):
    """Demande de renvoi du lien de verification d'email."""
    model_config = ConfigDict(extra="forbid", json_schema_extra={
        "example": {"email": "jean.dupont@example.com"}
    })
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", json_schema_extra={
        "example": {"token": "eyJhbGciOiJIUzI1NiIs...", "new_password": "NouveauMot2Passe!"}
    })
    token: str = Field(min_length=1)
    new_password: str = Field(min_length=8, max_length=128)
