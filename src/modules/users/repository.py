from sqlalchemy import update, select
from src.core.repository import BaseAsyncRepository
from src.modules.users.models import Profile, User

class UserProfileRepository(BaseAsyncRepository[Profile]):
    def __init__(self, session):
        # Initialisation de la classe parente avec le modèle Profile et la session
        super().__init__(Profile, session)

    async def get_by_user_id(self, user_id: str) -> Profile | None:
        """
        Récupère le profil d'un utilisateur par son user_id
        """
        query = select(self.model).where(self.model.user_id == user_id)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def update_by_user_id(self, user_id: str, data: dict) -> Profile | None:
        """Met à jour le profil via le user_id"""
        query = (
            update(self.model)
            .where(self.model.user_id == user_id)
            .values(**data)
            .execution_options(synchronize_session="fetch")
        )
        await self.session.execute(query)
        await self.session.flush()
        return await self.get_by_user_id(user_id)

    async def update_cv_key(self, user_id: str, cv_key: str) -> Profile | None:
        """
        Met à jour ou ajoute la clé de stockage du CV pour un utilisateur spécifique
        """
        query = (
            update(self.model)
            .where(self.model.user_id == user_id)
            .values(cv_key=cv_key)
            .returning(self.model)
        )
        result = await self.session.execute(query)
        await self.session.commit()
        return result.scalar_one_or_none()

class UserRepository(BaseAsyncRepository[User]):
    def __init__(self, session):
        super().__init__(User, session)

    async def get_by_email(self, email: str) -> User | None:
        query = select(self.model).where(self.model.email == email)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def create(self, data: dict) -> User:
        user = User(**data)
        self.session.add(user)
        await self.session.flush()
        
        # Création automatique du profil
        profile = Profile(user_id=user.id)
        self.session.add(profile)
        await self.session.flush()
        
        return user