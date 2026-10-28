"""Fournisseur Hugging Face (Inference Providers, API compatible OpenAI)."""
from __future__ import annotations

import logging
from typing import Any

from src.core.config import settings
from src.modules.ai.providers.base import (
    DEFAULT_MODELS,
    EXTRACTION_SYSTEM_PROMPT,
    MATCHING_SYSTEM_PROMPT,
    AIProviderResponseError,
    BaseAIProvider,
    build_extraction_prompt,
    build_match_result,
    build_matching_prompt,
    extract_json_object,
)
from src.modules.ai.schemas import CVExtractionResult, MatchResult

logger = logging.getLogger(__name__)


class HuggingFaceProvider(BaseAIProvider):
    """Appelle l'API Serverless Hugging Face (Mistral / Llama)."""

    provider_name = "huggingface"

    def __init__(self, runtime):
        super().__init__(runtime)
        self.model_id = (
            runtime.model_id
            or getattr(settings, "HF_MODEL", None)
            or DEFAULT_MODELS["huggingface"]
        )

    @property
    def _endpoint(self) -> str:
        base = str(
            getattr(settings, "HF_API_BASE", "https://router.huggingface.co/v1")
        ).rstrip("/")
        return f"{base}/chat/completions"

    async def _chat(self, system_prompt: str, user_prompt: str) -> dict[str, Any]:
        """Appel chat/completions avec sortie JSON imposee."""
        payload: dict[str, Any] = {
            "model": self.model_id,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": self.runtime.temperature,
            "max_tokens": self.runtime.max_tokens,
            "response_format": {"type": "json_object"},
        }

        data = await self.post_json(
            self._endpoint,
            payload=payload,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
        )

        try:
            content = data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            raise AIProviderResponseError(
                "Structure de reponse Hugging Face inattendue."
            ) from exc

        if isinstance(content, list):
            # Certains modeles renvoient un contenu multi-blocs.
            content = "".join(
                part.get("text", "") for part in content if isinstance(part, dict)
            )
        return extract_json_object(str(content))

    async def extract_cv(self, cv_text: str) -> CVExtractionResult:
        payload = await self._chat(
            EXTRACTION_SYSTEM_PROMPT, build_extraction_prompt(cv_text)
        )
        result = CVExtractionResult.model_validate(payload)
        result.extraction_method = "huggingface"
        return result

    async def match_candidate_job(
        self,
        candidate_data: dict[str, Any],
        job_data: dict[str, Any],
        weights: dict[str, float] | None = None,
    ) -> MatchResult:
        payload = await self._chat(
            MATCHING_SYSTEM_PROMPT,
            build_matching_prompt(candidate_data, job_data, weights),
        )
        return build_match_result(payload, weights, method="huggingface")
