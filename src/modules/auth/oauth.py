"""Routeur OAuth — Social Login (Google & LinkedIn) via Authlib."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from authlib.integrations.httpx_client import AsyncOAuth2Client

from src.core.config import settings
from src.core.database import get_db
from src.core.security import create_access_token, create_refresh_token
from src.modules.users.models import UserRole
from src.modules.users.repository import UserRepository

router = APIRouter(prefix="/auth", tags=["Social Login"])

# URL de base du frontend pour la redirection finale
FRONTEND_ORIGIN = "http://localhost:3000"

# Configuration des providers OAuth supportés
PROVIDERS: dict = {
    "google": {
        "authorize_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "token_url": "https://oauth2.googleapis.com/token",
        "userinfo_url": "https://www.googleapis.com/oauth2/v3/userinfo",
        "scope": "openid email profile",
    },
    "linkedin": {
        "authorize_url": "https://www.linkedin.com/oauth/v2/authorization",
        "token_url": "https://www.linkedin.com/oauth/v2/accessToken",
        "userinfo_url": "https://api.linkedin.com/v2/userinfo",
        "scope": "openid profile email",
    },
}


def _resolve_credentials(provider: str) -> tuple[str, str]:
    """Retourne (client_id, client_secret) pour un provider ou lève une HTTPException."""
    if provider == "google":
        client_id = settings.GOOGLE_CLIENT_ID
        client_secret = settings.GOOGLE_CLIENT_SECRET
    elif provider == "linkedin":
        client_id = settings.LINKEDIN_CLIENT_ID
        client_secret = settings.LINKEDIN_CLIENT_SECRET
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Provider OAuth non supporté : {provider}",
        )

    if not client_id or not client_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                f"Le provider '{provider}' n'est pas encore configuré. "
                "Ajoutez les clés CLIENT_ID et CLIENT_SECRET dans votre fichier .env."
            ),
        )
    return client_id, client_secret


def _build_redirect_uri(request: Request, provider: str) -> str:
    """Construit l'URI de callback absolu attendu par le provider OAuth."""
    return str(request.base_url).rstrip("/") + f"{settings.API_V1_STR}/auth/{provider}/callback"


@router.get("/{provider}/login", summary="Lancer le flux OAuth pour un provider")
async def oauth_login(provider: str, request: Request):
    """
    Redirige l'utilisateur vers la page de consentement OAuth du provider.
    Providers supportés : google, linkedin.
    """
    config = PROVIDERS.get(provider)
    if not config:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Provider inconnu : {provider}")

    client_id, _ = _resolve_credentials(provider)
    redirect_uri = _build_redirect_uri(request, provider)

    async with AsyncOAuth2Client(
        client_id=client_id,
        redirect_uri=redirect_uri,
        scope=config["scope"],
    ) as client:
        uri, _ = client.create_authorization_url(config["authorize_url"])

    return RedirectResponse(uri)


@router.get("/{provider}/callback", summary="Callback OAuth après authentification")
async def oauth_callback(
    provider: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Reçoit le code d'autorisation du provider OAuth.
    - Échange le code contre un access token.
    - Récupère l'email et les informations du profil utilisateur.
    - Crée un compte candidat automatiquement si l'email n'existe pas en base.
    - Génère les tokens JWT ETP et redirige vers /auth-callback côté frontend.
    """
    config = PROVIDERS.get(provider)
    if not config:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Provider inconnu : {provider}")

    client_id, client_secret = _resolve_credentials(provider)
    redirect_uri = _build_redirect_uri(request, provider)

    async with AsyncOAuth2Client(
        client_id=client_id,
        client_secret=client_secret,
        redirect_uri=redirect_uri,
        scope=config["scope"],
    ) as client:
        # Échange du code d'autorisation contre un access token OAuth
        try:
            await client.fetch_token(
                config["token_url"],
                authorization_response=str(request.url),
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Erreur lors de l'échange de token OAuth : {exc}",
            ) from exc

        # Récupération des informations utilisateur depuis le provider
        resp = await client.get(config["userinfo_url"])
        if resp.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Impossible de récupérer les informations du compte social.",
            )
        userinfo: dict = resp.json()

    email: Optional[str] = userinfo.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="L'adresse email n'a pas pu être récupérée depuis le provider OAuth.",
        )

    # Récupération ou création automatique du compte utilisateur
    user_repo = UserRepository(db)
    user = await user_repo.get_by_email(email)

    if not user:
        # Nouveau compte : rôle CANDIDATE par défaut pour le Social Login
        raw_name: str = userinfo.get("name") or ""
        parts = raw_name.split(" ", 1)
        first_name: str = userinfo.get("given_name") or (parts[0] if parts else "")
        last_name: str = userinfo.get("family_name") or (parts[1] if len(parts) > 1 else "")

        user = await user_repo.create({
            "email": email,
            "hashed_password": "",  # Pas de mot de passe : authentification 100% OAuth
            "role": UserRole.CANDIDATE,
        })

        # Enrichissement du profil avec les informations récupérées depuis le provider
        if first_name or last_name:
            from src.modules.users.repository import UserProfileRepository
            profile_repo = UserProfileRepository(db)
            await profile_repo.update_by_user_id(str(user.id), {
                "first_name": first_name,
                "last_name": last_name,
            })

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ce compte a été désactivé.",
        )

    await db.commit()

    # Génération des tokens JWT ETP (indépendants du token OAuth du provider)
    access_token = create_access_token(subject=str(user.id))
    refresh_token = create_refresh_token(subject=str(user.id))

    # Détermine la page de destination selon le statut du profil candidat
    profile_complete = user.profile and user.profile.cv_key
    if user.role == UserRole.CANDIDATE and not profile_complete:
        next_page = "/cv-upload"
    else:
        next_page = "/overview"

    # Redirection vers le frontend qui se chargera de sécuriser les cookies HttpOnly
    return RedirectResponse(
        f"{FRONTEND_ORIGIN}/auth-callback"
        f"?access_token={access_token}"
        f"&refresh_token={refresh_token}"
        f"&next={next_page}"
    )
