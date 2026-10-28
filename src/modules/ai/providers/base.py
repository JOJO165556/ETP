"""Contrat commun des fournisseurs LLM (pattern Strategy).

Aucune cle API n'est acceptee en clair : les fournisseurs ne recoivent qu'une
reference d'environnement resolue au runtime.
"""
from __future__ import annotations

import json
import logging
import os
import re
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any

import httpx

from src.core.config import settings
from src.modules.ai.schemas import CVExtractionResult, MatchResult, normalize_skill

logger = logging.getLogger(__name__)

DEFAULT_MODELS: dict[str, str] = {
    "huggingface": "mistralai/Mistral-7B-Instruct-v0.3",
    "gemini": "gemini-2.5-flash",
}

DEFAULT_MODEL_PARAMS: dict[str, Any] = {"temperature": 0.1, "max_tokens": 1024}

_ENV_REF_PATTERN = re.compile(r"^[A-Z][A-Z0-9_]*$")

EXTRACTION_SYSTEM_PROMPT = """Tu es un moteur d'extraction d'information specialise dans les CV.
Tu reponds UNIQUEMENT avec un objet JSON valide, sans texte autour, sans balise Markdown.

Schema attendu :
{
  "skills": ["competence normalisee en minuscules", ...],
  "experience_level": "intern|junior|mid|senior|unknown",
  "education_level": "high_school|associate|bachelor|master|phd|unknown",
  "years_experience": 0,
  "confidence": 0.0
}

Regles :
- N'invente rien : si une information est absente, utilise "unknown" ou une liste vide.
- Les competences doivent etre techniques et normalisees (ex: "node.js" et non "NodeJS").
- Ignore les noms, emails, telephones et adresses : ils ne doivent pas apparaitre.
- "confidence" est ta certitude globale entre 0 et 1.
"""

MATCHING_SYSTEM_PROMPT = """Tu es un moteur ATS qui evalue l'adequation entre un candidat et une offre.
Tu reponds UNIQUEMENT avec un objet JSON valide, sans texte autour, sans balise Markdown.

Schema attendu :
{
  "skill_score": 0,
  "experience_score": 0,
  "education_score": 0,
  "matched_skills": ["..."],
  "missing_skills": ["..."],
  "justification": "2 phrases maximum, factuelles, sans donnee personnelle",
  "confidence": 0.0
}

Regles :
- Chaque score est note sur 100.
- "skill_score" mesure la couverture des competences requises par l'offre.
- "experience_score" compare le niveau du candidat a celui attendu par l'offre.
- "education_score" compare le diplome du candidat au niveau attendu.
- "justification" ne doit contenir aucune donnee personnelle (ni nom, ni email).
"""


class AIProviderError(RuntimeError):
    """Echec d'appel a un fournisseur (declenche le repli)."""

    retryable = True


class AIProviderAuthError(AIProviderError):
    """Cle absente, invalide ou refusee."""

    retryable = False


class AIProviderRateLimited(AIProviderError):
    """Quota depasse (HTTP 429)."""


class AIProviderUnavailable(AIProviderError):
    """Erreur serveur ou reseau (HTTP 5xx, connexion impossible)."""


class AIProviderTimeout(AIProviderError):
    """Depassement du delai d'attente."""


class AIProviderResponseError(AIProviderError):
    """Reponse illisible ou non conforme au schema attendu."""

    retryable = False


@dataclass(frozen=True)
class ProviderRuntime:
    """Parametres resolus d'un fournisseur, prets a l'emploi."""

    name: str
    provider: str
    model_id: str
    api_key: str | None = None
    params: dict[str, Any] = field(default_factory=dict)

    @property
    def temperature(self) -> float:
        try:
            return float(self.params.get("temperature", DEFAULT_MODEL_PARAMS["temperature"]))
        except (TypeError, ValueError):
            return DEFAULT_MODEL_PARAMS["temperature"]

    @property
    def max_tokens(self) -> int:
        try:
            return int(self.params.get("max_tokens", DEFAULT_MODEL_PARAMS["max_tokens"]))
        except (TypeError, ValueError):
            return int(DEFAULT_MODEL_PARAMS["max_tokens"])


def resolve_api_key(api_key_ref: str | None) -> str | None:
    """Resout une reference d'environnement en cle API.

    Seul un nom de variable est accepte, pour qu'aucun secret ne soit stocke
    en base.
    """
    if not api_key_ref:
        return None
    if not _ENV_REF_PATTERN.match(api_key_ref):
        logger.warning(
            "Reference de cle API invalide ignoree (attendu : NOM_DE_VARIABLE) : %s",
            api_key_ref[:32],
        )
        return None

    value = getattr(settings, api_key_ref, None) or os.getenv(api_key_ref)
    if value is None:
        return None
    value = str(value).strip()
    return value or None


def clamp(value: float, minimum: float = 0.0, maximum: float = 100.0) -> float:
    return max(minimum, min(maximum, value))


def compute_weighted_score(
    skill_score: float,
    experience_score: float,
    education_score: float,
    weights: dict[str, float] | None = None,
) -> float:
    """Combine les sous-scores : le LLM ne decide jamais du score final."""
    resolved = _normalize_weights(weights)
    total = (
        clamp(skill_score) * resolved["skills"]
        + clamp(experience_score) * resolved["experience"]
        + clamp(education_score) * resolved["education"]
    )
    return round(clamp(total), 2)


def _normalize_weights(weights: dict[str, float] | None) -> dict[str, float]:
    defaults = {"skills": 0.6, "experience": 0.25, "education": 0.15}
    if not weights:
        return defaults

    resolved: dict[str, float] = {}
    for key, default in defaults.items():
        try:
            resolved[key] = max(0.0, float(weights.get(key, default)))
        except (TypeError, ValueError):
            resolved[key] = default

    total = sum(resolved.values())
    if total <= 0:
        return defaults
    return {key: value / total for key, value in resolved.items()}


def extract_json_object(raw_text: str) -> dict[str, Any]:
    """Extrait un objet JSON d'une reponse LLM, meme entouree de texte."""
    if not raw_text:
        raise AIProviderResponseError("Reponse vide du fournisseur.")

    text = raw_text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-zA-Z0-9_-]*\s*", "", text)
        text = re.sub(r"\s*```$", "", text).strip()

    try:
        payload = json.loads(text)
    except json.JSONDecodeError:
        start, end = text.find("{"), text.rfind("}")
        if start == -1 or end <= start:
            raise AIProviderResponseError("Aucun objet JSON dans la reponse du fournisseur.")
        try:
            payload = json.loads(text[start:end + 1])
        except json.JSONDecodeError as exc:
            raise AIProviderResponseError(
                "JSON invalide dans la reponse du fournisseur."
            ) from exc

    if not isinstance(payload, dict):
        raise AIProviderResponseError("La reponse du fournisseur n'est pas un objet JSON.")
    return payload


def build_extraction_prompt(cv_text: str) -> str:
    """Prompt utilisateur d'extraction, texte borne pour maitriser le cout."""
    limit = max(1000, int(getattr(settings, "AI_MAX_CV_CHARS", 12000)))
    return f"Texte du CV :\n{cv_text[:limit]}"


def build_matching_prompt(
    candidate_data: dict[str, Any],
    job_data: dict[str, Any],
    weights: dict[str, float] | None,
) -> str:
    """Prompt utilisateur de matching : donnees structurees, sans PII."""
    resolved = _normalize_weights(weights)
    candidate_summary = {
        "skills": candidate_data.get("skills", []),
        "experience_level": candidate_data.get("experience_level", "unknown"),
        "education_level": candidate_data.get("education_level", "unknown"),
        "years_experience": candidate_data.get("years_experience"),
    }
    job_summary = {
        "title": job_data.get("title", ""),
        "required_skills": job_data.get("required_skills", []),
        "description": str(job_data.get("description", ""))[:4000],
    }
    return (
        "Candidat :\n"
        f"{json.dumps(candidate_summary, ensure_ascii=False)}\n\n"
        "Offre :\n"
        f"{json.dumps(job_summary, ensure_ascii=False)}\n\n"
        "Ponderations appliquees par le moteur (indicatif, ne recalcule pas le score) :\n"
        f"{json.dumps(resolved, ensure_ascii=False)}"
    )


def build_match_result(
    payload: dict[str, Any],
    weights: dict[str, float] | None,
    method: str,
) -> MatchResult:
    """Construit un ``MatchResult`` valide a partir d'une sortie LLM."""
    def _list(key: str) -> list[str]:
        raw = payload.get(key) or []
        if isinstance(raw, str):
            raw = [raw]
        return [normalize_skill(item) for item in raw if isinstance(item, str)]

    skill_score = payload.get("skill_score", 0)
    experience_score = payload.get("experience_score", 0)
    education_score = payload.get("education_score", 0)

    return MatchResult(
        overall_score=compute_weighted_score(
            skill_score, experience_score, education_score, weights
        ),
        skill_score=skill_score,
        experience_score=experience_score,
        education_score=education_score,
        matched_skills=_list("matched_skills"),
        missing_skills=_list("missing_skills"),
        justification=str(payload.get("justification") or ""),
        confidence=payload.get("confidence", 0.0),
        method=method,
    )


class BaseAIProvider(ABC):
    """Interface commune a tous les fournisseurs LLM."""

    provider_name: str = "base"

    def __init__(self, runtime: ProviderRuntime):
        self.runtime = runtime
        self.model_id = runtime.model_id or DEFAULT_MODELS.get(
            self.provider_name, ""
        )

    @abstractmethod
    async def extract_cv(self, cv_text: str) -> CVExtractionResult:
        """Extrait competences, experiences et formations structurees."""

    @abstractmethod
    async def match_candidate_job(
        self,
        candidate_data: dict[str, Any],
        job_data: dict[str, Any],
        weights: dict[str, float] | None = None,
    ) -> MatchResult:
        """Calcule les sous-scores de correspondance et la justification."""

    @property
    def api_key(self) -> str:
        if not self.runtime.api_key:
            raise AIProviderAuthError(
                f"Cle API absente pour le fournisseur '{self.runtime.provider}' "
                f"(reference : {self.runtime.name})."
            )
        return self.runtime.api_key

    async def post_json(
        self,
        url: str,
        payload: dict[str, Any],
        headers: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        """POST JSON avec mapping d'erreurs et delai borne."""
        timeout_seconds = max(1.0, float(getattr(settings, "AI_REQUEST_TIMEOUT", 30.0)))
        timeout = httpx.Timeout(timeout_seconds, connect=min(10.0, timeout_seconds))

        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(url, json=payload, headers=headers or {})
        except httpx.TimeoutException as exc:
            raise AIProviderTimeout(
                f"Timeout du fournisseur '{self.runtime.name}' apres {timeout_seconds:.0f}s."
            ) from exc
        except httpx.HTTPError as exc:
            raise AIProviderUnavailable(
                f"Fournisseur '{self.runtime.name}' injoignable ({type(exc).__name__})."
            ) from exc

        self._raise_for_status(response)
        try:
            data = response.json()
        except ValueError as exc:
            raise AIProviderResponseError(
                f"Reponse non JSON du fournisseur '{self.runtime.name}'."
            ) from exc
        if not isinstance(data, dict):
            raise AIProviderResponseError(
                f"Reponse inattendue du fournisseur '{self.runtime.name}'."
            )
        return data

    def _raise_for_status(self, response: httpx.Response) -> None:
        status_code = response.status_code
        if status_code < 400:
            return

        label = f"HTTP {status_code} ({response.reason_phrase})"
        if status_code in (401, 403):
            raise AIProviderAuthError(
                f"Authentification refusee par '{self.runtime.name}' : {label}."
            )
        if status_code == 429:
            raise AIProviderRateLimited(
                f"Quota depasse chez '{self.runtime.name}' : {label}."
            )
        if status_code == 404:
            raise AIProviderResponseError(
                f"Modele introuvable chez '{self.runtime.name}' : {label}."
            )
        if status_code >= 500:
            raise AIProviderUnavailable(
                f"Erreur serveur chez '{self.runtime.name}' : {label}."
            )
        raise AIProviderResponseError(
            f"Requete refusee par '{self.runtime.name}' : {label}."
        )

    def __repr__(self) -> str:
        return (
            f"{type(self).__name__}(name={self.runtime.name!r}, "
            f"model_id={self.model_id!r})"
        )
