"""Fournisseur deterministe de secours (aucun appel reseau, aucune dependance LLM).

C'est le dernier maillon de la chaine de repli : il garantit qu'un candidat ou
un recruteur obtient toujours un resultat exploitable, meme si tous les
fournisseurs LLM sont indisponibles.

Les heuristiques (regex de competences, mots-cles de niveau) sont celles du
parser historique ``src.modules.applications.resume_analyzer`` : elles sont
reutilisees telles quelles pour conserver exactement le meme comportement de
secours, sans duplication de regles metier.
"""
from __future__ import annotations

import re
from typing import Any

from src.modules.ai.providers.base import (
    BaseAIProvider,
    compute_weighted_score,
    clamp,
)
from src.modules.ai.schemas import (
    EDUCATION_LEVELS_ORDER,
    EXPERIENCE_LEVELS_ORDER,
    CVExtractionResult,
    MatchResult,
    normalize_skill,
)
from src.modules.applications.resume_analyzer import (
    EDUCATION_KEYWORDS,
    EXPERIENCE_KEYWORDS,
    SKILL_NORMALIZATION,
    _FALLBACK_SKILL_PATTERN,
)

_YEARS_PATTERN = re.compile(r"(\d{1,2})\s*\+?\s*(?:ans|annees|années|years)", re.IGNORECASE)

_FALLBACK_CONFIDENCE = 0.3
_MATCH_CONFIDENCE = 0.4


def _word_match(keyword: str, text: str) -> bool:
    """Vrai si ``keyword`` apparait comme mot entier (evite 'bac' dans 'bachelor')."""
    return bool(re.search(r"\b" + re.escape(keyword) + r"\b", text))


def _detect_level(text_lower: str, keywords: dict[str, list[str]], order: list[str]) -> str:
    for level in order:
        if any(_word_match(keyword, text_lower) for keyword in keywords.get(level, [])):
            return level
    return "unknown"


def _extract_skills(text: str) -> list[str]:
    found: set[str] = set()
    for match in _FALLBACK_SKILL_PATTERN.findall(text):
        skill = re.sub(r"\d+$", "", match.lower().strip())
        found.add(SKILL_NORMALIZATION.get(skill, skill))
    return sorted(found)


def _detect_years_experience(text: str) -> float | None:
    matches = [int(value) for value in _YEARS_PATTERN.findall(text)]
    plausible = [value for value in matches if 0 < value <= 50]
    return float(max(plausible)) if plausible else None


def _required_skills(job_data: dict[str, Any]) -> list[str]:
    raw = job_data.get("required_skills") or []
    if isinstance(raw, dict):
        raw = list(raw.keys())
    normalized: dict[str, None] = {}
    for skill in raw:
        if isinstance(skill, str):
            normalized.setdefault(normalize_skill(skill), None)
    return list(normalized)


def _level_score(
    candidate_level: str,
    job_level: str,
    order: list[str],
    equal: float,
    above: float,
    below: float,
    unknown: float,
) -> float:
    if candidate_level not in order:
        return unknown
    if job_level not in order:
        return unknown
    if candidate_level == job_level:
        return equal
    if order.index(candidate_level) > order.index(job_level):
        return above
    return below


class DeterministicProvider(BaseAIProvider):
    """Extraction et matching par heuristiques, sans aucun appel externe."""

    provider_name = "deterministic"

    @property
    def api_key(self) -> str:
        return ""

    async def extract_cv(self, cv_text: str) -> CVExtractionResult:
        if not cv_text or not cv_text.strip():
            return CVExtractionResult(confidence=0.0, extraction_method="empty")

        text_lower = cv_text.lower()
        return CVExtractionResult(
            skills=_extract_skills(cv_text),
            experience_level=_detect_level(
                text_lower, EXPERIENCE_KEYWORDS, EXPERIENCE_LEVELS_ORDER
            ),
            education_level=_detect_level(
                text_lower, EDUCATION_KEYWORDS, EDUCATION_LEVELS_ORDER
            ),
            years_experience=_detect_years_experience(cv_text),
            confidence=_FALLBACK_CONFIDENCE,
            extraction_method="regex_fallback",
        )

    async def match_candidate_job(
        self,
        candidate_data: dict[str, Any],
        job_data: dict[str, Any],
        weights: dict[str, float] | None = None,
    ) -> MatchResult:
        candidate_skills = [
            normalize_skill(skill)
            for skill in (candidate_data.get("skills") or candidate_data.get("extracted_skills") or [])
            if isinstance(skill, str)
        ]
        required = _required_skills(job_data)

        matched: list[str] = []
        missing: list[str] = []
        for skill in required:
            is_matched = any(
                skill == candidate or _word_match(skill, candidate)
                for candidate in candidate_skills
            )
            (matched if is_matched else missing).append(skill)

        if required:
            skill_score = clamp(len(matched) / len(required) * 100)
        else:
            # Aucune competence requise : le critere n'est pas discriminant.
            skill_score = 50.0

        candidate_experience = str(
            candidate_data.get("experience_level") or "unknown"
        ).lower()
        candidate_education = str(
            candidate_data.get("education_level") or "unknown"
        ).lower()
        job_experience = _detect_level(
            str(job_data.get("description") or "").lower(),
            EXPERIENCE_KEYWORDS,
            EXPERIENCE_LEVELS_ORDER,
        )
        job_education = _detect_level(
            str(job_data.get("description") or "").lower(),
            EDUCATION_KEYWORDS,
            EDUCATION_LEVELS_ORDER,
        )

        experience_score = _level_score(
            candidate_experience, job_experience, EXPERIENCE_LEVELS_ORDER,
            equal=100.0, above=90.0, below=60.0, unknown=50.0,
        )
        education_score = _level_score(
            candidate_education, job_education, EDUCATION_LEVELS_ORDER,
            equal=100.0, above=95.0, below=70.0, unknown=50.0,
        )

        if required:
            coverage = f"{len(matched)}/{len(required)} competences requises couvertes"
        else:
            coverage = "aucune competence requise dans l'offre"
        justification = (
            f"Analyse deterministe : {coverage}. "
            f"Experience candidat {candidate_experience} / attendu {job_experience}, "
            f"diplome {candidate_education} / attendu {job_education}."
        )[:2000]

        return MatchResult(
            overall_score=compute_weighted_score(
                skill_score, experience_score, education_score, weights
            ),
            skill_score=round(skill_score, 2),
            experience_score=round(experience_score, 2),
            education_score=round(education_score, 2),
            matched_skills=matched,
            missing_skills=missing,
            justification=justification,
            confidence=_MATCH_CONFIDENCE,
            method="regex_fallback",
        )
