"""Orchestrateur IA : selection du fournisseur, repli automatique et audit.

Tout echec est journalise puis le fournisseur suivant prend le relais ; le
parser deterministe garantit un resultat en dernier recours.
"""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from typing import Any, Awaitable, Callable, Sequence, TypeVar
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.modules.ai.models import (
    AIAuditLog,
    AIAuditStatus,
    AIProviderConfig,
    AITaskType,
)
from src.modules.ai.providers.base import (
    DEFAULT_MODELS,
    AIProviderError,
    BaseAIProvider,
    ProviderRuntime,
    resolve_api_key,
)
from src.modules.ai.providers.fallback import DeterministicProvider
from src.modules.ai.providers.gemini import GeminiProvider
from src.modules.ai.providers.huggingface import HuggingFaceProvider
from src.modules.ai.repository import AIJobConfigRepository, AIProviderConfigRepository
from src.modules.ai.schemas import (
    CVExtractionResult,
    MatchResult,
    MatchingWeights,
    ResolvedJobConfig,
)

logger = logging.getLogger(__name__)

PROVIDER_REGISTRY: dict[str, type[BaseAIProvider]] = {
    "huggingface": HuggingFaceProvider,
    "gemini": GeminiProvider,
}

DETERMINISTIC_PROVIDER = "deterministic"

_ENV_PROVIDER_ORDER = ("huggingface", "gemini")

T = TypeVar("T")


@dataclass
class ProviderAttempt:
    """Trace d'une tentative d'appel (utilisee pour l'audit et les tests)."""

    provider: str
    model_id: str | None
    status: str
    latency_ms: int
    error: str | None = None


@dataclass
class ExtractionMatchOutcome:
    """Resultat complet d'un pipeline extraction + matching."""

    extraction: CVExtractionResult
    matching: MatchResult
    config: ResolvedJobConfig
    provider: str
    model_id: str | None
    fallback_used: bool
    latency_ms: int
    recommended_stage: str
    apply_stage: bool
    review_required: bool

    def to_parsed_data(self) -> dict[str, Any]:
        """Vue serialisable stockee dans ``applications.parsed_data``.

        Les cles historiques sont conservees pour la compatibilite frontend.
        """
        skill_weight = float(self.config.weights.skills) * 100
        skill_details = {
            skill: {"matched": True, "weight": skill_weight}
            for skill in self.matching.matched_skills
        }
        skill_details.update({
            skill: {"matched": False, "weight": skill_weight}
            for skill in self.matching.missing_skills
        })

        return {
            "extracted_skills": self.extraction.skills,
            "experience_level": self.extraction.experience_level,
            "education_level": self.extraction.education_level,
            "years_experience": self.extraction.years_experience,
            "ai_confidence": self.extraction.confidence,
            "extraction_method": self.extraction.extraction_method,
            "matching_score": self.matching.overall_score,
            "skill_match_details": skill_details,
            "experience_match": self.matching.experience_score,
            "education_match": self.matching.education_score,
            "recommended_stage": self.recommended_stage,
            "job_skills_required": (
                self.matching.matched_skills + self.matching.missing_skills
            ),
            "candidate_skills_found": self.extraction.skills,
            "matched_skills": self.matching.matched_skills,
            "missing_skills": self.matching.missing_skills,
            "match_justification": self.matching.justification,
            "ai_provider": self.provider,
            "ai_model_id": self.model_id,
            "ai_fallback_used": self.fallback_used,
            "ai_latency_ms": self.latency_ms,
            "config_source": self.config.source,
            "threshold_screening": float(self.config.threshold_screening),
            "threshold_reject": float(self.config.threshold_reject),
            "auto_stage_update": self.config.auto_stage_update,
            "review_required": self.review_required,
        }


def resolve_stage(
    score: float, config: ResolvedJobConfig
) -> tuple[str, bool, bool]:
    """Retourne (etape recommandee, application automatique, revue manuelle)."""
    if score >= float(config.threshold_screening):
        return "screening", bool(config.auto_stage_update), False
    if score <= float(config.threshold_reject):
        return "rejected", bool(config.auto_stage_update), not config.auto_stage_update
    return "applied", False, False


class AIOrchestrator:
    """Point d'entree unique de la couche IA."""

    def __init__(
        self,
        session: AsyncSession | None = None,
        *,
        providers: Sequence[BaseAIProvider] | None = None,
        job_config: ResolvedJobConfig | None = None,
    ):
        self.session = session
        self._providers_override = list(providers) if providers is not None else None
        self._job_config_override = job_config
        self.attempts: list[ProviderAttempt] = []

    async def resolve_config(self, company_id: UUID | str | None = None) -> ResolvedJobConfig:
        """Configuration ATS effective : entreprise, globale, puis defauts."""
        if self._job_config_override is not None:
            return self._job_config_override
        if self.session is None:
            return ResolvedJobConfig()

        try:
            row = await AIJobConfigRepository(self.session).resolve(company_id)
        except Exception as exc:
            logger.warning("Configuration IA illisible, valeurs par defaut appliquees: %s", exc)
            return ResolvedJobConfig()

        if row is None:
            return ResolvedJobConfig()

        return ResolvedJobConfig(
            weights=MatchingWeights(
                skills=row.weight_skills,
                experience=row.weight_experience,
                education=row.weight_education,
            ),
            threshold_screening=row.threshold_screening,
            threshold_reject=row.threshold_reject,
            auto_stage_update=row.auto_stage_update,
            semantic_matching=row.semantic_matching,
            provider_id=row.provider_id,
            company_id=row.company_id,
            source="company" if row.company_id is not None else "global",
        )

    def _runtime_from_row(self, row: AIProviderConfig) -> ProviderRuntime:
        return ProviderRuntime(
            name=row.name,
            provider=row.provider,
            model_id=row.model_id or DEFAULT_MODELS.get(row.provider, ""),
            api_key=resolve_api_key(row.api_key_ref),
            params=dict(row.model_params or {}),
        )

    def _env_runtimes(self) -> list[ProviderRuntime]:
        """Fournisseurs deduits des variables d'environnement (base vide)."""
        sources = {
            "huggingface": ("HF_API_KEY", "HF_MODEL"),
            "gemini": ("GEMINI_API_KEY", "GEMINI_MODEL"),
        }
        runtimes: list[ProviderRuntime] = []
        for provider in _ENV_PROVIDER_ORDER:
            key_ref, model_setting = sources[provider]
            api_key = resolve_api_key(key_ref)
            if not api_key:
                continue
            runtimes.append(
                ProviderRuntime(
                    name=f"env_{provider}",
                    provider=provider,
                    model_id=getattr(settings, model_setting, None)
                    or DEFAULT_MODELS[provider],
                    api_key=api_key,
                    params={},
                )
            )
        return runtimes

    async def _provider_runtimes(
        self, task_type: str, config: ResolvedJobConfig
    ) -> list[ProviderRuntime]:
        """Chaine de fournisseurs ordonnee pour une tache donnee."""
        if self._providers_override is not None:
            return [
                ProviderRuntime(
                    name=provider.runtime.name,
                    provider=provider.runtime.provider,
                    model_id=provider.model_id,
                    api_key=provider.runtime.api_key,
                    params=provider.runtime.params,
                )
                for provider in self._providers_override
            ]

        if self.session is None:
            return self._env_runtimes()

        try:
            rows = await AIProviderConfigRepository(self.session).list_active(
                supports=task_type
            )
        except Exception as exc:
            logger.warning(
                "Fournisseurs IA illisibles en base, repli sur l'environnement: %s", exc
            )
            return self._env_runtimes()

        resolved: list[tuple[AIProviderConfig, ProviderRuntime]] = []
        for row in rows:
            runtime = self._runtime_from_row(row)
            if runtime.api_key is None:
                logger.warning(
                    "Fournisseur '%s' ignore : variable '%s' absente.",
                    row.name,
                    row.api_key_ref,
                )
                continue
            resolved.append((row, runtime))

        if not resolved:
            return self._env_runtimes()

        if config.provider_id is not None:
            preferred_id = str(config.provider_id)
            resolved.sort(key=lambda pair: str(pair[0].id) != preferred_id)

        return [runtime for _, runtime in resolved]

    def _record(
        self,
        *,
        provider: str,
        model_id: str | None,
        task_type: str,
        latency_ms: int,
        status: AIAuditStatus,
        company_id: UUID | str | None,
        error: str | None = None,
    ) -> None:
        """Journalise une tentative (sans PII, message tronque)."""
        safe_error = " ".join(error.split())[:500] if error else None
        attempt = ProviderAttempt(
            provider=provider,
            model_id=model_id,
            status=status.value,
            latency_ms=latency_ms,
            error=safe_error,
        )
        self.attempts.append(attempt)

        if self.session is None:
            return

        try:
            self.session.add(
                AIAuditLog(
                    company_id=company_id,
                    provider=provider,
                    model_id=model_id,
                    task_type=task_type,
                    latency_ms=latency_ms,
                    status=status,
                    error_message=safe_error,
                )
            )
        except Exception as exc:
            logger.warning("Impossible de journaliser l'audit IA: %s", exc)

    def _instantiate(self, runtime: ProviderRuntime) -> BaseAIProvider | None:
        provider_cls = PROVIDER_REGISTRY.get(runtime.provider)
        if provider_cls is None:
            return None
        return provider_cls(runtime)

    async def _execute(
        self,
        *,
        task_type: str,
        company_id: UUID | str | None,
        operation: Callable[[BaseAIProvider], Awaitable[T]],
        preferred_provider: str | None = None,
    ) -> tuple[T, BaseAIProvider | None, bool, int]:
        """Execute ``operation`` avec repli successif. Ne leve jamais si possible."""
        config = await self.resolve_config(company_id)
        runtimes = await self._provider_runtimes(task_type, config)

        if self._providers_override is not None:
            instances = list(self._providers_override)
        else:
            if preferred_provider:
                runtimes = sorted(
                    runtimes,
                    key=lambda runtime: runtime.provider != preferred_provider,
                )
            instances = []
            for runtime in runtimes:
                provider = self._instantiate(runtime)
                if provider is None:
                    self._record(
                        provider=runtime.provider,
                        model_id=runtime.model_id,
                        task_type=task_type,
                        latency_ms=0,
                        status=AIAuditStatus.ERROR,
                        company_id=company_id,
                        error=f"Fournisseur inconnu: {runtime.provider}",
                    )
                    continue
                instances.append(provider)

        fallback_used = False
        last_error: Exception | None = None

        for provider in instances:
            started = time.perf_counter()
            try:
                result = await operation(provider)
            except Exception as exc:
                latency_ms = int((time.perf_counter() - started) * 1000)
                last_error = exc
                fallback_used = True
                self._record(
                    provider=provider.runtime.provider,
                    model_id=provider.model_id,
                    task_type=task_type,
                    latency_ms=latency_ms,
                    status=AIAuditStatus.FALLBACK,
                    company_id=company_id,
                    error=str(exc),
                )
                logger.warning(
                    "Fournisseur IA '%s' en echec (%s), repli suivant.",
                    provider.runtime.name,
                    exc,
                )
                continue

            latency_ms = int((time.perf_counter() - started) * 1000)
            self._record(
                provider=provider.runtime.provider,
                model_id=provider.model_id,
                task_type=task_type,
                latency_ms=latency_ms,
                status=AIAuditStatus.SUCCESS,
                company_id=company_id,
            )
            return result, provider, fallback_used, latency_ms

        deterministic = DeterministicProvider(
            ProviderRuntime(
                name=DETERMINISTIC_PROVIDER,
                provider=DETERMINISTIC_PROVIDER,
                model_id="heuristics",
            )
        )
        started = time.perf_counter()
        try:
            result = await operation(deterministic)
        except Exception as exc:
            latency_ms = int((time.perf_counter() - started) * 1000)
            self._record(
                provider=DETERMINISTIC_PROVIDER,
                model_id="heuristics",
                task_type=task_type,
                latency_ms=latency_ms,
                status=AIAuditStatus.ERROR,
                company_id=company_id,
                error=str(exc),
            )
            raise AIProviderError(
                "Aucun fournisseur IA n'a pu traiter la demande."
            ) from (last_error or exc)

        latency_ms = int((time.perf_counter() - started) * 1000)
        self._record(
            provider=DETERMINISTIC_PROVIDER,
            model_id="heuristics",
            task_type=task_type,
            latency_ms=latency_ms,
            status=AIAuditStatus.FALLBACK,
            company_id=company_id,
            error=str(last_error) if last_error else "Aucun fournisseur LLM configure.",
        )
        return result, deterministic, True, latency_ms

    async def extract_cv(
        self, cv_text: str, company_id: UUID | str | None = None
    ) -> CVExtractionResult:
        """Extrait un CV avec repli automatique entre fournisseurs."""
        result, _, _, _, _ = await self.extract_cv_detailed(cv_text, company_id)
        return result

    async def extract_cv_detailed(
        self, cv_text: str, company_id: UUID | str | None = None
    ) -> tuple[CVExtractionResult, str, bool, int, str | None]:
        """Variante de ``extract_cv`` exposant le fournisseur retenu."""
        result, provider, fallback_used, latency_ms = await self._execute(
            task_type=AITaskType.EXTRACTION.value,
            company_id=company_id,
            operation=lambda p: p.extract_cv(cv_text),
        )
        return (
            result,
            provider.runtime.provider if provider else DETERMINISTIC_PROVIDER,
            fallback_used,
            latency_ms,
            provider.model_id if provider else None,
        )

    async def match_candidate_job(
        self,
        candidate_data: dict[str, Any],
        job_data: dict[str, Any],
        company_id: UUID | str | None = None,
        *,
        weights: dict[str, float] | None = None,
        preferred_provider: str | None = None,
    ) -> MatchResult:
        """Calcule le score de correspondance avec repli automatique."""
        if weights is None:
            config = await self.resolve_config(company_id)
            weights = config.weights.as_dict()

        result, _, _, _ = await self._execute(
            task_type=AITaskType.MATCHING.value,
            company_id=company_id,
            operation=lambda p: p.match_candidate_job(
                candidate_data, job_data, weights
            ),
            preferred_provider=preferred_provider,
        )
        return result

    async def extract_and_match(
        self,
        cv_text: str,
        job_data: dict[str, Any],
        company_id: UUID | str | None = None,
    ) -> ExtractionMatchOutcome:
        """Pipeline complet utilise par la tache Celery ``parse_resume``."""
        config = await self.resolve_config(company_id)

        extraction, provider, fallback_used, extraction_latency, model_id = (
            await self.extract_cv_detailed(cv_text, company_id)
        )

        matching = await self.match_candidate_job(
            extraction.model_dump(),
            job_data,
            company_id,
            weights=config.weights.as_dict(),
            preferred_provider=provider if provider != DETERMINISTIC_PROVIDER else None,
        )

        recommended_stage, apply_stage, review_required = resolve_stage(
            matching.overall_score, config
        )
        matching.recommended_stage = recommended_stage

        return ExtractionMatchOutcome(
            extraction=extraction,
            matching=matching,
            config=config,
            provider=provider,
            model_id=model_id,
            fallback_used=fallback_used,
            latency_ms=extraction_latency,
            recommended_stage=recommended_stage,
            apply_stage=apply_stage,
            review_required=review_required,
        )
