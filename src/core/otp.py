"""Service OTP — génération, stockage Redis et envoi via Resend.

Flux :
  1. send_otp(email) : génère un code 6 chiffres, le stocke dans Redis (TTL 10 min),
     envoie l'email via Resend API.
  2. verify_otp(email, code) : vérifie et consomme le code (delete after use).
"""
import logging
import random
import string

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


def _generate_code(length: int = 6) -> str:
    return "".join(random.choices(string.digits, k=length))


async def _get_redis():
    import redis.asyncio as aioredis  # type: ignore[import]
    return await aioredis.from_url(str(settings.REDIS_URL), decode_responses=True)


async def send_otp(email: str) -> None:
    """Génère et envoie un OTP par email via Resend avec cooldown et rate limit."""
    normalized_email = email.strip().lower()
    redis = await _get_redis()

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

    if not settings.RESEND_API_KEY:
        logger.warning("RESEND_API_KEY non configurée — OTP non envoyé pour %s (code: %s)", email, code)
        return

    payload = {
        "from": f"ETP <{settings.RESEND_FROM_EMAIL}>",
        "to": [email],
        "subject": "Votre code de connexion ETP",
        "html": _build_email_html(code),
        "text": f"Votre code de vérification ETP est : {code}\n\nIl expire dans 10 minutes.",
    }

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
        logger.error("Resend échec (%s) : %s", resp.status_code, resp.text[:200])
        raise RuntimeError("Impossible d'envoyer le code de vérification.")


async def verify_otp(email: str, code: str) -> bool:
    """Vérifie un OTP. Retourne True si valide, False sinon. Consomme le code."""
    normalized_email = email.strip().lower()
    redis = await _get_redis()
    key = f"{OTP_KEY_PREFIX}{normalized_email}"
    stored = await redis.get(key)
    if stored and stored == code.strip():
        await redis.delete(key)
        # On supprime aussi le cooldown pour autoriser un nouvel OTP si besoin
        await redis.delete(f"{OTP_COOLDOWN_PREFIX}{normalized_email}")
        await redis.aclose()
        return True
    await redis.aclose()
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

