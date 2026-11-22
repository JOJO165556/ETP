"""Logique metier de la configuration ATS (ponderations et seuils)."""
from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.ai.models import AIJobConfig
from src.modules.ai.repository import AIJobConfigRepository, AIProviderConfigRepository
from src.modules.ai.schemas import AIJobConfigResponse, AIJobConfigUpdate


class AIService:
    """Regroupe les operations de configuration de la couche IA."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.providers = AIProviderConfigRepository(db)
        self.configs = AIJobConfigRepository(db)

    async def get_job_config(self, company_id: UUID | str | None) -> AIJobConfigResponse:
        row = await self.configs.resolve(company_id)
        return self._to_response(row, company_id)

    async def upsert_job_config(
        self,
        company_id: UUID | str | None,
        data: AIJobConfigUpdate,
        *,
        modified_by: str | None = None,
    ) -> AIJobConfigResponse:
        if data.provider_id is not None:
            provider = await self.providers.get(data.provider_id)
            if provider is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Fournisseur IA reference introuvable.",
                )

        payload = data.model_dump()
        payload["company_id"] = company_id
        if modified_by is not None:
            payload["modified_by"] = modified_by

        existing = (
            await self.configs.get_for_company(company_id)
            if company_id is not None
            else await self.configs.get_global()
        )

        if existing is None:
            row: AIJobConfig = await self.configs.create(payload)
        else:
            row = await self.configs.update(existing.id, payload)

        await self.db.flush()
        return self._to_response(row, company_id)

    def _to_response(
        self, row: AIJobConfig | None, company_id: UUID | str | None
    ) -> AIJobConfigResponse:
        if row is None:
            defaults = AIJobConfigUpdate()
            return AIJobConfigResponse(
                company_id=company_id,
                provider_id=None,
                weight_skills=defaults.weight_skills,
                weight_experience=defaults.weight_experience,
                weight_education=defaults.weight_education,
                threshold_screening=defaults.threshold_screening,
                threshold_reject=defaults.threshold_reject,
                auto_stage_update=defaults.auto_stage_update,
                semantic_matching=defaults.semantic_matching,
                source="defaults",
            )
        return AIJobConfigResponse.model_validate(row).model_copy(
            update={"source": "company" if row.company_id is not None else "global"}
        )
