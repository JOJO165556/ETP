from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from src.core.config import settings
from src.core.database import get_db
from src.modules.auth.schemas import Token, RegisterRequest, RefreshTokenRequest, ChangePasswordRequest
from src.modules.auth.dependencies import get_current_user
from src.modules.auth.services import AuthService
from src.modules.users.models import User

router = APIRouter(prefix="/auth", tags=["Authentification"])


@router.post("/login", response_model=Token, summary="Se connecter")
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
) -> Token:
    service = AuthService(db)
    return await service.authenticate_user(form_data)


@router.post("/register", response_model=Token, summary="Créer un compte")
async def register(
    body: RegisterRequest,
    db: AsyncSession = Depends(get_db)
) -> Token:
    service = AuthService(db)
    return await service.register(body)


@router.post("/refresh", response_model=Token, summary="Rafraîchir les tokens")
async def refresh_token(
    body: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db)
) -> Token:
    service = AuthService(db)
    return await service.refresh_access_token(body.refresh_token)


@router.post("/change-password", summary="Changer de mot de passe")
async def change_password(
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = AuthService(db)
    return await service.change_password(str(current_user.id), body)


@router.get("/me", summary="Profil de l'utilisateur connecté")
async def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "role": current_user.role.value,
        "is_active": current_user.is_active,
    }


__all__ = ["get_current_user"]
