from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.security import get_password_hash
from src.modules.users.models import User, UserRole
from src.modules.users.repository import UserRepository
from src.modules.users.schemas import UserCreate, UserAdminCreate

class UserService:
    def __init__(self, db: AsyncSession):
        self.repo = UserRepository(db)

    async def register_user(self, user_in: UserCreate | UserAdminCreate) -> User:
        """
        Inscrit un nouvel utilisateur et hashe son mot de passe.
        Lève une exception 400 si l'email existe déjà.
        """
        # Vérifier si l'utilisateur existe déjà
        existing_user = await self.repo.get_by_email(user_in.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Un utilisateur avec cet email existe déjà."
            )
        
        # Préparer le modèle
        user_data = user_in.model_dump(exclude={"password"})
        user_data["hashed_password"] = get_password_hash(user_in.password)
        
        # Créer l'entité
        # Si c'est un UserAdminCreate on va juste passer company_id,
        # Si UserCreate, pas de company_id
        new_user = await self.repo.create(user_data)
        
        return new_user