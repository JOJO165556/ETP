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
    "facebook": {
        "authorize_url": "https://www.facebook.com/v19.0/dialog/oauth",
        "token_url": "https://graph.facebook.com/v19.0/oauth/access_token",
        "userinfo_url": "https://graph.facebook.com/me?fields=id,name,email,first_name,last_name",
        "scope": "email public_profile",
    },
}


def _resolve_credentials(provider: str) -> tuple[str, str]:
    """Retourne (client_id, client_secret) pour un provider ou lève une HTTPException."""
    if provider == "google":
        client_id = settings.GOOGLE_CLIENT_ID
        client_secret = settings.GOOGLE_CLIENT_SECRET
    elif provider == "facebook":
        client_id = settings.FACEBOOK_CLIENT_ID
        client_secret = settings.FACEBOOK_CLIENT_SECRET
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
    code = request.query_params.get("code")

    if not code:
        raise HTTPException(status_code=400, detail="Code d'autorisation manquant.")

    import httpx
    import logging
    logger = logging.getLogger(__name__)

    async with httpx.AsyncClient() as http_client:
        # 1. Échange du code contre un access token
        token_resp = await http_client.post(
            config["token_url"],
            data={
                "client_id": client_id,
                "client_secret": client_secret,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": redirect_uri,
            },
            headers={"Accept": "application/json"}
        )

        if token_resp.status_code != 200:
            logger.error(f"OAuth token error: {token_resp.text}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Erreur lors de l'échange de token OAuth : {token_resp.text}",
            )
        
        token_data = token_resp.json()
        access_token = token_data.get("access_token")

        if not access_token:
            raise HTTPException(status_code=400, detail="Access token manquant dans la réponse du provider.")

        # 2. Récupération des informations utilisateur
        userinfo_resp = await http_client.get(
            config["userinfo_url"],
            headers={"Authorization": f"Bearer {access_token}"}
        )

        if userinfo_resp.status_code != 200:
            logger.error(f"OAuth userinfo error: {userinfo_resp.text}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Impossible de récupérer les informations du compte social.",
            )
        
        userinfo: dict = userinfo_resp.json()

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
    from src.modules.users.repository import UserProfileRepository
    profile_repo = UserProfileRepository(db)
    profile = await profile_repo.get_by_user_id(str(user.id))
    
    profile_complete = profile and profile.cv_key
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
