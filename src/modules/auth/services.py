from fastapi import HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.security import (
    verify_password, get_password_hash,
    create_access_token, create_refresh_token,
)
from src.modules.auth.schemas import Token, RegisterRequest, ChangePasswordRequest
from src.modules.users.repository import UserRepository


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)

    async def authenticate_user(self, form_data: OAuth2PasswordRequestForm) -> Token:
        """Vérifie les identifiants et génère un JWT + refresh token."""
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
        refresh_token = create_refresh_token(subject=str(user.id))
        return Token(access_token=access_token, refresh_token=refresh_token)

    async def refresh_access_token(self, refresh_token: str) -> Token:
        """Valide un refresh token et génère de nouveaux tokens."""
        from jose import jwt, JWTError
        from src.core.config import settings
        from src.core.security import ALGORITHM

        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token invalide ou expiré",
        )

        try:
            payload = jwt.decode(refresh_token, settings.SECRET_KEY, algorithms=[ALGORITHM])
            user_id: str | None = payload.get("sub")
            token_type: str | None = payload.get("type")
            if user_id is None or token_type != "refresh":
                raise credentials_exception
        except JWTError:
            raise credentials_exception

        user = await self.user_repo.get_by_email("")  # dummy
        # Récupérer l'utilisateur par ID
        from sqlalchemy import select
        from src.modules.users.models import User
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalars().first()
        
        if user is None or not user.is_active:
            raise credentials_exception

        new_access = create_access_token(subject=str(user.id))
        new_refresh = create_refresh_token(subject=str(user.id))
        return Token(access_token=new_access, refresh_token=new_refresh)

    async def register(self, data: RegisterRequest) -> Token:
        """Inscrit un nouvel utilisateur et retourne les tokens."""
        existing = await self.user_repo.get_by_email(data.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Un compte avec cet email existe déjà"
            )

        user = await self.user_repo.create({
            "email": data.email,
            "hashed_password": get_password_hash(data.password),
        })

        # Mettre à jour le profil si fourni
        if data.first_name or data.last_name:
            from src.modules.users.repository import UserProfileRepository
            profile_repo = UserProfileRepository(self.db)
            await profile_repo.update_by_user_id(str(user.id), {
                "first_name": data.first_name,
                "last_name": data.last_name,
            })

        access_token = create_access_token(subject=str(user.id))
        refresh_token = create_refresh_token(subject=str(user.id))
        return Token(access_token=access_token, refresh_token=refresh_token)

    async def change_password(self, user_id: str, data: ChangePasswordRequest) -> dict:
        """Change le mot de passe d'un utilisateur."""
        from sqlalchemy import select
        from src.modules.users.models import User
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalars().first()

        if not user or not verify_password(data.current_password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mot de passe actuel incorrect"
            )

        user.hashed_password = get_password_hash(data.new_password)
        await self.db.flush()
        return {"message": "Mot de passe modifié avec succès"}
