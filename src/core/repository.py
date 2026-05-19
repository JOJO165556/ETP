from typing import Generic, TypeVar, Type, Any, Sequence
from uuid import UUID
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.database import Base

# Déclaration d'un TypeVar lié au modèle de base SQLAlchemy
ModelType = TypeVar("ModelType", bound=Base)


class BaseAsyncRepository(Generic[ModelType]):
    def __init__(self, model: Type[ModelType], session: AsyncSession):
        """
        Repository générique asynchrone pour centraliser les requêtes SQL.
        :param model: La classe du modèle SQLAlchemy (ex: Job, Application)
        :param session: La session de base de données asynchrone active
        """
        self.model = model
        self.session = session

    async def get(self, id: UUID | str) -> ModelType | None:
        """Récupère un enregistrement par son UUID, sauf s'il est marqué supprimé (Soft Delete)."""
        query = select(self.model).where(self.model.id == id)
        
        # Sécurité Soft Delete automatique si le mixin est présent
        if hasattr(self.model, "is_deleted"):
            query = query.where(self.model.is_deleted == False)
            
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def list(self, skip: int = 0, limit: int = 100) -> Sequence[ModelType]:
        """Liste les enregistrements avec pagination standard de production"""
        query = select(self.model).offset(skip).limit(limit)
        
        if hasattr(self.model, "is_deleted"):
            query = query.where(self.model.is_deleted == False)
            
        result = await self.session.execute(query)
        return result.scalars().all()

    async def create(self, data: dict[str, Any]) -> ModelType:
        """Instancie et persiste une nouvelle entité en base de données"""
        db_obj = self.model(**data)
        self.session.add(db_obj)
        await self.session.flush()  # Récupère l'UUID généré par Postgres sans commit global
        return db_obj

    async def update(self, id: UUID | str, data: dict[str, Any]) -> ModelType | None:
        """Met à jour dynamiquement un enregistrement via un dictionnaire de modifications."""
        if hasattr(self.model, "updated_at"):
            # L'AuditMixin mettra automatiquement à jour le timestamp au commit
            pass
            
        query = (
            update(self.model)
            .where(self.model.id == id)
            .values(**data)
            .execution_options(synchronize_session="fetch")
        )
        await self.session.execute(query)
        return await self.get(id)

    async def soft_delete(self, id: UUID | str) -> bool:
        """Désactive logiquement un enregistrement (Audit/Sécurité d'entreprise)"""
        if hasattr(self.model, "is_deleted"):
            query = (
                update(self.model)
                .where(self.model.id == id)
                .values(is_deleted=True)
            )
            await self.session.execute(query)
            return True
        return False