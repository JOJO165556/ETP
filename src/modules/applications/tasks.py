import asyncio
import pdfplumber
import tempfile
import os
import json
import numpy as np
from datetime import datetime
from celery.utils.log import get_task_logger

from src.core.celery_app import celery_app
from src.core.storage import AsyncStorageService
from src.core.database import async_session_maker
from src.modules.applications.repository import ApplicationRepository
from src.modules.users.repository import UserProfileRepository
from src.modules.jobs.repository import JobRepository

logger = get_task_logger(__name__)

# Base de connaissances simulée pour l'extraction (en prod, on utiliserait un NLP / LLM / Spacy)
KNOWN_SKILLS = ["python", "fastapi", "react", "postgresql", "docker", "kubernetes", "aws", "gcp", "django", "java", "sql", "git"]

# Poids pour les différents critères de matching
SKILL_WEIGHT = 0.8
EXPERIENCE_WEIGHT = 0.15
EDUCATION_WEIGHT = 0.05

# Celery Task States
CELERY_TASK_PENDING = "PENDING"
CELERY_TASK_STARTED = "STARTED"
CELERY_TASK_SUCCESS = "SUCCESS"
CELERY_TASK_FAILURE = "FAILURE"
CELERY_TASK_RETRY = "RETRY"

async def async_parse_resume_task(application_id: str, resume_key: str):
    logger.info(f"Début du parsing pour la candidature {application_id} (Fichier: {resume_key})")
    
    storage = AsyncStorageService()
    
    # 1. Télécharger le fichier depuis MinIO vers un fichier temporaire
    try:
        # On crée un fichier temp car pdfplumber a besoin d'un vrai fichier ou d'un BytesIO
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

    # 3. Logique basique d'extraction (Simulation de l'ATS)
    text_lower = extracted_text.lower()
    found_skills = [skill for skill in KNOWN_SKILLS if skill in text_lower]
    
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
            
        # 5. Implémenter le Smart Job Matching Algorithm
        matching_result = await calculate_smart_match(
            found_skills, extracted_text, job
        )
        
        # 6. Construire les données de parsing enrichies
        parsed_data = {
            "extracted_skills": found_skills,
            "text_length": len(extracted_text),
            "matching_score": matching_result["overall_score"],
            "skill_match_details": matching_result["skill_details"],
            "experience_match": matching_result["experience_match"],
            "education_match": matching_result["education_match"],
            "recommended_stage": matching_result["recommended_stage"],
            # Plus tard, on extraira l'expérience, la formation, etc.
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


async def calculate_smart_match(candidate_skills: list, extracted_text: str, job) -> dict:
    """
    Implémente le Smart Job Matching Algorithm.
    Compare les compétences du candidat avec les exigences du job et calcule un score global.
    """
    # 1. Récupération des compétences requises depuis le champ JSON du job
    job_skills = []
    if job.required_skills:
        if isinstance(job.required_skills, list):
            job_skills = job.required_skills
        elif isinstance(job.required_skills, dict):
            # Si c'est un dict, extraire les clés (compétences) ou la valeur si c'est un objet de compétences
            job_skills = list(job.required_skills.keys()) if job.required_skills else []
    
    # 2. Calcul du score de correspondance des compétences
    skill_match_score = 0
    skill_details = {}
    
    # Calculer le nombre de compétences correspondantes
    matched_count = 0
    for skill in job_skills:
        # Normaliser la comparaison (minuscules, supprimer les espaces)
        normalized_skill = skill.lower().strip()
        is_matched = any(normalized_skill == cskill.lower().strip() for cskill in candidate_skills)
        
        if is_matched:
            matched_count += 1
        
        skill_details[skill] = {"matched": is_matched, "weight": SKILL_WEIGHT * 100}
    
    # Calculer le score de correspondance des compétences
    # SKILL_WEIGHT représente le poids total de toutes les compétences
    # Chaque compétence correspondante contribue à (SKILL_WEIGHT * 100) / nombre_total_de_compétences
    if job_skills:
        skill_match_score = (matched_count / len(job_skills)) * (SKILL_WEIGHT * 100)
    else:
        skill_match_score = 0
    
    # 3. Évaluation de l'expérience basée sur la longueur et la richesse du texte CV
    # Plus le CV est long et détaillé, plus le candidat a probablement de l'expérience
    experience_match = min(len(extracted_text) / 200, 100) * (EXPERIENCE_WEIGHT / 1.0)
    
    # 4. Évaluation de l'éducation basée sur les mots-clés dans le CV
    education_keywords = ["université", "école", "diplôme", "licence", "master", "phd", "formation", "bachelor", "doctorat"]
    education_score = 0
    if any(keyword in extracted_text.lower() for keyword in education_keywords):
        education_score = EDUCATION_WEIGHT * 100
    
    # 5. Calcul du score global
    overall_score = skill_match_score + experience_match + education_score
    
    # 6. Déterminer le stage recommandé basé sur le score
    recommended_stage = "applied"
    if overall_score >= 70:
        recommended_stage = "screening"
    elif overall_score >= 40:
        recommended_stage = "interview"
    
    return {
        "overall_score": round(overall_score, 2),
        "skill_details": skill_details,
        "experience_match": round(experience_match, 2),
        "education_match": round(education_score, 2),
        "recommended_stage": recommended_stage,
        "job_skills_required": job_skills,
        "candidate_skills_found": candidate_skills
    }


@celery_app.task(name="parse_resume", bind=True, max_retries=3)
def parse_resume(self, application_id: str, resume_key: str):
    """
    Tâche Celery qui extrait les données d'un CV et met à jour la candidature.
    Retourne l'ID de la tâche pour le suivi par le frontend.
    """
    # Mettre à jour le statut de la tâche
    self.update_state(state=CELERY_TASK_STARTED, meta={'status': 'Début du parsing...'})
    
    try:
        # Comme on utilise un ORM et des services asynchrones (aioboto3, sqlalchemy async),
        # on doit créer une boucle d'événement pour exécuter notre code asynchrone dans le worker synchrone.
        asyncio.run(async_parse_resume_task(application_id, resume_key))
        
        # Mettre à jour le statut de la tâche en cas de succès
        self.update_state(state=CELERY_TASK_SUCCESS, meta={'status': 'Parsing terminé', 'application_id': application_id})
        
    except Exception as exc:
        logger.error(f"Erreur inattendue: {exc}")
        # Mettre à jour le statut de la tâche en cas d'échec
        self.update_state(state=CELERY_TASK_FAILURE, meta={'status': f'Erreur: {str(exc)}'})
        self.retry(exc=exc, countdown=60) # Réessaie dans 60 secondes
    
    # Retourner l'ID de la tâche pour le suivi
    return {
        'task_id': self.request.id,
        'application_id': application_id,
        'status': 'PENDING'
    }
