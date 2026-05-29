from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.security import get_password_hash
from src.modules.users.models import User, UserRole
from src.modules.users.repository import UserRepository
from src.modules.users.schemas import UserCreate, UserAdminCreate, UserUpdate, UserMeUpdate
from src.modules.users.repository import UserProfileRepository

class UserService:
    def __init__(self, db: AsyncSession):
        self.repo = UserRepository(db)
        self.profile_repo = UserProfileRepository(db)

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

    async def update_user(self, user_id: str, user_in: UserUpdate) -> User:
        """Mise à jour d'un utilisateur (Admin)"""
        user = await self.repo.get(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur introuvable.")
        
        update_data = user_in.model_dump(exclude_unset=True)
        if "email" in update_data:
            existing = await self.repo.get_by_email(update_data["email"])
            if existing and str(existing.id) != user_id:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email déjà utilisé.")
                
        updated_user = await self.repo.update(user_id, update_data)
        return updated_user

    async def update_me(self, user_id: str, data_in: UserMeUpdate) -> User:
        """Mise à jour de son propre profil"""
        user = await self.repo.get(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur introuvable.")
            
        update_data = data_in.model_dump(exclude_unset=True)
        
        # Gestion du profil
        if "profile" in update_data:
            profile_data = update_data.pop("profile")
            await self.profile_repo.update_by_user_id(user_id, profile_data)
            
        # Gestion du mot de passe
        if "password" in update_data:
            password = update_data.pop("password")
            update_data["hashed_password"] = get_password_hash(password)
            
        # Gestion email existant
        if "email" in update_data:
            existing = await self.repo.get_by_email(update_data["email"])
            if existing and str(existing.id) != user_id:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email déjà utilisé.")
                
        if update_data:
            updated_user = await self.repo.update(user_id, update_data)
        else:
            updated_user = await self.repo.get(user_id)
            
        return updated_user

    async def soft_delete_user(self, user_id: str):
        """Désactivation logique d'un compte"""
        user = await self.repo.get(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur introuvable.")
        
        success = await self.repo.soft_delete(user_id)
        if not success:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Erreur lors de la suppression.")
        return {"detail": "Utilisateur désactivé avec succès."}