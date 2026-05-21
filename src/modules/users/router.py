# src/modules/users/router.py
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.database import get_db  # Ta fonction existante pour récupérer la session DB
from src.core.storage import AsyncStorageService
# Remplace par ton vrai repository de profil utilisateur
from src.modules.users.repository import UserProfileRepository 

router = APIRouter(prefix="/profile", tags=["Candidate Profile"])

@router.post("/upload-cv", status_code=status.HTTP_200_OK)
async def upload_candidate_cv(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    # 1. Validation basique du type de fichier (sécurité)
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Seuls les fichiers PDF sont autorisés pour le CV."
        )

    # 2. Initialisation des services
    storage_service = AsyncStorageService()
    profile_repo = UserProfileRepository(db)

    try:
        # 3. Upload asynchrone vers MinIO
        file_key = await storage_service.upload_cv(file)
        
        # 4. Sauvegarde de la clé du fichier en base de données
        # (Exemple fictif : on met à jour le profil de l'utilisateur connecté)
        # current_user_id = 1  <- À remplacer plus tard par ton système d'authentification
        # await profile_repo.update_cv_path(user_id=current_user_id, cv_key=file_key)

        return {
            "message": "CV téléversé avec succès !",
            "file_key": file_key
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors du traitement du fichier : {str(e)}"
        )