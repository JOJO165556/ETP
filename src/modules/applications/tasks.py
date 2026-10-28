import asyncio
import os
import tempfile

import pdfplumber
from celery.utils.log import get_task_logger

from src.core.celery_app import celery_app
from src.core.database import async_session_maker
from src.core.storage import AsyncStorageService
from src.modules.ai.providers.base import ProviderRuntime
from src.modules.ai.providers.fallback import DeterministicProvider
from src.modules.ai.providers.orchestrator import AIOrchestrator
from src.modules.applications.models import ApplicationStage
from src.modules.applications.repository import ApplicationRepository
from src.modules.jobs.repository import JobRepository

logger = get_task_logger(__name__)

# Celery Task States
CELERY_TASK_PENDING = "PENDING"
CELERY_TASK_STARTED = "STARTED"
CELERY_TASK_SUCCESS = "SUCCESS"
CELERY_TASK_FAILURE = "FAILURE"
CELERY_TASK_RETRY = "RETRY"


async def _mark_application_failed(application_id: str, error: str) -> None:
    """Persiste l'échec du parsing pour ne jamais laisser une candidature
    bloquée indéfiniment en statut PROCESSING/PENDING côté base."""
    try:
        async with async_session_maker() as session:
            repo = ApplicationRepository(session)
            updated = await repo.update(application_id, {
                "celery_task_status": CELERY_TASK_FAILURE,
                "celery_task_result": {
                    "status": CELERY_TASK_FAILURE,
                    "error": error[:2000],
                },
            })
            if updated is not None:
                await session.commit()
    except Exception as exc:
        logger.error(
            f"Impossible d'enregistrer l'échec du parsing pour {application_id}: {exc}"
        )


def _job_payload(job) -> dict:
    """Vue minimale de l'offre transmise au moteur de matching (sans PII)."""
    return {
        "title": job.title,
        "description": job.description,
        "required_skills": job.required_skills or [],
    }


async def async_parse_resume_task(application_id: str, resume_key: str) -> str:
    logger.info(f"Début du parsing pour la candidature {application_id} (Fichier: {resume_key})")

    storage = AsyncStorageService()
    temp_path: str | None = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
            temp_path = tmp_file.name

        await storage.download_file(resume_key, temp_path)
        logger.info("PDF téléchargé avec succès.")

        extracted_text = ""
        with pdfplumber.open(temp_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    extracted_text += text + "\n"

        if not extracted_text.strip():
            raise ValueError("Aucun texte exploitable n'a pu être extrait du CV.")

        async with async_session_maker() as session:
            application_repo = ApplicationRepository(session)
            job_repo = JobRepository(session)

            application = await application_repo.get(application_id)
            if not application:
                raise ValueError(f"Application {application_id} non trouvée")

            job = await job_repo.get(application.job_id)
            if not job:
                raise ValueError(f"Job {application.job_id} non trouvé")

            # Le repli entre fournisseurs est interne à l'orchestrateur.
            orchestrator = AIOrchestrator(session)
            outcome = await orchestrator.extract_and_match(
                cv_text=extracted_text,
                job_data=_job_payload(job),
                company_id=job.company_id,
            )

            parsed_data = outcome.to_parsed_data()

            await application_repo.update(application_id, {
                "parsed_data": parsed_data,
                "matching_score": outcome.matching.overall_score,
                "celery_task_status": CELERY_TASK_SUCCESS,
                "celery_task_result": parsed_data,
            })

            if outcome.apply_stage:
                await application_repo.update(application_id, {
                    "stage": ApplicationStage(outcome.recommended_stage),
                    "modified_by": "ai_orchestrator",
                })

            await session.commit()

        logger.info(
            f"Parsing terminé pour {application_id}. "
            f"Score de matching: {outcome.matching.overall_score} "
            f"(fournisseur: {outcome.provider}, repli: {outcome.fallback_used})"
        )
        return CELERY_TASK_SUCCESS

    except Exception as exc:
        logger.error(f"Échec du parsing pour la candidature {application_id}: {exc}")
        await _mark_application_failed(application_id, str(exc))
        raise

    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


async def calculate_smart_match(
    candidate_skills: list, extracted_text: str, job, ai_result=None
) -> dict:
    """Compatibilité : calcule un score via le fournisseur déterministe.

    Conservée pour les appelants historiques. Le pipeline de production passe
    désormais par ``AIOrchestrator``, qui applique les pondérations et les
    seuils configurés en base.
    """
    provider = DeterministicProvider(
        ProviderRuntime(
            name="deterministic",
            provider="deterministic",
            model_id="heuristics",
        )
    )

    experience_level = getattr(ai_result, "experience_level", None)
    education_level = getattr(ai_result, "education_level", None)

    if not experience_level or not education_level:
        detected = await provider.extract_cv(extracted_text)
        experience_level = experience_level or detected.experience_level
        education_level = education_level or detected.education_level

    match = await provider.match_candidate_job(
        candidate_data={
            "skills": candidate_skills,
            "experience_level": experience_level,
            "education_level": education_level,
        },
        job_data=_job_payload(job),
    )

    skill_details = {
        skill: {"matched": True, "weight": 60.0, "exact_match": True, "partial_match": False}
        for skill in match.matched_skills
    }
    skill_details.update({
        skill: {"matched": False, "weight": 60.0, "exact_match": False, "partial_match": False}
        for skill in match.missing_skills
    })

    # Seuils historiques des appelants existants.
    if match.overall_score >= 75:
        recommended_stage = "screening"
    elif match.overall_score >= 45:
        recommended_stage = "interview"
    else:
        recommended_stage = "applied"

    return {
        "overall_score": match.overall_score,
        "skill_details": skill_details,
        "experience_match": match.experience_score,
        "education_match": match.education_score,
        "recommended_stage": recommended_stage,
        "job_skills_required": match.matched_skills + match.missing_skills,
        "candidate_skills_found": candidate_skills,
        "candidate_experience_level": experience_level,
        "job_experience_level": "unknown",
        "candidate_education_level": education_level,
        "job_education_level": "unknown",
    }


@celery_app.task(name="parse_resume", bind=True, max_retries=3)
def parse_resume(self, application_id: str, resume_key: str):
    """
    Tâche Celery qui extrait les données d'un CV et met à jour la candidature.

    Statuts normalisés :
    - SUCCESS : parsing et matching terminés, candidature mise à jour ;
    - FAILURE : erreur persistée en base (la candidature ne reste jamais en
      PROCESSING). Une nouvelle tentative est planifiée tant que
      ``max_retries`` n'est pas épuisé.

    Les pannes de fournisseurs LLM ne remontent pas ici : l'orchestrateur les
    absorbe via le repli et le parser déterministe.
    """
    self.update_state(state=CELERY_TASK_STARTED, meta={'status': 'Début du parsing...'})

    try:
        status_result = asyncio.run(
            async_parse_resume_task(application_id, resume_key)
        )
    except Exception as exc:
        logger.error(f"Erreur inattendue lors du parsing de {application_id}: {exc}")
        self.update_state(
            state=CELERY_TASK_FAILURE,
            meta={
                'status': CELERY_TASK_FAILURE,
                'error': str(exc),
                'application_id': application_id,
            },
        )
        raise self.retry(exc=exc, countdown=60)

    self.update_state(
        state=CELERY_TASK_SUCCESS,
        meta={
            'status': CELERY_TASK_SUCCESS,
            'application_id': application_id,
        },
    )

    return {
        'task_id': self.request.id,
        'application_id': application_id,
        'status': status_result or CELERY_TASK_SUCCESS,
    }
