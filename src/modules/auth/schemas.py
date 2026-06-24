from pydantic import BaseModel, ConfigDict


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
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "email": "jean.dupont@example.com",
            "password": "MonSecret123!",
            "first_name": "Jean",
            "last_name": "Dupont",
        }
    })
    email: str
    password: str
    first_name: str | None = None
    last_name: str | None = None


class RefreshTokenRequest(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {"refresh_token": "eyJhbGciOiJIUzI1NiIs..."}
    })
    refresh_token: str


class ChangePasswordRequest(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {"current_password": "AncienMot2Passe!", "new_password": "NouveauMot2Passe!"}
    })
    current_password: str
    new_password: str
    