"""Logique metier de la couche IA : configuration, test de fournisseurs, audit."""
from __future__ import annotations

import logging
import time
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.ai.models import (
    AIAuditLog,
    AIAuditStatus,
    AIJobConfig,
    AIProviderConfig,
    AITaskType,
)
from src.modules.ai.providers.base import (
    DEFAULT_MODELS,
    AIProviderError,
    ProviderRuntime,
    resolve_api_key,
)
from src.modules.ai.providers.orchestrator import PROVIDER_REGISTRY, AIOrchestrator
from src.modules.ai.repository import (
    AIAuditLogRepository,
    AIJobConfigRepository,
    AIProviderConfigRepository,
)
from src.modules.ai.schemas import (
    AIJobConfigResponse,
    AIJobConfigUpdate,
    AIProviderConfigCreate,
    AIProviderConfigUpdate,
    ExtractionPreviewResponse,
    ProviderTestResponse,
)

logger = logging.getLogger(__name__)


class AIService:
    """Regroupe les operations d'administration et de diagnostic de la couche IA."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.providers = AIProviderConfigRepository(db)
        self.configs = AIJobConfigRepository(db)
        self.audits = AIAuditLogRepository(db)

    async def list_providers(self) -> list[AIProviderConfig]:
        return list(await self.providers.list_active())

    async def get_provider(self, provider_id: UUID | str) -> AIProviderConfig:
        provider = await self.providers.get(provider_id)
        if provider is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Fournisseur IA introuvable.",
            )
        return provider

    async def create_provider(
        self,
        data: AIProviderConfigCreate,
        *,
        modified_by: str | None = None,
    ) -> AIProviderConfig:
        if data.provider.value not in PROVIDER_REGISTRY:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Fournisseur non supporte : {data.provider.value}.",
            )
        if await self.providers.get_by_name(data.name) is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Un fournisseur portant ce nom existe deja.",
            )

        payload = data.model_dump()
        payload["provider"] = data.provider.value
        payload["modified_by"] = modified_by

        if data.is_default:
            await self.providers.clear_default()

        provider = await self.providers.create(payload)
        await self.db.flush()
        return provider

    async def update_provider(
        self,
        provider_id: UUID | str,
        data: AIProviderConfigUpdate,
        *,
        modified_by: str | None = None,
    ) -> AIProviderConfig:
        provider = await self.get_provider(provider_id)

        payload = data.model_dump(exclude_unset=True)
        if "provider" in payload and payload["provider"] is not None:
            payload["provider"] = data.provider.value
        if payload.get("is_default"):
            await self.providers.clear_default(except_id=provider.id)
        if modified_by is not None:
            payload["modified_by"] = modified_by

        updated = await self.providers.update(provider.id, payload)
        await self.db.flush()
        if updated is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Fournisseur IA introuvable.",
            )
        return updated

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

    async def list_audit_logs(
        self,
        *,
        company_id: UUID | str | None = None,
        limit: int = 100,
    ) -> list[AIAuditLog]:
        return list(await self.audits.list_recent(company_id=company_id, limit=limit))

    async def test_provider(
        self, provider_id: UUID | str, sample_text: str
    ) -> ProviderTestResponse:
        """Test unitaire d'un fournisseur : appel reel, latence et erreur remontees."""
        row = await self.get_provider(provider_id)
        provider_cls = PROVIDER_REGISTRY.get(row.provider)
        if provider_cls is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Fournisseur non supporte : {row.provider}.",
            )

        runtime = ProviderRuntime(
            name=row.name,
            provider=row.provider,
            model_id=row.model_id
            or DEFAULT_MODELS.get(row.provider, ""),
            api_key=resolve_api_key(row.api_key_ref),
            params=dict(row.model_params or {}),
        )
        provider = provider_cls(runtime)

        started = time.perf_counter()
        extraction = None
        error: str | None = None
        try:
            extraction = await provider.extract_cv(sample_text)
        except (AIProviderError, ValueError) as exc:
            error = str(exc)
        latency_ms = int((time.perf_counter() - started) * 1000)

        self.db.add(
            AIAuditLog(
                provider=row.provider,
                model_id=provider.model_id,
                task_type=AITaskType.EXTRACTION.value,
                latency_ms=latency_ms,
                status=(
                    AIAuditStatus.SUCCESS if error is None else AIAuditStatus.ERROR
                ),
                error_message=" ".join(error.split())[:500] if error else None,
            )
        )
        await self.db.flush()

        return ProviderTestResponse(
            provider=row.provider,
            model_id=provider.model_id,
            latency_ms=latency_ms,
            success=error is None,
            extraction=extraction,
            error=error,
        )

    async def preview_extraction(
        self, cv_text: str, company_id: UUID | str | None = None
    ) -> ExtractionPreviewResponse:
        """Execute le pipeline d'extraction complet (avec repli) sans persister de CV."""
        orchestrator = AIOrchestrator(self.db)
        extraction, provider, fallback_used, _, _ = await orchestrator.extract_cv_detailed(
            cv_text, company_id
        )
        await self.db.flush()
        return ExtractionPreviewResponse(
            extraction=extraction,
            provider_used=provider,
            fallback_used=fallback_used,
        )
