@router.get("/cv/{file_key:path}")
async def get_secure_cv_url(file_key: str):
    """
    Génère une URL signée temporaire pour visualiser le CV en toute sécurité
    """
    storage_service = AsyncStorageService()
    try:
        presigned_url = await storage_service.generate_presigned_url(file_key, expires_in=3600)
        return {"download_url": presigned_url}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Impossible de générer le lien d'accès au fichier"
        )