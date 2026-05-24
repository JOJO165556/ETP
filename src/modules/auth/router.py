from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from src.core.config import settings
from src.core.database import get_db
from src.core.security import verify_password, create_access_token
from src.modules.auth.schemas import Token
from src.modules.auth.dependencies import get_current_user
from src.modules.users.models import User

router = APIRouter(prefix="/auth", tags=["Authentification"])


@router.post("/login", response_model=Token, summary="Se connecter (Obtenir un Token)")
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
) -> Token:
    """Endpoint d'authentification pour échanger des identifiants contre un JWT"""
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalars().first()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ce compte utilisateur a été désactivé"
        )
        
    access_token = create_access_token(subject=str(user.id))
    return Token(access_token=access_token, token_type="bearer")


__all__ = ["get_current_user"]
