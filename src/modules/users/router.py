from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.database import get_db
from src.core.storage import AsyncStorageService
from src.modules.users.repository import UserProfileRepository
from src.modules.users.schemas import ProfileResponse

profile_router = APIRouter(prefix="/profile")

@profile_router.post("/upload-cv", response_model=ProfileResponse, status_code=status.HTTP_200_OK, summary="Téléverser un CV candidat")
async def upload_candidate_cv(
    file: UploadFile = File(...),
    x_user_id: str = Header(..., description="ID de l'utilisateur connecté récupéré temporairement via le header"),
    db: AsyncSession = Depends(get_db)
):
    """
    Téléverse le CV d'un candidat au format PDF sur MinIO et associe la clé à son profil
    """
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Seuls les fichiers PDF sont acceptés pour l'analyse ATS."
        )

    storage_service = AsyncStorageService()
    profile_repo = UserProfileRepository(db)

    try:
        file_key = await storage_service.upload_cv(file)
        
        updated_profile = await profile_repo.update_cv_key(
            user_id=x_user_id, 
            cv_key=file_key
        )

        if not updated_profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profil utilisateur introuvable."
            )

        return updated_profile
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Échec du traitement du CV : {str(e)}"
        )


@profile_router.get("/cv/{user_id}", status_code=status.HTTP_200_OK, summary="Obtenir le lien du CV candidat")
async def get_candidate_cv_link(
    user_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Génère une URL signée temporaire (valide 1 heure) permettant au recruteur
    de visionner le CV en toute sécurité sans ouvrir le bucket au public
    """
    profile_repo = UserProfileRepository(db)
    profile = await profile_repo.get_by_user_id(user_id)

    if not profile or not profile.cv_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ce candidat n'a pas encore téléversé de CV."
        )

    storage_service = AsyncStorageService()
    try:
        secure_url = await storage_service.generate_presigned_url(
            file_key=profile.cv_key, 
            expires_in=3600
        )
        return {"download_url": secure_url}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la génération du lien sécurisé : {str(e)}"
        )

# Routeur principal du module utilisateurs
router = APIRouter(prefix="/users", tags=["Utilisateurs"])
router.include_router(profile_router)