import asyncio
import pdfplumber
import tempfile
import os
import json
from celery.utils.log import get_task_logger

from src.core.celery_app import celery_app
from src.core.storage import AsyncStorageService
from src.core.database import async_session_maker
from src.modules.applications.repository import ApplicationRepository
from src.modules.users.repository import UserProfileRepository

logger = get_task_logger(__name__)

# Base de connaissances simulée pour l'extraction (en prod, on utiliserait un NLP / LLM / Spacy)
KNOWN_SKILLS = ["python", "fastapi", "react", "postgresql", "docker", "kubernetes", "aws", "gcp", "django", "java", "sql", "git"]

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
    
    parsed_data = {
        "extracted_skills": found_skills,
        "text_length": len(extracted_text),
        # Plus tard, on extraira l'expérience, la formation, etc.
    }
    
    # Simulation d'un score de matching basique basé sur la richesse du CV
    score = min(len(found_skills) * 10, 100)

    # 4. Sauvegarder dans la base de données
    async with async_session_maker() as session:
        repo = ApplicationRepository(session)
        profile_repo = UserProfileRepository(session)
        
        application = await repo.get(application_id)
        if application:
            # Mise à jour de la candidature
            await repo.update(application_id, {
                "parsed_data": parsed_data,
                "matching_score": score
            })
            
            # Mise à jour du Profil (simulation pour compétences et adresse brute)
            # Simulation de l'extraction d'adresse depuis le PDF
            simulated_address = "Paris" if "paris" in text_lower else None
            
            profile = await profile_repo.get_by_user_id(str(application.candidate_id))
            if profile:
                profile_update_data = {}
                # Fusionner les nouvelles skills avec les existantes, ou remplacer
                profile_update_data["skills"] = list(set((profile.skills or []) + found_skills))
                if simulated_address:
                    profile_update_data["raw_address"] = simulated_address
                    
                await profile_repo.update_by_user_id(str(application.candidate_id), profile_update_data)
                
        await session.commit()
        
    logger.info(f"Parsing terminé pour {application_id}. Skills trouvées: {found_skills}")


@celery_app.task(name="parse_resume", bind=True, max_retries=3)
def parse_resume(self, application_id: str, resume_key: str):
    """
    Tâche Celery qui extrait les données d'un CV et met à jour la candidature.
    """
    try:
        # Comme on utilise un ORM et des services asynchrones (aioboto3, sqlalchemy async),
        # on doit créer une boucle d'événement pour exécuter notre code asynchrone dans le worker synchrone.
        asyncio.run(async_parse_resume_task(application_id, resume_key))
    except Exception as exc:
        logger.error(f"Erreur inattendue: {exc}")
        self.retry(exc=exc, countdown=60) # Réessaie dans 60 secondes
