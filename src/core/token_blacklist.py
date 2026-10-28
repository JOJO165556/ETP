"""Blacklist Redis des refresh tokens revoques (logout, rotation).

Chaque refresh token porte un identifiant unique ``jti``. A la revocation on
stocke une cle ``blacklist:refresh_token:<jti>`` avec un TTL egal au temps de
vie restant du token : aucune entree ne survit a l'expiration du JWT.

Redis est un composant optionnel pour la disponibilite : si le stockage est
injoignable, la revocation est journalisee mais ne bloque pas la reponse. La
verification (au refresh) echoue alors en mode ouvert afin de ne pas couper
toutes les sessions lors d'une panne Redis.
"""
import logging
from datetime import datetime, timezone

from src.core.config import settings

logger = logging.getLogger(__name__)

REDIS_KEY_PREFIX = "blacklist:refresh_token:"

_redis_client = None


async def _get_redis():
    """Client Redis asynchrone paresseux (retourne None si indisponible)."""
    global _redis_client
    if _redis_client is None:
        try:
            import redis.asyncio as aioredis

            _redis_client = aioredis.from_url(
                str(settings.REDIS_URL),
                decode_responses=True,
                socket_connect_timeout=2,
                socket_timeout=2,
            )
        except Exception as exc:  # pragma: no cover - depend de l'environnement
            logger.warning("Redis indisponible, blacklist des tokens desactivee: %s", exc)
            return None
    return _redis_client


def _remaining_seconds(expires_at: datetime | None) -> int:
    if expires_at is None:
        return 0
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return int((expires_at - datetime.now(timezone.utc)).total_seconds())


async def revoke_refresh_token(jti: str, expires_at: datetime | None) -> bool:
    """Ajoute un refresh token a la blacklist jusqu'a son expiration.

    Retourne ``True`` si la revocation a ete persistee, ``False`` sinon.
    """
    if not jti:
        return False

    ttl = _remaining_seconds(expires_at)
    if ttl <= 0:
        # Token deja expire : rien a revoquer.
        return True

    redis = await _get_redis()
    if redis is None:
        return False

    try:
        await redis.set(f"{REDIS_KEY_PREFIX}{jti}", "revoked", ex=ttl)
        return True
    except Exception as exc:  # pragma: no cover - depend de l'environnement
        logger.warning("Echec de revocation du refresh token %s: %s", jti, exc)
        return False


async def is_refresh_token_revoked(jti: str | None) -> bool:
    """Indique si un refresh token a ete revoque."""
    if not jti:
        return False

    redis = await _get_redis()
    if redis is None:
        return False

    try:
        return bool(await redis.exists(f"{REDIS_KEY_PREFIX}{jti}"))
    except Exception as exc:  # pragma: no cover - depend de l'environnement
        logger.warning("Echec de verification de la blacklist pour %s: %s", jti, exc)
        return False
