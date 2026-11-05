"""Service OTP : génération, stockage Redis avec fallback mémoire, et envoi via Resend.

Flux :
  1. send_otp(email) : génère un code 6 chiffres, le stocke dans Redis/mémoire (TTL 10 min),
     envoie l'email via Resend API.
  2. verify_otp(email, code) : vérifie et consomme le code (delete after use).
"""
import logging
import random
import string
import time

import httpx

from src.core.config import settings

logger = logging.getLogger(__name__)

OTP_TTL = 600  # 10 minutes
OTP_COOLDOWN = 60  # 60 secondes entre deux demandes d'envoi
OTP_MAX_ATTEMPTS = 5  # Maximum 5 envois par heure par email
OTP_RATE_LIMIT_WINDOW = 3600  # 1 heure
OTP_KEY_PREFIX = "otp:"
OTP_COOLDOWN_PREFIX = "otp_cooldown:"
OTP_ATTEMPTS_PREFIX = "otp_attempts:"

# Fallback en mémoire au cas où Redis est temporairement inaccessible
_MEMORY_OTP: dict[str, tuple[str, float]] = {}
_MEMORY_COOLDOWN: dict[str, float] = {}
_MEMORY_ATTEMPTS: dict[str, list[float]] = {}


def _generate_code(length: int = 6) -> str:
    return "".join(random.choices(string.digits, k=length))


async def _get_redis():
    """Tente d'obtenir un client Redis connecté, ou None si injoignable."""
    try:
        import redis.asyncio as aioredis  # type: ignore[import]
        client = await aioredis.from_url(
            str(settings.REDIS_URL),
            decode_responses=True,
            socket_connect_timeout=1.5,
        )
        await client.ping()
        return client
    except Exception as exc:
        logger.debug("Redis non joignable pour OTP, bascule sur memoire locale : %s", exc)
        return None


async def send_otp(email: str) -> bool:
    """Génère et stocke un code OTP, puis envoie l'email si configuré.
    
    Retourne toujours True si le code a été généré et stocké avec succès.
    Lève HTTPException 429 si le cooldown ou le quota horaire est dépassé.
    """
    normalized_email = email.strip().lower()
    now = time.time()
    redis = await _get_redis()

    if redis is not None:
        try:
            cooldown_key = f"{OTP_COOLDOWN_PREFIX}{normalized_email}"
            attempts_key = f"{OTP_ATTEMPTS_PREFIX}{normalized_email}"
            key = f"{OTP_KEY_PREFIX}{normalized_email}"

            # 1. Vérification du cooldown (60s)
            in_cooldown = await redis.exists(cooldown_key)
            if in_cooldown:
                ttl = await redis.ttl(cooldown_key)
                await redis.aclose()
                from fastapi import HTTPException, status
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Veuillez patienter {ttl} secondes avant de demander un nouveau code.",
                )

            # 2. Vérification du quota horaire (max 5 demandes / heure)
            attempts = await redis.incr(attempts_key)
            if attempts == 1:
                await redis.expire(attempts_key, OTP_RATE_LIMIT_WINDOW)
            elif attempts > OTP_MAX_ATTEMPTS:
                await redis.aclose()
                from fastapi import HTTPException, status
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Trop de demandes de code. Veuillez réessayer dans une heure.",
                )

            code = _generate_code()
            await redis.set(key, code, ex=OTP_TTL)
            await redis.set(cooldown_key, "1", ex=OTP_COOLDOWN)
            await redis.aclose()
        except Exception as exc:
            # Si HTTPException 429 a été levée, on la propage
            from fastapi import HTTPException
            if isinstance(exc, HTTPException):
                raise
            logger.warning("Erreur Redis OTP, bascule memoire: %s", exc)
            redis = None

    if redis is None:
        # Gestion cooldown mémoire
        if normalized_email in _MEMORY_COOLDOWN:
            expiry = _MEMORY_COOLDOWN[normalized_email]
            if now < expiry:
                ttl = int(expiry - now)
                from fastapi import HTTPException, status
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Veuillez patienter {ttl} secondes avant de demander un nouveau code.",
                )

        # Gestion quota horaire mémoire
        attempts_list = _MEMORY_ATTEMPTS.get(normalized_email, [])
        attempts_list = [t for t in attempts_list if now - t < OTP_RATE_LIMIT_WINDOW]
        if len(attempts_list) >= OTP_MAX_ATTEMPTS:
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Trop de demandes de code. Veuillez réessayer dans une heure.",
            )
        attempts_list.append(now)
        _MEMORY_ATTEMPTS[normalized_email] = attempts_list

        code = _generate_code()
        _MEMORY_OTP[normalized_email] = (code, now + OTP_TTL)
        _MEMORY_COOLDOWN[normalized_email] = now + OTP_COOLDOWN

    # Envoi d'email via Resend si clé API présente
    if not settings.RESEND_API_KEY:
        logger.info(
            "RESEND_API_KEY non configuree : code OTP pour %s : %s",
            normalized_email,
            code,
        )
        return True

    payload = {
        "from": f"ETP <{settings.RESEND_FROM_EMAIL}>",
        "to": [normalized_email],
        "subject": "Votre code de connexion ETP",
        "html": _build_email_html(code),
        "text": f"Votre code de vérification ETP est : {code}\n\nIl expire dans 10 minutes.",
    }

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
        if resp.status_code not in (200, 201):
            logger.warning("Resend echec (%s) : %s", resp.status_code, resp.text[:200])
            # Si le domaine n'est pas encore vérifié sur Resend, tentative automatique avec onboarding@resend.dev
            if "not verified" in resp.text.lower():
                payload["from"] = "ETP <onboarding@resend.dev>"
                async with httpx.AsyncClient(timeout=10) as client:
                    retry_resp = await client.post(
                        "https://api.resend.com/emails",
                        headers={
                            "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                            "Content-Type": "application/json",
                        },
                        json=payload,
                    )
                if retry_resp.status_code in (200, 201):
                    logger.info("Email OTP delivre via onboarding@resend.dev pour %s", normalized_email)
    except Exception as exc:
        logger.warning("Echec non bloquant de l'envoi email Resend pour %s : %s", normalized_email, exc)

    return True


async def verify_otp(email: str, code: str) -> bool:
    """Vérifie un OTP. Retourne True si valide, False sinon. Consomme le code."""
    normalized_email = email.strip().lower()
    clean_code = code.strip()
    now = time.time()

    # 1. Vérification Redis si disponible
    redis = await _get_redis()
    if redis is not None:
        try:
            key = f"{OTP_KEY_PREFIX}{normalized_email}"
            stored = await redis.get(key)
            if stored and stored == clean_code:
                await redis.delete(key)
                await redis.delete(f"{OTP_COOLDOWN_PREFIX}{normalized_email}")
                await redis.aclose()
                return True
            await redis.aclose()
        except Exception as exc:
            logger.warning("Erreur lecture Redis OTP : %s", exc)

    # 2. Vérification mémoire locale
    if normalized_email in _MEMORY_OTP:
        stored_code, expiry = _MEMORY_OTP[normalized_email]
        if now <= expiry and stored_code == clean_code:
            del _MEMORY_OTP[normalized_email]
            _MEMORY_COOLDOWN.pop(normalized_email, None)
            return True

    # 3. Code universel de secours si Resend n'est pas configuré (test / dev)
    if not settings.RESEND_API_KEY and clean_code == "123456":
        return True

    return False


def _build_email_html(code: str) -> str:
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;background:#f4f4f5;margin:0;padding:40px 20px;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:40px;border:1px solid #e4e4e7;">
    <h1 style="font-size:20px;font-weight:700;color:#09090b;margin:0 0 8px;">Code de vérification ETP</h1>
    <p style="color:#71717a;font-size:14px;margin:0 0 32px;">
      Utilisez ce code pour confirmer votre identité. Il expire dans <strong>10 minutes</strong>.
    </p>
    <div style="background:#f4f4f5;border-radius:12px;padding:24px;text-align:center;margin-bottom:32px;">
      <span style="font-size:36px;font-weight:800;letter-spacing:12px;color:#09090b;font-family:monospace;">{code}</span>
    </div>
    <p style="color:#a1a1aa;font-size:12px;margin:0;">
      Si vous n'avez pas demandé ce code, ignorez cet email.
    </p>
  </div>
</body>
</html>"""
