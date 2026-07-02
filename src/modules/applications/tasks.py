import asyncio
import pdfplumber
import tempfile
import os
import json
import re
import numpy as np
from datetime import datetime
from collections import Counter
from celery.utils.log import get_task_logger

from src.core.celery_app import celery_app
from src.core.storage import AsyncStorageService
from src.core.database import async_session_maker
from src.modules.applications.repository import ApplicationRepository
from src.modules.users.repository import UserProfileRepository
from src.modules.jobs.repository import JobRepository
from src.modules.applications.resume_analyzer import get_resume_analyzer, CONFIDENCE_THRESHOLD

logger = get_task_logger(__name__)

# Celery Task States
CELERY_TASK_PENDING = "PENDING"
CELERY_TASK_STARTED = "STARTED"
CELERY_TASK_SUCCESS = "SUCCESS"
CELERY_TASK_FAILURE = "FAILURE"
CELERY_TASK_RETRY = "RETRY"

# Poids pour les différents critères de matching
SKILL_WEIGHT = 0.6
EXPERIENCE_WEIGHT = 0.25
EDUCATION_WEIGHT = 0.15

# Experience level keywords pour le matching
EXPERIENCE_LEVELS = {
    "senior": ["senior", "senior-level", "lead", "principal", "architect"],
    "mid": ["mid", "mid-level", "intermediate", "regular"],
    "junior": ["junior", "junior-level", "entry", "débutant", "trainee"],
    "intern": ["intern", "stagiaire", "étudiant", "apprenti"]
}

# Education level keywords pour le matching
EDUCATION_LEVELS = {
    "phd": ["phd", "doctorat", "doctorate", "recherche"],
    "master": ["master", "mastère", "msc", "meng"],
    "bachelor": ["licence", "bachelor", "bs", "ba", "ingénieur"],
    "associate": ["associate", "demi-licence"],
    "high_school": ["bac", "baccalauréat", "high school", "lycée", "diplôme d'études secondaires"]
}


def _word_match(keyword: str, text: str) -> bool:
    """Vérifie si un keyword apparaît comme mot entier dans le texte (évite 'bac' dans 'bachelor')."""
    return bool(re.search(r'\b' + re.escape(keyword) + r'\b', text))


async def async_parse_resume_task(application_id: str, resume_key: str):
    logger.info(f"Début du parsing pour la candidature {application_id} (Fichier: {resume_key})")
    
    storage = AsyncStorageService()
    
    # 1. Télécharger le fichier depuis MinIO vers un fichier temporaire
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
            temp_path = tmp_file.name
            
        await storage.download_file(resume_key, temp_path)
        logger.info("PDF téléchargé avec succès.")
    except Exception as e:
        logger.error(f"Erreur lors du téléchargement du CV: {e}")
        return

    # 2. Extraire le texte avec pdfplumber
    extracted_text = ""
    try:
        with pdfplumber.open(temp_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    extracted_text += text + "\n"
    except Exception as e:
        logger.error(f"Erreur lors de la lecture du PDF: {e}")
        os.remove(temp_path)
        return
        
    # Nettoyage
    os.remove(temp_path)

    # 3. Extraire les skills directement depuis l'analyseur IA
    analyzer = get_resume_analyzer()
    ai_result = analyzer.analyze(extracted_text)
    
    # 4. Récupérer les détails du job pour le matching
    async with async_session_maker() as job_session:
        job_repo = JobRepository(job_session)
        application_repo = ApplicationRepository(job_session)
        
        application = await application_repo.get(application_id)
        if not application:
            logger.error(f"Application {application_id} non trouvée")
            return
            
        job = await job_repo.get(application.job_id)
        if not job:
            logger.error(f"Job {application.job_id} non trouvé")
            return
            
        # 5. Smart Job Matching Algorithm
        matching_result = await calculate_smart_match(
            ai_result.skills, extracted_text, job, ai_result
        )
        
        # 6. Construire les données de parsing enrichies
        parsed_data = {
            "extracted_skills": ai_result.skills,
            "experience_level": ai_result.experience_level,
            "education_level": ai_result.education_level,
            "ai_confidence": ai_result.confidence,
            "text_length": len(extracted_text),
            "matching_score": matching_result["overall_score"],
            "skill_match_details": matching_result["skill_details"],
            "experience_match": matching_result["experience_match"],
            "education_match": matching_result["education_match"],
            "recommended_stage": matching_result["recommended_stage"],
        }
        
        # 7. Sauvegarder dans la base de données
        await application_repo.update(application_id, {
            "parsed_data": parsed_data,
            "matching_score": matching_result["overall_score"],
            "celery_task_status": CELERY_TASK_SUCCESS,
            "celery_task_result": parsed_data
        })
        
        # 8. Mettre à jour automatiquement le stage si le matching est élevé
        if matching_result["overall_score"] >= 80:
            from src.modules.applications.models import ApplicationStage
            await application_repo.update(application_id, {
                "stage": ApplicationStage.SCREENING
            })
            
        await job_session.commit()
        
    logger.info(f"Parsing terminé pour {application_id}. Score de matching: {matching_result['overall_score']}")


async def calculate_smart_match(candidate_skills: list, extracted_text: str, job, ai_result=None) -> dict:
    """
    Smart Job Matching Algorithm.
    Compare les compétences du candidat avec les exigences du job et calcule un score global.
    L'IA gère l'extraction et la normalisation des skills. Le matching est simple (exact match).
    """
    # 0. Récupérer les données IA si disponibles
    ai_experience = None
    ai_education = None
    if ai_result:
        ai_experience = ai_result.experience_level
        ai_education = ai_result.education_level

    # 1. Récupération des compétences requises depuis le champ JSON du job
    job_skills = []
    if job.required_skills:
        if isinstance(job.required_skills, list):
            job_skills = job.required_skills
        elif isinstance(job.required_skills, dict):
            job_skills = list(job.required_skills.keys()) if job.required_skills else []
    
    # 2. Calcul du score de correspondance des compétences
    skill_match_score = 0
    skill_details = {}
    matched_count = 0
    
    for skill in job_skills:
        normalized_skill = skill.lower().strip()
        
        # Match exact (l'IA normalise déjà les sorties)
        is_exact_match = any(normalized_skill == cskill.lower().strip() for cskill in candidate_skills)
        
        # Match partiel : "react" dans "reactjs", "python" dans "python3"
        is_partial_match = False
        if not is_exact_match:
            for cskill in candidate_skills:
                cskill_lower = cskill.lower().strip()
                if _word_match(normalized_skill, cskill_lower):
                    is_partial_match = True
                    break
        
        is_matched = is_exact_match or is_partial_match
        
        if is_matched:
            matched_count += 1
        
        skill_details[skill] = {
            "matched": is_matched,
            "weight": SKILL_WEIGHT * 100,
            "exact_match": is_exact_match,
            "partial_match": is_partial_match,
        }
    
    # Score = (compétences matchées / total) * poids
    if job_skills:
        skill_match_score = (matched_count / len(job_skills)) * (SKILL_WEIGHT * 100)
    else:
        skill_match_score = 0
    
    # 3. Évaluation de l'expérience
    experience_match = 0
    experience_level_order = ["intern", "junior", "mid", "senior"]
    
    # Niveau candidat : IA en priorité, fallback regex
    candidate_experience_level = ai_experience if (ai_experience and ai_experience != "unknown") else "unknown"
    if candidate_experience_level == "unknown":
        extracted_text_lower = extracted_text.lower()
        for level in experience_level_order:
            keywords = EXPERIENCE_LEVELS[level]
            if any(_word_match(kw, extracted_text_lower) for kw in keywords):
                candidate_experience_level = level
                break
    
    # Niveau job
    job_experience_level = "unknown"
    job_text_lower = job.description.lower()
    for level in experience_level_order:
        keywords = EXPERIENCE_LEVELS[level]
        if any(_word_match(kw, job_text_lower) for kw in keywords):
            job_experience_level = level
            break
    
    # Score d'expérience
    if candidate_experience_level != "unknown" and job_experience_level != "unknown":
        if candidate_experience_level == job_experience_level:
            experience_match = EXPERIENCE_WEIGHT * 100
        elif experience_level_order.index(candidate_experience_level) > experience_level_order.index(job_experience_level):
            experience_match = EXPERIENCE_WEIGHT * 80
        else:
            experience_match = EXPERIENCE_WEIGHT * 60
    else:
        experience_match = min(len(extracted_text) / 200, 100) * (EXPERIENCE_WEIGHT / 1.0)
    
    # 4. Éducation
    education_score = 0
    education_level_order = ["high_school", "associate", "bachelor", "master", "phd"]
    
    candidate_education_level = ai_education if (ai_education and ai_education != "unknown") else "unknown"
    if candidate_education_level == "unknown":
        extracted_text_lower = extracted_text.lower()
        for level in education_level_order:
            keywords = EDUCATION_LEVELS[level]
            if any(_word_match(kw, extracted_text_lower) for kw in keywords):
                candidate_education_level = level
                break
    
    job_education_level = "unknown"
    job_text_lower = job.description.lower()
    for level in education_level_order:
        keywords = EDUCATION_LEVELS[level]
        if any(_word_match(kw, job_text_lower) for kw in keywords):
            job_education_level = level
            break
    
    if candidate_education_level != "unknown":
        if job_education_level != "unknown":
            if candidate_education_level == job_education_level:
                education_score = EDUCATION_WEIGHT * 100
            elif education_level_order.index(candidate_education_level) > education_level_order.index(job_education_level):
                education_score = EDUCATION_WEIGHT * 90
            else:
                education_score = EDUCATION_WEIGHT * 70
        else:
            education_score = EDUCATION_WEIGHT * 50
    
    # 5. Score global
    overall_score = skill_match_score + experience_match + education_score
    
    # 6. Stage recommandé
    recommended_stage = "applied"
    if overall_score >= 75:
        recommended_stage = "screening"
    elif overall_score >= 45:
        recommended_stage = "interview"
    
    return {
        "overall_score": round(overall_score, 2),
        "skill_details": skill_details,
        "experience_match": round(experience_match, 2),
        "education_match": round(education_score, 2),
        "recommended_stage": recommended_stage,
        "job_skills_required": job_skills,
        "candidate_skills_found": candidate_skills,
        "candidate_experience_level": candidate_experience_level,
        "job_experience_level": job_experience_level,
        "candidate_education_level": candidate_education_level,
        "job_education_level": job_education_level
    }


@celery_app.task(name="parse_resume", bind=True, max_retries=3)
def parse_resume(self, application_id: str, resume_key: str):
    """
    Tâche Celery qui extrait les données d'un CV et met à jour la candidature.
    Retourne l'ID de la tâche pour le suivi par le frontend.
    """
    self.update_state(state=CELERY_TASK_STARTED, meta={'status': 'Début du parsing...'})
    
    try:
        asyncio.run(async_parse_resume_task(application_id, resume_key))
        
        self.update_state(state=CELERY_TASK_SUCCESS, meta={'status': 'Parsing terminé', 'application_id': application_id})
        
    except Exception as exc:
        logger.error(f"Erreur inattendue: {exc}")
        self.update_state(state=CELERY_TASK_FAILURE, meta={'status': f'Erreur: {str(exc)}'})
        self.retry(exc=exc, countdown=60)
    
    return {
        'task_id': self.request.id,
        'application_id': application_id,
        'status': 'PENDING'
    }
