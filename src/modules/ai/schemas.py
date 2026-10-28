"""Contrats Pydantic de la couche IA, valides avant persistance."""
from datetime import datetime
from decimal import Decimal
from typing import Annotated, Any
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)

from src.modules.ai.models import (
    AIAuditStatus,
    AIProviderName,
    AITaskType,
    DEFAULT_THRESHOLD_REJECT,
    DEFAULT_THRESHOLD_SCREENING,
    DEFAULT_WEIGHT_EDUCATION,
    DEFAULT_WEIGHT_EXPERIENCE,
    DEFAULT_WEIGHT_SKILLS,
)

EXPERIENCE_LEVELS_ORDER = ["intern", "junior", "mid", "senior"]
EDUCATION_LEVELS_ORDER = ["high_school", "associate", "bachelor", "master", "phd"]

_EXPERIENCE_ALIASES = {
    "internship": "intern",
    "trainee": "intern",
    "stage": "intern",
    "entry": "junior",
    "entry_level": "junior",
    "junior-level": "junior",
    "intermediate": "mid",
    "mid-level": "mid",
    "confirmed": "mid",
    "confirme": "mid",
    "senior-level": "senior",
    "lead": "senior",
    "principal": "senior",
    "expert": "senior",
}

_EDUCATION_ALIASES = {
    "highschool": "high_school",
    "high school": "high_school",
    "secondary": "high_school",
    "bac": "high_school",
    "bts": "associate",
    "dut": "associate",
    "bachelors": "bachelor",
    "licence": "bachelor",
    "license": "bachelor",
    "bachelor's": "bachelor",
    "engineer": "bachelor",
    "ingenieur": "bachelor",
    "masters": "master",
    "master's": "master",
    "msc": "master",
    "mba": "master",
    "doctorate": "phd",
    "doctoral": "phd",
    "doctorat": "phd",
}


def _normalize_level(value: Any, allowed: list[str], aliases: dict[str, str]) -> str:
    """Ramene une sortie LLM libre sur un vocabulaire ferme."""
    if value is None:
        return "unknown"
    normalized = " ".join(str(value).strip().lower().split()).replace("-", "_")
    if not normalized:
        return "unknown"

    lookup = {
        alias.replace("-", "_"): target for alias, target in aliases.items()
    }
    resolved = lookup.get(normalized, normalized)
    return resolved if resolved in allowed else "unknown"


def normalize_skill(value: str) -> str:
    """Normalise une competence pour la comparaison (minuscules, espaces)."""
    return " ".join(str(value).strip().lower().split())


class MatchingWeights(BaseModel):
    """Ponderations du score global (somme strictement egale a 1.000)."""

    model_config = ConfigDict(extra="forbid")

    skills: Decimal = Field(default=DEFAULT_WEIGHT_SKILLS, ge=0, le=1)
    experience: Decimal = Field(default=DEFAULT_WEIGHT_EXPERIENCE, ge=0, le=1)
    education: Decimal = Field(default=DEFAULT_WEIGHT_EDUCATION, ge=0, le=1)

    @model_validator(mode="after")
    def _check_sum(self) -> "MatchingWeights":
        total = (self.skills + self.experience + self.education).quantize(
            Decimal("0.001")
        )
        if abs(total - Decimal("1.000")) > Decimal("0.001"):
            raise ValueError(
                "La somme des ponderations skills + experience + education "
                f"doit valoir 1.000 (recu : {total})."
            )
        return self

    def as_dict(self) -> dict[str, float]:
        return {
            "skills": float(self.skills),
            "experience": float(self.experience),
            "education": float(self.education),
        }


class CVExtractionResult(BaseModel):
    """Resultat structure de l'extraction d'un CV."""

    model_config = ConfigDict(extra="ignore")

    skills: list[str] = Field(default_factory=list)
    experience_level: str = "unknown"
    education_level: str = "unknown"
    years_experience: float | None = Field(default=None, ge=0, le=70)
    confidence: float = Field(default=0.0, ge=0, le=1)
    extraction_method: str = "unknown"

    @field_validator("skills", mode="before")
    @classmethod
    def _normalize_skills(cls, value: Any) -> list[str]:
        if value is None:
            return []
        if isinstance(value, str):
            value = [value]
        deduplicated: dict[str, None] = {}
        for item in value:
            if not isinstance(item, str):
                continue
            normalized = normalize_skill(item)
            if normalized and len(normalized) <= 80:
                deduplicated.setdefault(normalized, None)
        return sorted(deduplicated)

    @field_validator("experience_level", mode="before")
    @classmethod
    def _normalize_experience(cls, value: Any) -> str:
        return _normalize_level(value, EXPERIENCE_LEVELS_ORDER, _EXPERIENCE_ALIASES)

    @field_validator("education_level", mode="before")
    @classmethod
    def _normalize_education(cls, value: Any) -> str:
        return _normalize_level(value, EDUCATION_LEVELS_ORDER, _EDUCATION_ALIASES)

    @field_validator("confidence", mode="before")
    @classmethod
    def _clamp_confidence(cls, value: Any) -> float:
        try:
            numeric = float(value)
        except (TypeError, ValueError):
            return 0.0
        return max(0.0, min(1.0, numeric))


class SkillMatch(BaseModel):
    """Detail de correspondance d'une competence requise."""

    skill: str
    matched: bool
    exact: bool = False


class MatchResult(BaseModel):
    """Sous-scores du LLM et score global calcule par le moteur."""

    model_config = ConfigDict(extra="ignore")

    overall_score: float = Field(default=0.0, ge=0, le=100)
    skill_score: float = Field(default=0.0, ge=0, le=100)
    experience_score: float = Field(default=0.0, ge=0, le=100)
    education_score: float = Field(default=0.0, ge=0, le=100)
    matched_skills: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)
    justification: str = ""
    confidence: float = Field(default=0.0, ge=0, le=1)
    recommended_stage: str = "applied"
    method: str = "unknown"

    @field_validator(
        "overall_score", "skill_score", "experience_score", "education_score",
        mode="before",
    )
    @classmethod
    def _clamp_scores(cls, value: Any) -> float:
        try:
            numeric = float(value)
        except (TypeError, ValueError):
            return 0.0
        return round(max(0.0, min(100.0, numeric)), 2)

    @field_validator("confidence", mode="before")
    @classmethod
    def _clamp_confidence(cls, value: Any) -> float:
        try:
            numeric = float(value)
        except (TypeError, ValueError):
            return 0.0
        return max(0.0, min(1.0, numeric))

    @field_validator("justification")
    @classmethod
    def _truncate_justification(cls, value: str) -> str:
        return " ".join(value.split())[:2000]


class MatchLLMOutput(BaseModel):
    """Sortie LLM attendue : le score global reste calcule par le moteur."""

    model_config = ConfigDict(extra="ignore")

    skill_score: float = Field(default=0.0, ge=0, le=100)
    experience_score: float = Field(default=0.0, ge=0, le=100)
    education_score: float = Field(default=0.0, ge=0, le=100)
    matched_skills: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)
    justification: str = ""
    confidence: float = Field(default=0.0, ge=0, le=1)


class ResolvedJobConfig(BaseModel):
    """Vue resolue de la configuration ATS (base de donnees ou valeurs par defaut)."""

    weights: MatchingWeights = Field(default_factory=MatchingWeights)
    threshold_screening: Decimal = Field(default=DEFAULT_THRESHOLD_SCREENING, ge=0, le=100)
    threshold_reject: Decimal = Field(default=DEFAULT_THRESHOLD_REJECT, ge=0, le=100)
    auto_stage_update: bool = True
    semantic_matching: bool = False
    provider_id: UUID | None = None
    company_id: UUID | None = None
    source: str = "defaults"


class AIProviderConfigCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", json_schema_extra={
        "example": {
            "name": "hf_mistral",
            "provider": "huggingface",
            "api_key_ref": "HF_API_KEY",
            "model_id": "mistralai/Mistral-7B-Instruct-v0.3",
            "is_default": True,
            "model_params": {"temperature": 0.1, "max_tokens": 1024},
        }
    })

    name: str = Field(min_length=2, max_length=64, pattern=r"^[a-z0-9_]+$")
    provider: AIProviderName
    api_key_ref: str = Field(min_length=2, max_length=128, pattern=r"^[A-Z][A-Z0-9_]*$")
    model_id: str | None = Field(default=None, max_length=256)
    is_active: bool = True
    is_default: bool = False
    model_params: dict[str, Any] = Field(default_factory=dict)
    supports_extraction: bool = True
    supports_matching: bool = True
    supports_embeddings: bool = False


class AIProviderConfigUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    provider: AIProviderName | None = None
    api_key_ref: str | None = Field(default=None, min_length=2, max_length=128, pattern=r"^[A-Z][A-Z0-9_]*$")
    model_id: str | None = Field(default=None, max_length=256)
    is_active: bool | None = None
    is_default: bool | None = None
    model_params: dict[str, Any] | None = None
    supports_extraction: bool | None = None
    supports_matching: bool | None = None
    supports_embeddings: bool | None = None


class AIProviderConfigResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    provider: str
    is_active: bool
    is_default: bool
    api_key_ref: str
    model_id: str | None = None
    model_params: dict[str, Any] = Field(default_factory=dict)
    supports_extraction: bool
    supports_matching: bool
    supports_embeddings: bool
    created_at: datetime
    updated_at: datetime


class AIJobConfigUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid", json_schema_extra={
        "example": {
            "weight_skills": 0.6,
            "weight_experience": 0.25,
            "weight_education": 0.15,
            "threshold_screening": 80.0,
            "threshold_reject": 25.0,
            "auto_stage_update": True,
            "semantic_matching": False,
        }
    })

    provider_id: UUID | None = None
    weight_skills: Decimal = Field(default=DEFAULT_WEIGHT_SKILLS, ge=0, le=1)
    weight_experience: Decimal = Field(default=DEFAULT_WEIGHT_EXPERIENCE, ge=0, le=1)
    weight_education: Decimal = Field(default=DEFAULT_WEIGHT_EDUCATION, ge=0, le=1)
    threshold_screening: Decimal = Field(default=DEFAULT_THRESHOLD_SCREENING, ge=0, le=100)
    threshold_reject: Decimal = Field(default=DEFAULT_THRESHOLD_REJECT, ge=0, le=100)
    auto_stage_update: bool = True
    semantic_matching: bool = False

    @model_validator(mode="after")
    def _validate_consistency(self) -> "AIJobConfigUpdate":
        MatchingWeights(
            skills=self.weight_skills,
            experience=self.weight_experience,
            education=self.weight_education,
        )
        if self.threshold_reject > self.threshold_screening:
            raise ValueError(
                "threshold_reject doit etre inferieur ou egal a threshold_screening."
            )
        return self


class AIJobConfigResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID | None = None
    company_id: UUID | None = None
    provider_id: UUID | None = None
    weight_skills: Decimal
    weight_experience: Decimal
    weight_education: Decimal
    threshold_screening: Decimal
    threshold_reject: Decimal
    auto_stage_update: bool
    semantic_matching: bool
    source: str = "defaults"
    updated_at: datetime | None = None


class AIAuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID | None = None
    provider: str
    model_id: str | None = None
    task_type: AITaskType
    latency_ms: int
    status: AIAuditStatus
    error_message: str | None = None
    created_at: datetime


class ProviderTestRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sample_text: str = Field(
        min_length=1,
        max_length=12000,
        json_schema_extra={"example": "Developpeur Python senior, FastAPI, PostgreSQL, Docker."},
    )


class ProviderTestResponse(BaseModel):
    provider: str
    model_id: str | None = None
    latency_ms: int
    success: bool
    extraction: CVExtractionResult | None = None
    error: str | None = None


class ExtractionPreviewRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    cv_text: Annotated[str, Field(min_length=1, max_length=12000)]
    company_id: UUID | None = None


class ExtractionPreviewResponse(BaseModel):
    extraction: CVExtractionResult
    provider_used: str
    fallback_used: bool
