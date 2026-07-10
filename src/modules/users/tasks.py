import asyncio
import os
import tempfile
import logging
import httpx
from celery import shared_task

from src.core.database import async_session_maker
from src.core.storage import AsyncStorageService
from src.modules.users.repository import UserProfileRepository

logger = logging.getLogger(__name__)

# URL du service d'IA dédié (à configurer dans l'environnement si besoin)
AI_SERVICE_URL = os.getenv("AI_EXTRACTION_URL", "http://localhost:8001/api/v1/extract")

async def _process_cv_async(user_id: str, cv_key: str):
    logger.info(f"Début du traitement asynchrone du CV pour l'utilisateur {user_id}")
    storage = AsyncStorageService()
    
    fd, temp_path = tempfile.mkstemp(suffix=".pdf")
    os.close(fd)
    
    try:
        # 1. Télécharger le fichier depuis MinIO
        await storage.download_file(cv_key, temp_path)
        
        # 2. Envoyer le fichier au service d'IA existant
        logger.info(f"Envoi du document à l'IA d'extraction ({AI_SERVICE_URL})...")
        async with httpx.AsyncClient() as client:
            with open(temp_path, "rb") as f:
                response = await client.post(
                    AI_SERVICE_URL,
                    files={"file": (os.path.basename(cv_key), f, "application/pdf")},
                    timeout=60.0
                )
            response.raise_for_status()
            ai_data = response.json()
            
        # L'IA est censée renvoyer un JSON contenant un tableau 'skills'
        extracted_skills = ai_data.get("skills", [])
        logger.info(f"Compétences extraites par l'IA pour {user_id} : {extracted_skills}")
        
        # 3. Mettre à jour le profil avec les résultats
        async with async_session_maker() as session:
            profile_repo = UserProfileRepository(session)
            await profile_repo.update_by_user_id(
                user_id=user_id,
                data={
                    "skills": extracted_skills
                }
            )
            await session.commit()
            
    except httpx.HTTPStatusError as e:
        logger.error(f"L'IA a renvoyé une erreur {e.response.status_code} pour {user_id} : {e.response.text}")
        raise
    except Exception as e:
        logger.error(f"Échec de l'extraction CV pour {user_id}: {e}")
        raise
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@shared_task(name="process_candidate_cv", bind=True, max_retries=3)
def process_candidate_cv(self, user_id: str, cv_key: str):
    """
    Tâche Celery qui orchestre l'envoi du CV à l'IA d'extraction.
    """
    try:
        asyncio.run(_process_cv_async(user_id, cv_key))
        return {"status": "success", "user_id": user_id, "cv_key": cv_key}
    except Exception as exc:
        logger.error(f"La tâche Celery a échoué: {exc}")
        self.retry(exc=exc, countdown=15)
