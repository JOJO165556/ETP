from fastapi import HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.security import verify_password, create_access_token
from src.modules.auth.schemas import Token
from src.modules.users.repository import UserRepository


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)

    async def authenticate_user(self, form_data: OAuth2PasswordRequestForm) -> Token:
        """
        Vérifie les identifiants de l'utilisateur et génère un JWT s'ils sont valides.
        """
        user = await self.user_repo.get_by_email(form_data.username)
        
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
