from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.config import settings
from src.core.database import get_db
from src.core.security import (
    get_password_hash,
    create_access_token, create_refresh_token,
    create_password_reset_token, verify_password_reset_token,
)
from src.modules.auth.schemas import (
    Token, RegisterRequest, RefreshTokenRequest, ChangePasswordRequest,
    FirebaseLoginRequest, ForgotPasswordRequest, ResetPasswordRequest,
    ResendVerificationRequest
)
from src.modules.auth.constants import UNVERIFIED_EMAIL_DETAIL
from src.modules.auth.dependencies import get_current_user
from src.modules.auth.services import AuthService
from src.core.firebase import extract_app_check_token, extract_provider, verify_app_check_token, verify_id_token
from src.modules.users.models import User, UserRole, AuthProvider
from src.modules.users.repository import UserRepository

router = APIRouter(prefix="/auth", tags=["Authentification"])

# Emails de secours pour les comptes sans email dans le provider (ex: Phone)
_FALLBACK_EMAIL_SUFFIX = "@firebase.local"


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


@router.post("/logout", status_code=200, summary="Se déconnecter (révoque le refresh token)")
async def logout(
    body: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
):
    """Inscrit le refresh token en blacklist Redis jusqu'à son expiration."""
    service = AuthService(db)
    return await service.logout(body.refresh_token)


@router.get("/verify-email", status_code=200, summary="Vérifier son adresse email")
async def verify_email(
    token: str = Query(..., description="Token de vérification reçu par email"),
    db: AsyncSession = Depends(get_db),
):
    """Active le compte à partir du token signé envoyé par email (24h)."""
    service = AuthService(db)
    return await service.verify_email(token)


@router.post(
    "/resend-verification",
    status_code=200,
    summary="Renvoyer le lien de vérification d'email",
)
async def resend_verification(
    body: ResendVerificationRequest,
    db: AsyncSession = Depends(get_db),
):
    """Réponse générique (anti-énumération) et envoi limité en fréquence."""
    service = AuthService(db)
    return await service.resend_verification(str(body.email))


@router.post("/change-password", summary="Changer de mot de passe")
async def change_password(
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = AuthService(db)
    return await service.change_password(str(current_user.id), body)


@router.post("/firebase", response_model=Token, summary="Se connecter via un ID token Firebase")
async def firebase_login(
    body: FirebaseLoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Token:
    """
    Recoit un ID token Firebase (issu du SDK client : email/password, Google,
    Facebook ou Phone). Le verifie cote serveur avec firebase-admin, cree ou
    lie le compte local (firebase_uid) puis emet les JWT ETP.
    """
    app_check_token = await extract_app_check_token(request)
    if not verify_app_check_token(app_check_token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Verification App Check echouee.",
        )

    claims = verify_id_token(body.id_token)
    if claims is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="ID token Firebase invalide.",
        )

    firebase_uid: str | None = claims.get("uid")
    email: str | None = claims.get("email")
    if not firebase_uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="ID token Firebase sans identifiant utilisateur.",
        )

    # Les comptes sans email (Phone pur) utilisent un email de substitution
    if not email:
        email = f"{firebase_uid}{_FALLBACK_EMAIL_SUFFIX}"

    provider_name = extract_provider(claims)
    try:
        auth_provider = AuthProvider(provider_name)
    except ValueError:
        auth_provider = AuthProvider.EMAIL

    # Les providers sociaux et Phone verifient deja l'identite a la source.
    # Pour email/password (Firebase), on se fie au claim email_verified.
    email_verified = bool(claims.get("email_verified")) or auth_provider in (
        AuthProvider.GOOGLE,
        AuthProvider.FACEBOOK,
        AuthProvider.PHONE,
    )

    user_repo = UserRepository(db)
    user = await user_repo.get_by_firebase_uid(firebase_uid)

    if user is None:
        # Lien par email si un compte local existe deja sans UID Firebase
        user = await user_repo.get_by_email(email)
        if user is not None:
            user.firebase_uid = firebase_uid
            user.auth_provider = auth_provider
            if email_verified:
                user.is_verified = True
        else:
            # Self-service (social ou email) : autorise candidat ou recruteur.
            # company_admin et superadmin restent strictement protégés.
            valid_roles = (UserRole.CANDIDATE, UserRole.RECRUITER, "candidate", "recruiter")
            if body.role is not None and body.role not in valid_roles:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Role non autorise lors de la creation via Firebase.",
                )
            target_role = UserRole.RECRUITER if body.role in (UserRole.RECRUITER, "recruiter") else UserRole.CANDIDATE
            user = await user_repo.create({
                "email": email,
                "firebase_uid": firebase_uid,
                "hashed_password": "",  # Auth 100% Firebase : aucun mot de passe local
                "role": target_role,
                "auth_provider": auth_provider,
                "is_verified": email_verified,
            })

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ce compte a ete desactive.",
        )

    # Le bypass d'authentification Firebase ne doit pas contourner la
    # verification d'email obligatoire pour les comptes email/password.
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=UNVERIFIED_EMAIL_DETAIL,
        )

    # Inscription 100% Firebase : projection du profil (nom) si fourni.
    # NB : UserRepository.create cree deja le profil vide automatiquement.
    if body.first_name or body.last_name:
        from src.modules.users.repository import UserProfileRepository
        profile_repo = UserProfileRepository(db)
        profile = await profile_repo.get_by_user_id(str(user.id))
        if profile:
            if body.first_name:
                profile.first_name = body.first_name
            if body.last_name:
                profile.last_name = body.last_name
        else:
            await profile_repo.create({
                "user_id": str(user.id),
                "first_name": body.first_name,
                "last_name": body.last_name,
            })

    await db.commit()

    access_token = create_access_token(subject=str(user.id))
    refresh_token = create_refresh_token(subject=str(user.id))
    return Token(access_token=access_token, refresh_token=refresh_token)


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
        "is_verified": current_user.is_verified,
        "profile_complete": profile_complete,
    }


@router.post("/forgot-password", status_code=200, summary="Demander la réinitialisation du mot de passe")
async def forgot_password(
    body: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Génère un token de réinitialisation pour l'email donné.
    Répond toujours 200 pour éviter l'énumération d'emails.
    En production, ce token serait envoyé par email (ex: SendGrid).
    """
    import logging
    logger = logging.getLogger(__name__)

    email = str(body.email)
    if not email:
        return {"message": "Si cet email est enregistré, un lien vous a été envoyé."}

    user_repo = UserRepository(db)
    user = await user_repo.get_by_email(email)

    if user and user.is_active:
        reset_token = create_password_reset_token(email)
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"

        # Envoi de l'email via le moteur de templates Jinja2 (reset_password.html)
        from src.core.email import send_templated_email_now
        try:
            await send_templated_email_now(
                to_email=email,
                subject="Réinitialisation de votre mot de passe - ETP",
                template_name="reset_password",
                context={
                    "reset_url": reset_url,
                    "expires_hours": 1,
                },
            )
        except Exception as e:
            logger.error(f"Erreur envoi email réinitialisation mot de passe: {e}")

        logger.info(f"Lien de réinitialisation généré pour {email}: {reset_url}")

    return {"message": "Si cet email est enregistré, un lien vous a été envoyé."}


@router.post("/reset-password", status_code=200, summary="Réinitialiser le mot de passe via un token")
async def reset_password(
    body: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Accepte un token de réinitialisation valide et met à jour le mot de passe."""
    token = body.token
    new_password = body.new_password

    email = verify_password_reset_token(token)
    if not email:
        raise HTTPException(status_code=400, detail="Token invalide ou expiré.")

    user_repo = UserRepository(db)
    user = await user_repo.get_by_email(email)

    if not user or not user.is_active:
        raise HTTPException(status_code=400, detail="Compte introuvable ou désactivé.")

    user.hashed_password = get_password_hash(new_password)
    await db.commit()
    return {"message": "Mot de passe réinitialisé avec succès."}
