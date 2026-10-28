"""Tests de la couche IA : extraction, matching, repli et audit.

Tous les appels externes sont simules (``httpx.MockTransport``) : la suite est
deterministe, hors ligne et sans cout API.
"""
import json
from types import SimpleNamespace

import httpx
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.core.database import get_db
# Enregistre les mappers du domaine avant de creer des objets SQLAlchemy.
import src.modules.companies.models
import src.modules.users.models
import src.modules.jobs.models
import src.modules.applications.models
from src.modules.ai.models import AIAuditStatus
from src.modules.ai.providers.base import (
    ProviderRuntime,
    compute_weighted_score,
    resolve_api_key,
)
from src.modules.ai.providers.fallback import DeterministicProvider
from src.modules.ai.providers.gemini import GeminiProvider
from src.modules.ai.providers.huggingface import HuggingFaceProvider
from src.modules.ai.providers.orchestrator import (
    DETERMINISTIC_PROVIDER,
    AIOrchestrator,
    resolve_stage,
)
from src.modules.ai.router import router as ai_router
from src.modules.ai.schemas import CVExtractionResult, MatchingWeights, ResolvedJobConfig
from src.modules.auth.dependencies import get_current_user
from src.modules.users.models import UserRole

API = "/api/v1"

CV_TEXT = (
    "Jean Dupont - Developpeur Full Stack Senior\n"
    "Master en Informatique\n"
    "Python, FastAPI, PostgreSQL, Docker, Kubernetes"
)

EXTRACTION_PAYLOAD = {
    "skills": ["Python", "FastAPI", "PostgreSQL", "Docker"],
    "experience_level": "Senior",
    "education_level": "Master",
    "years_experience": 7,
    "confidence": 0.92,
}

MATCHING_PAYLOAD = {
    "skill_score": 100,
    "experience_score": 50,
    "education_score": 0,
    "matched_skills": ["Python", "FastAPI"],
    "missing_skills": ["Kubernetes"],
    "justification": "Bonne couverture des competences cles.",
    "confidence": 0.8,
    # Le modele tente d'imposer un score : il doit etre ignore par le moteur.
    "overall_score": 100,
}


class FakeSession:
    """Session minimale : journalise les audits, simule une base indisponible."""

    def __init__(self):
        self.added: list = []

    def add(self, obj) -> None:
        self.added.append(obj)

    async def execute(self, *args, **kwargs):
        raise RuntimeError("base de donnees indisponible dans les tests unitaires")


def _hf_response(payload: dict) -> httpx.Response:
    return httpx.Response(
        200,
        json={"choices": [{"message": {"content": json.dumps(payload)}}]},
    )


def _gemini_response(payload: dict) -> httpx.Response:
    return httpx.Response(
        200,
        json={
            "candidates": [
                {"content": {"parts": [{"text": json.dumps(payload)}]}}
            ]
        },
    )


@pytest.fixture
def http_mock(monkeypatch):
    """Installe un transport simule et expose le handler courant."""
    # Capture la classe avant le patch : sinon l'appel a ``httpx.AsyncClient``
    # dans la fabrique se rappellerait elle-meme (recursion infinie).
    real_async_client = httpx.AsyncClient
    state = {"handler": lambda request: httpx.Response(500)}

    def factory(*args, **kwargs):
        kwargs["transport"] = httpx.MockTransport(
            lambda request: state["handler"](request)
        )
        return real_async_client(*args, **kwargs)

    monkeypatch.setattr(httpx, "AsyncClient", factory)
    return state


def _runtime(provider: str, model_id: str, api_key: str = "test-key") -> ProviderRuntime:
    return ProviderRuntime(
        name=f"test_{provider}",
        provider=provider,
        model_id=model_id,
        api_key=api_key,
        params={"temperature": 0.0, "max_tokens": 512},
    )


def _hf(api_key: str = "test-key") -> HuggingFaceProvider:
    return HuggingFaceProvider(
        _runtime("huggingface", "mistralai/Mistral-7B-Instruct-v0.3", api_key)
    )


def _gemini(api_key: str = "test-key") -> GeminiProvider:
    return GeminiProvider(_runtime("gemini", "gemini-2.5-flash", api_key))


def _superadmin() -> SimpleNamespace:
    return SimpleNamespace(
        id="admin-1", role=UserRole.SUPERADMIN, company_id=None, is_verified=True
    )


def _make_app(session=None, user=None) -> FastAPI:
    app = FastAPI()
    app.include_router(ai_router, prefix=API)

    if user is not None:
        app.dependency_overrides[get_current_user] = lambda: user

    async def _override_get_db():
        yield session if session is not None else FakeSession()

    app.dependency_overrides[get_db] = _override_get_db
    return app


@pytest.mark.asyncio
async def test_huggingface_extraction_returns_structured_result(http_mock):
    captured: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["auth"] = request.headers.get("authorization")
        captured["body"] = json.loads(request.content)
        return _hf_response(EXTRACTION_PAYLOAD)

    http_mock["handler"] = handler

    orchestrator = AIOrchestrator(providers=[_hf()])
    extraction = await orchestrator.extract_cv(CV_TEXT)

    assert extraction.skills == ["docker", "fastapi", "postgresql", "python"]
    assert extraction.experience_level == "senior"
    assert extraction.education_level == "master"
    assert extraction.years_experience == 7
    assert extraction.extraction_method == "huggingface"
    assert captured["url"].endswith("/chat/completions")
    assert captured["auth"] == "Bearer test-key"
    assert captured["body"]["model"] == "mistralai/Mistral-7B-Instruct-v0.3"
    assert captured["body"]["response_format"] == {"type": "json_object"}


@pytest.mark.asyncio
async def test_gemini_extraction_uses_response_schema(http_mock):
    captured: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["api_key"] = request.headers.get("x-goog-api-key")
        captured["body"] = json.loads(request.content)
        return _gemini_response(EXTRACTION_PAYLOAD)

    http_mock["handler"] = handler

    orchestrator = AIOrchestrator(providers=[_gemini()])
    extraction = await orchestrator.extract_cv(CV_TEXT)

    assert extraction.extraction_method == "gemini"
    config = captured["body"]["generationConfig"]
    assert config["responseMimeType"] == "application/json"
    assert config["responseSchema"]["type"] == "OBJECT"
    assert "properties" in config["responseSchema"]
    assert captured["api_key"] == "test-key"
    assert captured["url"].endswith(":generateContent")


@pytest.mark.asyncio
async def test_invalid_llm_payload_triggers_deterministic_fallback(http_mock):
    """Une sortie non conforme ne doit jamais casser le pipeline."""

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={"choices": [{"message": {"content": "reponse non JSON"}}]},
        )

    http_mock["handler"] = handler

    orchestrator = AIOrchestrator(providers=[_hf()])
    extraction = await orchestrator.extract_cv(CV_TEXT)

    assert extraction.extraction_method == "regex_fallback"
    assert "python" in extraction.skills
    assert orchestrator.attempts[0].status == AIAuditStatus.FALLBACK.value
    assert orchestrator.attempts[-1].provider == DETERMINISTIC_PROVIDER


@pytest.mark.asyncio
async def test_matching_applies_configured_weights(http_mock):
    http_mock["handler"] = lambda request: _hf_response(MATCHING_PAYLOAD)

    weights = {"skills": 0.5, "experience": 0.3, "education": 0.2}
    orchestrator = AIOrchestrator(providers=[_hf()])
    match = await orchestrator.match_candidate_job(
        candidate_data={"skills": ["python"], "experience_level": "senior"},
        job_data={"title": "Dev", "required_skills": ["python", "kubernetes"]},
        weights=weights,
    )

    # 100*0.5 + 50*0.3 + 0*0.2 = 65.0 (le score fourni par le modele est ignore)
    assert match.overall_score == pytest.approx(65.0)
    assert match.skill_score == 100.0
    assert match.matched_skills == ["python", "fastapi"]
    assert match.missing_skills == ["kubernetes"]
    assert match.method == "huggingface"


@pytest.mark.asyncio
async def test_default_weights_match_database_defaults():
    """Les ponderations par defaut doivent respecter la contrainte SQL (somme 1.000)."""
    assert MatchingWeights().as_dict() == {
        "skills": 0.6,
        "experience": 0.25,
        "education": 0.15,
    }
    assert compute_weighted_score(100, 100, 100) == 100.0
    assert compute_weighted_score(100, 0, 0) == 60.0


def test_custom_weights_must_sum_to_one():
    with pytest.raises(ValueError):
        MatchingWeights(skills=0.5, experience=0.25, education=0.1)

    assert MatchingWeights(skills=0.7, experience=0.2, education=0.1)


@pytest.mark.asyncio
async def test_fallback_from_huggingface_to_gemini_on_503(http_mock):
    calls: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        if "huggingface" in request.url.host:
            calls.append("huggingface")
            return httpx.Response(503, json={"error": "model loading"})
        calls.append("gemini")
        return _gemini_response(EXTRACTION_PAYLOAD)

    http_mock["handler"] = handler

    orchestrator = AIOrchestrator(providers=[_hf(), _gemini()])
    extraction = await orchestrator.extract_cv(CV_TEXT)

    assert calls == ["huggingface", "gemini"]
    assert extraction.extraction_method == "gemini"
    statuses = [(a.provider, a.status) for a in orchestrator.attempts]
    assert statuses == [
        ("huggingface", AIAuditStatus.FALLBACK.value),
        ("gemini", AIAuditStatus.SUCCESS.value),
    ]


@pytest.mark.asyncio
async def test_fallback_to_gemini_on_rate_limit(http_mock):
    def handler(request: httpx.Request) -> httpx.Response:
        if "huggingface" in request.url.host:
            return httpx.Response(429, json={"error": "rate limit"})
        return _gemini_response(EXTRACTION_PAYLOAD)

    http_mock["handler"] = handler

    orchestrator = AIOrchestrator(providers=[_hf(), _gemini()])
    extraction = await orchestrator.extract_cv(CV_TEXT)

    assert extraction.extraction_method == "gemini"


@pytest.mark.asyncio
async def test_pipeline_never_raises_when_every_provider_fails(http_mock):
    http_mock["handler"] = lambda request: httpx.Response(500)

    orchestrator = AIOrchestrator(providers=[_hf(), _gemini()])
    outcome = await orchestrator.extract_and_match(
        cv_text=CV_TEXT,
        job_data={
            "title": "Developpeur Python",
            "description": "Poste senior exigeant Python et FastAPI.",
            # "golang" est absent du CV : il doit ressortir comme manquant.
            "required_skills": ["python", "fastapi", "golang"],
        },
    )

    assert outcome.fallback_used is True
    assert outcome.provider == DETERMINISTIC_PROVIDER
    assert outcome.extraction.extraction_method == "regex_fallback"
    assert sorted(outcome.matching.matched_skills) == ["fastapi", "python"]
    assert outcome.matching.missing_skills == ["golang"]
    assert 0 <= outcome.matching.overall_score <= 100
    assert outcome.recommended_stage in {"screening", "rejected", "applied"}


@pytest.mark.asyncio
async def test_timeout_is_treated_as_fallback(http_mock):
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectTimeout("timeout simule")

    http_mock["handler"] = handler

    orchestrator = AIOrchestrator(providers=[_hf()])
    extraction = await orchestrator.extract_cv(CV_TEXT)

    assert extraction.extraction_method == "regex_fallback"
    assert "Timeout" in (orchestrator.attempts[0].error or "")


def test_thresholds_drive_stage_decision():
    config = ResolvedJobConfig(
        threshold_screening=80,
        threshold_reject=25,
        auto_stage_update=True,
        source="company",
    )

    assert resolve_stage(92.5, config) == ("screening", True, False)
    assert resolve_stage(50.0, config) == ("applied", False, False)
    assert resolve_stage(10.0, config) == ("rejected", True, False)

    manual = ResolvedJobConfig(
        threshold_screening=80, threshold_reject=25, auto_stage_update=False
    )
    # Automatisation desactivee : le recruteur garde la main.
    assert resolve_stage(92.5, manual) == ("screening", False, False)
    assert resolve_stage(10.0, manual) == ("rejected", False, True)


@pytest.mark.asyncio
async def test_outcome_serialises_provider_traceability(http_mock):
    def handler(request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content)
        user_prompt = body["messages"][1]["content"]
        if "Offre :" in user_prompt:
            return _hf_response(MATCHING_PAYLOAD)
        return _hf_response(EXTRACTION_PAYLOAD)

    http_mock["handler"] = handler

    orchestrator = AIOrchestrator(providers=[_hf()])
    outcome = await orchestrator.extract_and_match(
        cv_text=CV_TEXT,
        job_data={
            "title": "Developpeur Python",
            "description": "Poste senior.",
            "required_skills": ["python", "docker"],
        },
    )
    parsed = outcome.to_parsed_data()

    # Cles historiques conservees (compatibilite frontend) + tracabilite IA.
    assert parsed["extracted_skills"] == ["docker", "fastapi", "postgresql", "python"]
    assert parsed["matching_score"] == outcome.matching.overall_score
    assert parsed["skill_match_details"]["python"]["matched"] is True
    assert parsed["ai_provider"] == "huggingface"
    assert parsed["ai_fallback_used"] is False
    assert parsed["threshold_screening"] == 80.0


@pytest.mark.asyncio
async def test_audit_logs_are_persisted_without_pii(http_mock):
    def handler(request: httpx.Request) -> httpx.Response:
        if "huggingface" in request.url.host:
            return httpx.Response(503)
        return _gemini_response(EXTRACTION_PAYLOAD)

    http_mock["handler"] = handler

    session = FakeSession()
    orchestrator = AIOrchestrator(session, providers=[_hf(), _gemini()])
    await orchestrator.extract_cv(CV_TEXT, company_id=None)

    audits = [row for row in session.added if hasattr(row, "task_type")]
    assert [row.status for row in audits] == [
        AIAuditStatus.FALLBACK,
        AIAuditStatus.SUCCESS,
    ]
    assert audits[0].provider == "huggingface"
    assert audits[0].task_type == "extraction"
    assert audits[0].latency_ms >= 0
    assert audits[1].provider == "gemini"

    # RGPD : ni le texte du CV ni les noms ne doivent fuiter dans les logs.
    for row in audits:
        serialised = f"{row.error_message or ''}"
        assert "Jean Dupont" not in serialised
        assert CV_TEXT not in serialised
        assert "test-key" not in serialised


def test_api_key_reference_rejects_raw_secret():
    assert resolve_api_key("GEMINI_API_KEY") in (None, "")
    # Une cle brute (minuscules, tirets) n'est jamais acceptee comme reference.
    assert resolve_api_key("sk-live-abc123-secret") is None
    assert resolve_api_key("hf_abcdefghijklmnop") is None
    assert resolve_api_key(None) is None


def test_api_rejects_weights_not_summing_to_one():
    client = TestClient(_make_app(user=_superadmin()))
    response = client.put(
        f"{API}/ai/config",
        json={
            "weight_skills": 0.5,
            "weight_experience": 0.25,
            "weight_education": 0.15,
            "threshold_screening": 80,
            "threshold_reject": 25,
        },
    )

    assert response.status_code == 422
    assert "ponderation" in response.text.lower()


def test_api_rejects_inconsistent_thresholds():
    client = TestClient(_make_app(user=_superadmin()))
    response = client.put(
        f"{API}/ai/config",
        json={
            "weight_skills": 0.6,
            "weight_experience": 0.25,
            "weight_education": 0.15,
            "threshold_screening": 10,
            "threshold_reject": 90,
        },
    )

    assert response.status_code == 422


def test_api_rejects_raw_api_key_in_provider_config():
    client = TestClient(_make_app(user=_superadmin()))
    response = client.post(
        f"{API}/ai/providers",
        json={
            "name": "hf_mistral",
            "provider": "huggingface",
            "api_key_ref": "hf-secret-key-in-clear",
            "model_id": "mistralai/Mistral-7B-Instruct-v0.3",
        },
    )

    assert response.status_code == 422


def test_api_requires_authentication():
    client = TestClient(_make_app())
    response = client.get(f"{API}/ai/providers")
    assert response.status_code in (401, 403)


@pytest.mark.asyncio
async def test_deterministic_provider_handles_empty_text():
    provider = DeterministicProvider(
        ProviderRuntime(name="det", provider="deterministic", model_id="heuristics")
    )
    result = await provider.extract_cv("   ")

    assert result.confidence == 0.0
    assert result.extraction_method == "empty"
    assert result.skills == []


def test_extraction_result_normalises_llm_vocabulary():
    """Les alias libres d'un LLM doivent etre ramenes au vocabulaire ferme."""
    result = CVExtractionResult(
        skills=["NodeJS", "nodejs", " Python ", ""],
        experience_level="Senior-level",
        education_level="MSc",
        confidence=4.2,
    )

    assert result.skills == ["nodejs", "python"]
    assert result.experience_level == "senior"
    assert result.education_level == "master"
    assert result.confidence == 1.0
