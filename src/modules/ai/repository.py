"""Acces base de donnees de la couche IA."""
from __future__ import annotations

from typing import Sequence
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.repository import BaseAsyncRepository
from src.modules.ai.models import AIAuditLog, AIJobConfig, AIProviderConfig


class AIProviderConfigRepository(BaseAsyncRepository[AIProviderConfig]):
    def __init__(self, session: AsyncSession):
        super().__init__(AIProviderConfig, session)

    async def get_by_name(self, name: str) -> AIProviderConfig | None:
        query = select(self.model).where(self.model.name == name)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def list_active(
        self,
        *,
        supports: str | None = None,
    ) -> Sequence[AIProviderConfig]:
        """Fournisseurs actifs, fournisseur par defaut en tete.

        ``supports`` vaut ``"extraction"`` ou ``"matching"`` : seuls les
        fournisseurs compatibles avec la tache sont retournes.
        """
        query = select(self.model).where(self.model.is_active.is_(True))

        if supports == "extraction":
            query = query.where(self.model.supports_extraction.is_(True))
        elif supports == "matching":
            query = query.where(self.model.supports_matching.is_(True))

        query = query.order_by(self.model.is_default.desc(), self.model.name)
        result = await self.session.execute(query)
        return result.scalars().all()

    async def get_default(self) -> AIProviderConfig | None:
        query = (
            select(self.model)
            .where(
                self.model.is_active.is_(True),
                self.model.is_default.is_(True),
            )
            .limit(1)
        )
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def clear_default(self, *, except_id: UUID | str | None = None) -> None:
        """Retire le statut par defaut des autres fournisseurs (unicite)."""
        query = update(self.model).where(self.model.is_default.is_(True))
        if except_id is not None:
            query = query.where(self.model.id != except_id)
        await self.session.execute(
            query.values(is_default=False).execution_options(synchronize_session="fetch")
        )


class AIJobConfigRepository(BaseAsyncRepository[AIJobConfig]):
    def __init__(self, session: AsyncSession):
        super().__init__(AIJobConfig, session)

    async def get_for_company(self, company_id: UUID | str) -> AIJobConfig | None:
        query = (
            select(self.model)
            .where(self.model.company_id == company_id)
            .order_by(self.model.created_at)
            .limit(1)
        )
        result = await self.session.execute(query)
        return result.scalars().first()

    async def get_global(self) -> AIJobConfig | None:
        query = (
            select(self.model)
            .where(self.model.company_id.is_(None))
            .order_by(self.model.created_at)
            .limit(1)
        )
        result = await self.session.execute(query)
        return result.scalars().first()

    async def resolve(self, company_id: UUID | str | None) -> AIJobConfig | None:
        """Configuration de l'entreprise si elle existe, sinon la globale."""
        if company_id is not None:
            scoped = await self.get_for_company(company_id)
            if scoped is not None:
                return scoped
        return await self.get_global()


class AIAuditLogRepository(BaseAsyncRepository[AIAuditLog]):
    def __init__(self, session: AsyncSession):
        super().__init__(AIAuditLog, session)

    async def list_recent(
        self,
        *,
        company_id: UUID | str | None = None,
        limit: int = 100,
    ) -> Sequence[AIAuditLog]:
        query = select(self.model).order_by(self.model.created_at.desc())
        if company_id is not None:
            query = query.where(self.model.company_id == company_id)
        query = query.limit(max(1, min(limit, 500)))
        result = await self.session.execute(query)
        return result.scalars().all()
