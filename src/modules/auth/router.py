from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from src.core.config import settings
from src.core.database import get_db
from src.modules.auth.schemas import Token
from src.modules.auth.dependencies import get_current_user
from src.modules.auth.services import AuthService

router = APIRouter(prefix="/auth", tags=["Authentification"])


@router.post("/login", response_model=Token, summary="Se connecter (Obtenir un Token)")
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
) -> Token:
    """Endpoint d'authentification pour échanger des identifiants contre un JWT"""
    service = AuthService(db)
    return await service.authenticate_user(form_data)


__all__ = ["get_current_user"]
