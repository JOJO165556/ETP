"""Service d'authentification."""
import hashlib
import logging
from datetime import datetime, timezone

from fastapi import HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core import token_blacklist
from src.core.config import settings
from src.core.rate_limit import RateLimiter
from src.core.security import (
    verify_password, get_password_hash,
    create_access_token, create_refresh_token,
    verify_refresh_token,
    create_email_verification_token, verify_email_verification_token,
)
from src.core.firebase import provision_user
from src.modules.auth.constants import UNVERIFIED_EMAIL_DETAIL
from src.modules.auth.schemas import Token, RegisterRequest, ChangePasswordRequest
from src.modules.users.models import User, UserRole
from src.modules.users.repository import UserRepository

logger = logging.getLogger(__name__)

GENERIC_RESEND_MESSAGE = (
    "Si ce compte existe et n'est pas encore vérifié, "
    "un email de confirmation a été envoyé."
)
RESEND_RATE_LIMIT = 3
RESEND_RATE_WINDOW = 3600  # 1 heure


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)

    async def authenticate_user(self, form_data: OAuth2PasswordRequestForm) -> Token:
        """Verifie les identifiants et genere un JWT + refresh token."""
        user = await self.user_repo.get_by_email(form_data.username)
        
        if not user or not verify_password(form_data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email ou mot de passe incorrect",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ce compte utilisateur a ete desactive"
            )

        # Verification d'email obligatoire avant toute emission de session.
        if not user.is_verified:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=UNVERIFIED_EMAIL_DETAIL,
            )
            
        access_token = create_access_token(subject=str(user.id))
        refresh_token = create_refresh_token(subject=str(user.id))
        return Token(access_token=access_token, refresh_token=refresh_token)

    def _decode_refresh_payload(self, refresh_token: str) -> dict:
        """Decode un refresh token et valide son type."""
        try:
            payload = verify_refresh_token(refresh_token)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token invalide ou expire",
            )

        user_id: str | None = payload.get("sub")
        token_type: str | None = payload.get("type")
        if user_id is None or token_type != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token invalide ou expire",
            )
        return payload

    @staticmethod
    def _expires_at(payload: dict) -> datetime | None:
        exp = payload.get("exp")
        if exp is None:
            return None
        try:
            return datetime.fromtimestamp(float(exp), tz=timezone.utc)
        except (TypeError, ValueError, OSError):
            return None

    @staticmethod
    def _token_identifier(payload: dict, refresh_token: str) -> str:
        """Identifiant de revocation : ``jti`` ou empreinte du token legacy.

        Les refresh tokens emis avant l'introduction du ``jti`` restent ainsi
        revocables (empreinte SHA-256 du token brut).
        """
        jti = payload.get("jti")
        if jti:
            return str(jti)
        return hashlib.sha256(refresh_token.encode("utf-8")).hexdigest()

    async def refresh_access_token(self, refresh_token: str) -> Token:
        """Valide un refresh token et genere de nouveaux tokens.

        Le token presente est revoque apres rotation (usage unique). Tout token
        inscrit en blacklist (logout) est rejete avec un 401.
        """
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token invalide ou expire",
        )

        payload = self._decode_refresh_payload(refresh_token)
        user_id = payload.get("sub")
        token_id = self._token_identifier(payload, refresh_token)

        if await token_blacklist.is_refresh_token_revoked(token_id):
            raise credentials_exception

        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalars().first()
        
        if user is None or not user.is_active:
            raise credentials_exception

        # Rotation : le refresh token utilise ne doit plus pouvoir l'etre.
        await token_blacklist.revoke_refresh_token(
            token_id, self._expires_at(payload)
        )

        new_access = create_access_token(subject=str(user.id))
        new_refresh = create_refresh_token(subject=str(user.id))
        return Token(access_token=new_access, refresh_token=new_refresh)

    async def logout(self, refresh_token: str) -> dict:
        """Revoque le refresh token fourni (blacklist Redis jusqu'a expiration)."""
        payload = self._decode_refresh_payload(refresh_token)
        token_id = self._token_identifier(payload, refresh_token)
        await token_blacklist.revoke_refresh_token(
            token_id, self._expires_at(payload)
        )
        return {"message": "Déconnexion réussie."}

    async def register(self, data: RegisterRequest) -> Token:
        """Inscrit un nouvel utilisateur et retourne les tokens.

        Le rôle est *toujours* CANDIDATE : aucun rôle ne peut être fourni par
        le client (RegisterRequest n'expose pas de champ role).
        """
        existing = await self.user_repo.get_by_email(data.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Un compte avec cet email existe deja"
            )

        user = await self.user_repo.create({
            "email": data.email,
            "hashed_password": get_password_hash(data.password),
            "role": UserRole.CANDIDATE,
            "is_active": True,
            "is_verified": False,
        })

        # Mettre a jour le profil si fourni
        if data.first_name or data.last_name:
            from src.modules.users.repository import UserProfileRepository
            profile_repo = UserProfileRepository(self.db)
            await profile_repo.update_by_user_id(str(user.id), {
                "first_name": data.first_name,
                "last_name": data.last_name,
            })

        # Provisionner le compte dans Firebase (email/password). Echec non bloquant.
        display_name = None
        if data.first_name or data.last_name:
            display_name = " ".join(filter(None, [data.first_name, data.last_name]))
        firebase_uid = await provision_user(
            email=data.email,
            password=data.password,
            user_id=str(user.id),
            display_name=display_name,
        )

        if firebase_uid:
            user.firebase_uid = firebase_uid
            user.auth_provider = "email"
            await self.db.flush()

        await self.db.commit()

        # Envoi asynchrone du lien de confirmation (non bloquant).
        self._enqueue_verification_email(user, first_name=data.first_name)

        access_token = create_access_token(subject=str(user.id))
        refresh_token = create_refresh_token(subject=str(user.id))
        return Token(access_token=access_token, refresh_token=refresh_token)

    def _enqueue_verification_email(self, user: User, first_name: str | None = None) -> None:
        """Programme l'envoi du mail de verification via Celery.

        Un echec de broker ne doit jamais faire echouer l'inscription : le
        compte existe et l'utilisateur pourra demander un nouveau lien.
        """
        token = create_email_verification_token(str(user.id))
        verification_url = (
            f"{settings.FRONTEND_URL.rstrip('/')}/verify-email?token={token}"
        )
        context = {
            "verification_url": verification_url,
            "expires_hours": settings.EMAIL_VERIFICATION_EXPIRE_HOURS,
            "first_name": first_name,
        }
        try:
            from src.modules.notifications.tasks import (
                email_queue_available,
                send_templated_email,
            )

            if not email_queue_available():
                logger.warning(
                    "Broker Celery injoignable : email de verification non programme pour %s",
                    user.email,
                )
                return

            send_templated_email.apply_async(
                args=[
                    str(user.email),
                    "Confirmez votre adresse email - ETP",
                    "verify_email",
                    context,
                ],
                retry=False,
            )
        except Exception as exc:  # pragma: no cover - depend de l'environnement
            logger.warning(
                "Impossible de programmer l'email de verification pour %s: %s",
                user.email,
                exc,
            )

    async def verify_email(self, token: str) -> dict:
        """Valide un token de verification et active le compte."""
        user_id = verify_email_verification_token(token)
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token de vérification invalide ou expiré.",
            )

        user = await self.user_repo.get(user_id)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token de vérification invalide ou expiré.",
            )

        if not user.is_verified:
            user.is_verified = True
            user.modified_by = str(user.id)
            await self.db.flush()

        return {
            "message": "Adresse email vérifiée avec succès.",
            "verified": True,
        }

    async def resend_verification(self, email: str) -> dict:
        """Renvoie un lien de verification sans divulguer l'existence du compte.

        La reponse est toujours identique (anti-enumeration) et l'envoi est
        limite en frequence par email hashe (anti-abus).
        """
        if email:
            digest = hashlib.sha256(email.strip().lower().encode("utf-8")).hexdigest()
            limiter = RateLimiter(str(settings.REDIS_URL))
            try:
                limited, _ = await limiter.is_rate_limited(
                    f"rate_limit:resend_verification:{digest}",
                    limit=RESEND_RATE_LIMIT,
                    window=RESEND_RATE_WINDOW,
                )
            except Exception as exc:  # pragma: no cover - depend de l'environnement
                logger.warning("Rate limiting indisponible: %s", exc)
                limited = False

            if not limited:
                user = await self.user_repo.get_by_email(email)
                if user and user.is_active and not user.is_verified:
                    self._enqueue_verification_email(user)

        return {"message": GENERIC_RESEND_MESSAGE}

    async def change_password(self, user_id: str, data: ChangePasswordRequest) -> dict:
        """Change le mot de passe d'un utilisateur."""
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalars().first()

        if not user or not verify_password(data.current_password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mot de passe actuel incorrect"
            )

        user.hashed_password = get_password_hash(data.new_password)
        await self.db.flush()
        return {"message": "Mot de passe modifie avec succes"}
