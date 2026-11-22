"""Benchmark du matching CV/offre sur le jeu annote ``benchmarks/matching/dataset.json``.

Pour chaque exemple et chaque fournisseur, le script execute le pipeline de
production : ``extract_cv`` puis ``match_candidate_job`` avec les ponderations
par defaut. Les scores predits sont compares au ``expected_score`` annoté à la
main via le rang de Spearman, le MAE et le RMSE.

Usage :
    .venv/bin/python scripts/benchmark_matching.py [--providers gemini,huggingface,deterministic] [--limit N] [--concurrency N]
"""
from __future__ import annotations

import argparse
import asyncio
import json
import math
import statistics
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.core.config import settings
from src.modules.ai.providers.base import AIProviderError, ProviderRuntime
from src.modules.ai.providers.fallback import DeterministicProvider
from src.modules.ai.providers.gemini import GeminiProvider
from src.modules.ai.providers.huggingface import HuggingFaceProvider
from src.modules.ai.schemas import MatchingWeights

DATASET_PATH = Path(__file__).resolve().parent.parent / "benchmarks" / "matching" / "dataset.json"
RESULTS_DIR = DATASET_PATH.parent / "results"

DEFAULT_WEIGHTS = MatchingWeights().as_dict()


@dataclass
class ExampleResult:
    example_id: str
    expected_score: float
    overall_score: float | None = None
    skill_score: float | None = None
    experience_score: float | None = None
    education_score: float | None = None
    matched_skills: list[str] = field(default_factory=list)
    missing_skills: list[str] = field(default_factory=list)
    extracted_skills: list[str] = field(default_factory=list)
    extraction_method: str = ""
    latency_ms: int = 0
    error: str | None = None


def _build_providers(names: list[str]) -> dict[str, object]:
    providers: dict[str, object] = {}
    for name in names:
        if name == "deterministic":
            providers[name] = DeterministicProvider(
                ProviderRuntime(name="deterministic", provider="deterministic", model_id="heuristics")
            )
        elif name == "gemini":
            if not settings.GEMINI_API_KEY:
                print("gemini : GEMINI_API_KEY absente, fournisseur ignore.", file=sys.stderr)
                continue
            providers[name] = GeminiProvider(
                ProviderRuntime(
                    name="benchmark_gemini",
                    provider="gemini",
                    model_id=settings.GEMINI_MODEL,
                    api_key=settings.GEMINI_API_KEY,
                    params={},
                )
            )
        elif name == "huggingface":
            if not settings.HF_API_KEY:
                print("huggingface : HF_API_KEY absente, fournisseur ignore.", file=sys.stderr)
                continue
            providers[name] = HuggingFaceProvider(
                ProviderRuntime(
                    name="benchmark_hf",
                    provider="huggingface",
                    model_id=settings.HF_MODEL,
                    api_key=settings.HF_API_KEY,
                    params={},
                )
            )
        else:
            raise ValueError(f"Fournisseur inconnu : {name}")
    return providers


async def _run_example(provider, example: dict, semaphore: asyncio.Semaphore) -> ExampleResult:
    result = ExampleResult(
        example_id=example["id"],
        expected_score=float(example["expected_score"]),
    )
    async with semaphore:
        started = time.perf_counter()
        for attempt in range(4):
            try:
                extraction = await provider.extract_cv(example["cv_text"])
                matching = await provider.match_candidate_job(
                    extraction.model_dump(),
                    example["job"],
                    DEFAULT_WEIGHTS,
                )
                result.overall_score = matching.overall_score
                result.skill_score = matching.skill_score
                result.experience_score = matching.experience_score
                result.education_score = matching.education_score
                result.matched_skills = matching.matched_skills
                result.missing_skills = matching.missing_skills
                result.extracted_skills = extraction.skills
                result.extraction_method = extraction.extraction_method
                break
            except AIProviderError as exc:
                if not exc.retryable or attempt == 3:
                    result.error = f"{type(exc).__name__}: {exc}"
                    break
                await asyncio.sleep(10 * (attempt + 1))
            except Exception as exc:
                result.error = f"{type(exc).__name__}: {exc}"
                break
        result.latency_ms = int((time.perf_counter() - started) * 1000)
    return result


def _ranks(values: list[float]) -> list[float]:
    """Rangs moyens en cas d'egalite."""
    order = sorted(range(len(values)), key=lambda i: values[i])
    ranks = [0.0] * len(values)
    i = 0
    while i < len(order):
        j = i
        while j + 1 < len(order) and values[order[j + 1]] == values[order[i]]:
            j += 1
        rank = (i + j) / 2 + 1
        for k in range(i, j + 1):
            ranks[order[k]] = rank
        i = j + 1
    return ranks


def _pearson(xs: list[float], ys: list[float]) -> float | None:
    n = len(xs)
    if n < 2:
        return None
    mean_x = sum(xs) / n
    mean_y = sum(ys) / n
    cov = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys))
    var_x = sum((x - mean_x) ** 2 for x in xs)
    var_y = sum((y - mean_y) ** 2 for y in ys)
    if var_x == 0 or var_y == 0:
        return None
    return cov / math.sqrt(var_x * var_y)


def spearman(xs: list[float], ys: list[float]) -> float | None:
    return _pearson(_ranks(xs), _ranks(ys))


def _metrics(results: list[ExampleResult]) -> dict:
    scored = [r for r in results if r.overall_score is not None]
    pairs = [(r.expected_score, r.overall_score) for r in scored]
    expected = [p[0] for p in pairs]
    predicted = [p[1] for p in pairs]

    deltas = [abs(e - p) for e, p in pairs]
    rho = spearman(expected, predicted) if len(pairs) >= 3 else None
    metrics: dict = {
        "n_examples": len(results),
        "n_scored": len(scored),
        "n_errors": len(results) - len(scored),
        "mae": round(statistics.mean(deltas), 2) if deltas else None,
        "rmse": round(math.sqrt(statistics.mean(d * d for d in deltas)), 2) if deltas else None,
        "spearman": round(rho, 3) if rho is not None else None,
        "mean_predicted": round(statistics.mean(predicted), 2) if predicted else None,
        "mean_expected": round(statistics.mean(expected), 2) if expected else None,
        "mean_latency_ms": (
            round(statistics.mean(r.latency_ms for r in scored), 0) if scored else None
        ),
    }
    return metrics


async def _run_provider(name: str, provider, examples: list[dict], concurrency: int) -> list[ExampleResult]:
    semaphore = asyncio.Semaphore(concurrency)
    tasks = [_run_example(provider, example, semaphore) for example in examples]
    results = await asyncio.gather(*tasks)
    return sorted(results, key=lambda r: r.example_id)


async def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--providers",
        default="deterministic,gemini,huggingface",
        help="Fournisseurs a evaluer, separes par des virgules.",
    )
    parser.add_argument("--limit", type=int, default=0, help="Limiter le nombre d'exemples.")
    parser.add_argument("--concurrency", type=int, default=4, help="Appels LLM en parallele.")
    parser.add_argument("--out", type=Path, default=None, help="Fichier de sortie JSON.")
    args = parser.parse_args()

    dataset = json.loads(DATASET_PATH.read_text(encoding="utf-8"))
    examples = dataset["examples"]
    if args.limit:
        examples = examples[: args.limit]

    names = [n.strip() for n in args.providers.split(",") if n.strip()]
    providers = _build_providers(names)
    if not providers:
        print("Aucun fournisseur disponible.", file=sys.stderr)
        return 1

    all_results: dict[str, list[ExampleResult]] = {}
    for name, provider in providers.items():
        started = time.perf_counter()
        results = await _run_provider(name, provider, examples, args.concurrency)
        elapsed = time.perf_counter() - started
        all_results[name] = results
        errors = sum(1 for r in results if r.error)
        print(f"[{name}] {len(results)} exemples en {elapsed:.1f}s ({errors} erreurs)")

    summary = {
        name: _metrics(results) for name, results in all_results.items()
    }

    out_path = args.out or (
        RESULTS_DIR
        / f"benchmark-{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}.json"
    )
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(
        json.dumps(
            {
                "dataset": str(DATASET_PATH),
                "weights": DEFAULT_WEIGHTS,
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "providers": {
                    name: {
                        "model_id": getattr(providers[name], "model_id", None),
                        "metrics": summary[name],
                        "examples": [
                            {
                                "example_id": r.example_id,
                                "expected_score": r.expected_score,
                                "overall_score": r.overall_score,
                                "skill_score": r.skill_score,
                                "experience_score": r.experience_score,
                                "education_score": r.education_score,
                                "matched_skills": r.matched_skills,
                                "missing_skills": r.missing_skills,
                                "extracted_skills": r.extracted_skills,
                                "extraction_method": r.extraction_method,
                                "latency_ms": r.latency_ms,
                                "error": r.error,
                            }
                            for r in all_results[name]
                        ],
                    }
                    for name in all_results
                },
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    print("\n=== Résumé ===")
    header = f"{'provider':<16} {'n':>3} {'err':>4} {'MAE':>7} {'RMSE':>7} {'Spearman':>9} {'moy.pred':>9} {'latence':>8}"
    print(header)
    def _fmt(value) -> str:
        return "-" if value is None else str(value)

    for name, metrics in summary.items():
        print(
            f"{name:<16} {metrics['n_scored']:>3} {metrics['n_errors']:>4} "
            f"{_fmt(metrics['mae']):>7} {_fmt(metrics['rmse']):>7} {_fmt(metrics['spearman']):>9} "
            f"{_fmt(metrics['mean_predicted']):>9} {_fmt(metrics['mean_latency_ms']):>8}"
        )
    print(f"\nRésultats écrits : {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
