from sqlalchemy import select
from src.core.repository import BaseAsyncRepository
from src.modules.users.models import User

class UserRepository(BaseAsyncRepository[User]):
    def __init__(self, session):
        super().__init__(User, session)

    async def get_by_email(self, email: str) -> User | None:
        """Trouver un utilisateur pour login"""
        query = select(self.model).where(self.model.email == email)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()