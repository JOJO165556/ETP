"""Fournisseurs LLM et orchestrateur de repli."""
from src.modules.ai.providers.base import (
    AIProviderAuthError,
    AIProviderError,
    AIProviderRateLimited,
    AIProviderResponseError,
    AIProviderTimeout,
    AIProviderUnavailable,
    BaseAIProvider,
    ProviderRuntime,
    compute_weighted_score,
    resolve_api_key,
)
from src.modules.ai.providers.fallback import DeterministicProvider
from src.modules.ai.providers.gemini import GeminiProvider
from src.modules.ai.providers.huggingface import HuggingFaceProvider
from src.modules.ai.providers.orchestrator import (
    DETERMINISTIC_PROVIDER,
    PROVIDER_REGISTRY,
    AIOrchestrator,
    ExtractionMatchOutcome,
    resolve_stage,
)

__all__ = [
    "AIOrchestrator",
    "AIProviderAuthError",
    "AIProviderError",
    "AIProviderRateLimited",
    "AIProviderResponseError",
    "AIProviderTimeout",
    "AIProviderUnavailable",
    "BaseAIProvider",
    "DETERMINISTIC_PROVIDER",
    "DeterministicProvider",
    "ExtractionMatchOutcome",
    "GeminiProvider",
    "HuggingFaceProvider",
    "PROVIDER_REGISTRY",
    "ProviderRuntime",
    "compute_weighted_score",
    "resolve_api_key",
    "resolve_stage",
]
