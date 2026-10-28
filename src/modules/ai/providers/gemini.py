"""Fournisseur Google Gemini (Flash) avec sortie structuree via ``responseSchema``."""
from __future__ import annotations

import logging
from typing import Any

from pydantic import BaseModel

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
from src.modules.ai.schemas import CVExtractionResult, MatchLLMOutput, MatchResult

logger = logging.getLogger(__name__)

_TYPE_MAP = {
    "object": "OBJECT",
    "array": "ARRAY",
    "string": "STRING",
    "integer": "INTEGER",
    "number": "NUMBER",
    "boolean": "BOOLEAN",
}

_ALLOWED_FORMATS = {"date", "date-time", "int32", "int64", "float", "double"}


def _resolve_ref(schema: dict[str, Any], defs: dict[str, Any]) -> dict[str, Any]:
    ref = schema.get("$ref")
    if isinstance(ref, str) and ref.startswith("#/$defs/"):
        target = defs.get(ref.rsplit("/", 1)[-1], {})
        return {**target, **{k: v for k, v in schema.items() if k != "$ref"}}
    return schema


def _convert_schema(schema: dict[str, Any], defs: dict[str, Any]) -> dict[str, Any]:
    """Convertit un JSON Schema Pydantic en sous-ensemble accepte par Gemini."""
    schema = _resolve_ref(schema, defs)
    description = schema.get("description")

    # Optional[X] genere anyOf[X, null] : Gemini attend un type unique + nullable.
    for combinator in ("anyOf", "oneOf"):
        if combinator in schema:
            options = [o for o in schema[combinator] if o.get("type") != "null"]
            nullable = len(options) != len(schema[combinator])
            converted = _convert_schema(options[0], defs) if options else {"type": "STRING"}
            if nullable:
                converted["nullable"] = True
            if description and "description" not in converted:
                converted["description"] = description
            return converted

    json_type = schema.get("type")
    result: dict[str, Any] = {}

    if json_type:
        result["type"] = _TYPE_MAP.get(json_type, "STRING")
    if description:
        result["description"] = description
    if "enum" in schema:
        result["enum"] = [str(value) for value in schema["enum"]]
    if schema.get("format") in _ALLOWED_FORMATS:
        result["format"] = schema["format"]

    if json_type == "array" or "items" in schema:
        result.setdefault("type", "ARRAY")
        result["items"] = _convert_schema(schema.get("items", {"type": "string"}), defs)

    if json_type == "object" or "properties" in schema:
        properties = {
            name: _convert_schema(value, defs)
            for name, value in (schema.get("properties") or {}).items()
        }
        result["type"] = "OBJECT"
        result["properties"] = properties
        if schema.get("required"):
            result["required"] = list(schema["required"])
        # Gemini exige un ordre deterministe pour les objets structures.
        result["propertyOrdering"] = list(properties)

    return result


def to_gemini_response_schema(model: type[BaseModel]) -> dict[str, Any]:
    """Construit un ``responseSchema`` Gemini a partir d'un modele Pydantic."""
    json_schema = model.model_json_schema()
    return _convert_schema(json_schema, json_schema.get("$defs", {}))


class GeminiProvider(BaseAIProvider):
    """Appelle l'API Generative Language de Google (modele Flash)."""

    provider_name = "gemini"

    def __init__(self, runtime):
        super().__init__(runtime)
        self.model_id = (
            runtime.model_id
            or getattr(settings, "GEMINI_MODEL", None)
            or DEFAULT_MODELS["gemini"]
        )

    @property
    def _endpoint(self) -> str:
        base = str(
            getattr(
                settings,
                "GEMINI_API_BASE",
                "https://generativelanguage.googleapis.com/v1beta",
            )
        ).rstrip("/")
        return f"{base}/models/{self.model_id}:generateContent"

    async def _generate(self, system_prompt: str, user_prompt: str, schema: dict) -> dict:
        payload = {
            "systemInstruction": {"parts": [{"text": system_prompt}]},
            "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
            "generationConfig": {
                "temperature": self.runtime.temperature,
                "maxOutputTokens": self.runtime.max_tokens,
                "responseMimeType": "application/json",
                "responseSchema": schema,
            },
        }

        data = await self.post_json(
            self._endpoint,
            payload=payload,
            headers={
                "x-goog-api-key": self.api_key,
                "Content-Type": "application/json",
            },
        )

        block_reason = (data.get("promptFeedback") or {}).get("blockReason")
        if block_reason:
            raise AIProviderResponseError(
                f"Contenu bloque par Gemini (raison : {block_reason})."
            )

        try:
            parts = data["candidates"][0]["content"]["parts"]
        except (KeyError, IndexError, TypeError) as exc:
            raise AIProviderResponseError(
                "Structure de reponse Gemini inattendue."
            ) from exc

        text = "".join(
            part.get("text", "") for part in parts if isinstance(part, dict)
        )
        return extract_json_object(text)

    async def extract_cv(self, cv_text: str) -> CVExtractionResult:
        payload = await self._generate(
            EXTRACTION_SYSTEM_PROMPT,
            build_extraction_prompt(cv_text),
            to_gemini_response_schema(CVExtractionResult),
        )
        result = CVExtractionResult.model_validate(payload)
        result.extraction_method = "gemini"
        return result

    async def match_candidate_job(
        self,
        candidate_data: dict[str, Any],
        job_data: dict[str, Any],
        weights: dict[str, float] | None = None,
    ) -> MatchResult:
        payload = await self._generate(
            MATCHING_SYSTEM_PROMPT,
            build_matching_prompt(candidate_data, job_data, weights),
            to_gemini_response_schema(MatchLLMOutput),
        )
        return build_match_result(payload, weights, method="gemini")
