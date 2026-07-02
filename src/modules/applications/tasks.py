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

# Base de connaissances simulée pour l'extraction (en prod, on utiliserait un NLP / LLM / Spacy)
KNOWN_SKILLS = ["python", "fastapi", "react", "postgresql", "docker", "kubernetes", "aws", "gcp", "django", "java", "sql", "git"]

# Experience level keywords
EXPERIENCE_LEVELS = {
    "senior": ["senior", "senior-level", "lead", "principal", "architect"],
    "mid": ["mid", "mid-level", "intermediate", "regular"],
    "junior": ["junior", "junior-level", "entry", "débutant", "trainee"],
    "intern": ["intern", "stagiaire", "étudiant", "apprenti"]
}

# Education level keywords
EDUCATION_LEVELS = {
    "phd": ["phd", "doctorat", "doctorate", "recherche"],
    "master": ["master", "mastère", "msc", "meng"],
    "bachelor": ["licence", "bachelor", "bs", "ba", "ingénieur"],
    "associate": ["associate", "demi-licence"],
    "high_school": ["bac", "baccalauréat", "high school", "lycée", "diplôme d'études secondaires"]
}

# Skill importance weights (higher = more important for most jobs)
def _word_match(keyword: str, text: str) -> bool:
    """Vérifie si un keyword apparaît comme mot entier dans le texte (évite 'bac' dans 'bachelor')."""
    return bool(re.search(r'\b' + re.escape(keyword) + r'\b', text))

SKILL_IMPORTANCE = {
    "python": 1.0,
    "fastapi": 0.9,
    "react": 0.9,
    "postgresql": 0.8,
    "docker": 0.8,
    "kubernetes": 0.7,
    "aws": 0.7,
    "gcp": 0.7,
    "django": 0.8,
    "java": 0.8,
    "sql": 0.7,
    "git": 0.5,
    "communication": 0.6,
    "leadership": 0.6,
    "teamwork": 0.5
}

# Advanced skill synonyms and variations
SKILL_SYNONYMS = {
    "python": ["python3", "python 3", "py", "python programming"],
    "fastapi": ["fast api", "fastapi.py"],
    "react": ["reactjs", "react js", "react.js"],
    "postgresql": ["postgres", "psql", "postgresql", "postgreSQL"],
    "docker": ["container", "containers"],
    "kubernetes": ["k8s", "kube"],
    "aws": ["amazon web services", "aws services"],
    "gcp": ["google cloud platform", "google cloud"],
    "django": ["django framework"],
    "java": ["java programming", "java development"],
    "sql": ["sql query", "sql database"],
    "git": ["git version control", "git hub", "github"],
    "communication": ["communication skills", "verbal communication"],
    "leadership": ["team leadership", "management"],
    "teamwork": ["collaboration", "team player"]
}

# Poids pour les différents critères de matching
SKILL_WEIGHT = 0.6
EXPERIENCE_WEIGHT = 0.25
EDUCATION_WEIGHT = 0.15

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
    Utilise l'analyse IA locale avec fallback sur l'extraction statique.
    """
    # 0. Analyse IA avec fallback
    analyzer = get_resume_analyzer()
    try:
        ai_result = analyzer.analyze(extracted_text)
        if ai_result.confidence >= CONFIDENCE_THRESHOLD and ai_result.skills:
            logger.info("Extraction IA utilisée (confiance: %.2f, compétences: %s)", ai_result.confidence, ai_result.skills)
            candidate_skills = ai_result.skills
            # Utiliser les niveaux IA si détectés
            ai_experience = ai_result.experience_level
            ai_education = ai_result.education_level
        else:
            logger.info("Confiance IA faible (%.2f), fallback sur extraction statique", ai_result.confidence)
            ai_experience = None
            ai_education = None
    except Exception as e:
        logger.warning("Erreur analyse IA: %s, fallback statique", e)
        ai_experience = None
        ai_education = None

    # 1. Récupération des compétences requises depuis le champ JSON du job
    job_skills = []
    if job.required_skills:
        if isinstance(job.required_skills, list):
            job_skills = job.required_skills
        elif isinstance(job.required_skills, dict):
            # Si c'est un dict, extraire les clés (compétences) ou la valeur si c'est un objet de compétences
            job_skills = list(job.required_skills.keys()) if job.required_skills else []
    
    # 2. Calcul du score de correspondance des compétences (amélioré)
    skill_match_score = 0
    skill_details = {}
    
    # Calculer le nombre de compétences correspondantes
    matched_count = 0
    total_importance = 0
    
    for skill in job_skills:
        # Normaliser la comparaison (minuscules, supprimer les espaces)
        normalized_skill = skill.lower().strip()
        
        # Vérifier la correspondance exacte d'abord
        is_exact_match = any(normalized_skill == cskill.lower().strip() for cskill in candidate_skills)
        
        # Si pas de correspondance exacte, essayer la correspondance floue (simulée)
        is_fuzzy_match = False
        if not is_exact_match:
            # Correspondance floue: uniquement si la skill est un suffixe/préfixe légitime
            # Ex: "react" matche "reactjs", "react.js" — mais "java" ne matche PAS "javascript"
            for cskill in candidate_skills:
                cskill_lower = cskill.lower().strip()
                # Seulement si la skill candidat CONTIENT la skill demandée COMME MOT ENTIER
                if _word_match(normalized_skill, cskill_lower):
                    is_fuzzy_match = True
                    break
        
        # Vérifier les synonymes
        is_synonym_match = False
        for main_skill, synonyms in SKILL_SYNONYMS.items():
            if normalized_skill == main_skill.lower().strip():
                for synonym in synonyms:
                    if synonym.lower() in [cskill.lower().strip() for cskill in candidate_skills]:
                        is_synonym_match = True
                        break
                if is_synonym_match:
                    break
        
        is_matched = is_exact_match or is_fuzzy_match or is_synonym_match
        
        if is_matched:
            matched_count += 1
        
        # Calculer l'importance de la compétence
        skill_importance = SKILL_IMPORTANCE.get(normalized_skill, 0.5)
        total_importance += skill_importance
        
        skill_details[skill] = {
            "matched": is_matched, 
            "weight": SKILL_WEIGHT * 100,
            "importance": skill_importance,
            "exact_match": is_exact_match,
            "fuzzy_match": is_fuzzy_match,
            "synonym_match": is_synonym_match
        }
    
    # Calculer le score de correspondance des compétences
    # SKILL_WEIGHT représente le poids total de toutes les compétences
    # Chaque compétence correspondante contribue à (SKILL_WEIGHT * 100) * importance
    if job_skills and total_importance > 0:
        skill_match_score = (matched_count / len(job_skills)) * (SKILL_WEIGHT * 100)
        # Ajuster en fonction de l'importance totale
        skill_match_score = skill_match_score * (total_importance / len(job_skills))
    else:
        skill_match_score = 0
    
    # 3. Évaluation de l'expérience basée sur les niveaux d'expérience
    experience_match = 0
    extracted_text_lower = extracted_text.lower()
    experience_level_order = ["intern", "junior", "mid", "senior"]
    
    # Détecter le niveau d'expérience du candidat
    # Préférer l'extraction IA si disponible
    candidate_experience_level = ai_experience if (ai_experience and ai_experience != "unknown") else "unknown"
    if candidate_experience_level == "unknown":
        for level in experience_level_order:
            keywords = EXPERIENCE_LEVELS[level]
            if any(_word_match(kw, extracted_text_lower) for kw in keywords):
                candidate_experience_level = level
                break
    
    # Détecter le niveau d'expérience requis par le job
    job_experience_level = "unknown"
    job_text_lower = job.description.lower()
    for level in experience_level_order:
        keywords = EXPERIENCE_LEVELS[level]
        if any(_word_match(kw, job_text_lower) for kw in keywords):
            job_experience_level = level
            break
    
    # Calculer le score d'expérience
    if candidate_experience_level != "unknown" and job_experience_level != "unknown":
        # Même niveau d'expérience
        if candidate_experience_level == job_experience_level:
            experience_match = EXPERIENCE_WEIGHT * 100
        # Candidat plus expérimenté
        elif experience_level_order.index(candidate_experience_level) > experience_level_order.index(job_experience_level):
            experience_match = EXPERIENCE_WEIGHT * 80
        # Candidat moins expérimenté
        else:
            experience_match = EXPERIENCE_WEIGHT * 60
    else:
        # Fallback sur la longueur du CV si les niveaux ne sont pas détectés
        experience_match = min(len(extracted_text) / 200, 100) * (EXPERIENCE_WEIGHT / 1.0)
    
    # 4. Évaluation de l'éducation basée sur les niveaux d'éducation
    education_score = 0
    extracted_text_lower = extracted_text.lower()
    education_level_order = ["high_school", "associate", "bachelor", "master", "phd"]
    
    # Détecter le niveau d'éducation du candidat
    # Préférer l'extraction IA si disponible
    candidate_education_level = ai_education if (ai_education and ai_education != "unknown") else "unknown"
    if candidate_education_level == "unknown":
        for level in education_level_order:
            keywords = EDUCATION_LEVELS[level]
            if any(_word_match(kw, extracted_text_lower) for kw in keywords):
                candidate_education_level = level
                break
    
    # Détecter le niveau d'éducation requis par le job (si spécifié dans la description)
    job_education_level = "unknown"
    job_text_lower = job.description.lower()
    for level in education_level_order:
        keywords = EDUCATION_LEVELS[level]
        if any(_word_match(kw, job_text_lower) for kw in keywords):
            job_education_level = level
            break
    
    # Calculer le score d'éducation
    if candidate_education_level != "unknown":
        if job_education_level != "unknown":
            # Même niveau d'éducation
            if candidate_education_level == job_education_level:
                education_score = EDUCATION_WEIGHT * 100
            # Candidat plus éduqué
            elif education_level_order.index(candidate_education_level) > education_level_order.index(job_education_level):
                education_score = EDUCATION_WEIGHT * 90
            # Candidat moins éduqué
            else:
                education_score = EDUCATION_WEIGHT * 70
        else:
            # Pas de niveau d'éducation requis, donner un bonus pour tout niveau d'éducation
            education_score = EDUCATION_WEIGHT * 50
    
    # 5. Calcul du score global
    overall_score = skill_match_score + experience_match + education_score
    
    # 6. Déterminer le stage recommandé basé sur le score
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
