from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from src.core.config import settings
from src.core.database import get_db
from src.core.security import (
    verify_password, get_password_hash,
    create_access_token, create_refresh_token,
    verify_refresh_token,
    create_password_reset_token, verify_password_reset_token,
)
from src.modules.auth.schemas import Token, RegisterRequest, RefreshTokenRequest, ChangePasswordRequest
from src.modules.auth.dependencies import get_current_user
from src.modules.auth.services import AuthService
from src.modules.users.models import User
from src.modules.users.repository import UserRepository

router = APIRouter(prefix="/auth", tags=["Authentification"])


@router.post("/login", response_model=Token, summary="Se connecter")
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
) -> Token:
    service = AuthService(db)
    return await service.authenticate_user(form_data)


@router.post("/register", response_model=Token, summary="Créer un compte")
async def register(
    body: RegisterRequest,
    db: AsyncSession = Depends(get_db)
) -> Token:
    service = AuthService(db)
    return await service.register(body)


@router.post("/refresh", response_model=Token, summary="Rafraîchir les tokens")
async def refresh_token(
    body: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db)
) -> Token:
    service = AuthService(db)
    return await service.refresh_access_token(body.refresh_token)


@router.post("/change-password", summary="Changer de mot de passe")
async def change_password(
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = AuthService(db)
    return await service.change_password(str(current_user.id), body)


@router.get("/me", summary="Profil de l'utilisateur connecté")
async def get_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from src.modules.users.repository import UserProfileRepository
    profile_repo = UserProfileRepository(db)
    profile = await profile_repo.get_by_user_id(str(current_user.id))
    profile_complete = bool(profile and profile.cv_key)

    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "role": current_user.role.value,
        "is_active": current_user.is_active,
        "profile_complete": profile_complete,
    }


@router.post("/forgot-password", status_code=200, summary="Demander la réinitialisation du mot de passe")
async def forgot_password(
    body: dict,
    db: AsyncSession = Depends(get_db),
):
    """
    Génère un token de réinitialisation pour l'email donné.
    Répond toujours 200 pour éviter l'énumération d'emails.
    En production, ce token serait envoyé par email (ex: SendGrid).
    """
    import logging
    logger = logging.getLogger(__name__)

    email: str | None = body.get("email")
    if not email:
        return {"message": "Si cet email est enregistré, un lien vous a été envoyé."}

    user_repo = UserRepository(db)
    user = await user_repo.get_by_email(email)

    if user and user.is_active:
        reset_token = create_password_reset_token(email)
        # TODO (production) : envoyer le token par email via SendGrid ou Resend
        # En développement, le lien est affiché dans les logs du serveur
        logger.info(
            "[DEV] Lien de réinitialisation : "
            f"http://localhost:3000/reset-password?token={reset_token}"
        )

    return {"message": "Si cet email est enregistré, un lien vous a été envoyé."}


@router.post("/reset-password", status_code=200, summary="Réinitialiser le mot de passe via un token")
async def reset_password(
    body: dict,
    db: AsyncSession = Depends(get_db),
):
    """Accepte un token de réinitialisation valide et met à jour le mot de passe."""
    token: str | None = body.get("token")
    new_password: str | None = body.get("new_password")

    if not token or not new_password:
        raise HTTPException(status_code=400, detail="Token et nouveau mot de passe requis.")

    email = verify_password_reset_token(token)
    if not email:
        raise HTTPException(status_code=400, detail="Token invalide ou expiré.")

    if len(new_password) < 8:
        raise HTTPException(status_code=422, detail="Le mot de passe doit contenir au moins 8 caractères.")

    user_repo = UserRepository(db)
    user = await user_repo.get_by_email(email)

    if not user or not user.is_active:
        raise HTTPException(status_code=400, detail="Compte introuvable ou désactivé.")

    user.hashed_password = get_password_hash(new_password)
    await db.commit()
    return {"message": "Mot de passe réinitialisé avec succès."}
