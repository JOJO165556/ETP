"""Taches Celery d'envoi d'emails transactionnels."""
import asyncio
import hashlib
import json
import logging
import socket
from urllib.parse import urlparse

from celery.utils.log import get_task_logger

from src.core.celery_app import celery_app
from src.core.config import settings
from src.core.email import EmailDeliveryError, send_templated_email_now

logger = get_task_logger(__name__)
_std_logger = logging.getLogger(__name__)

IDEMPOTENCY_KEY_PREFIX = "email:sent:"
IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60


def email_queue_available(timeout: float = 0.25) -> bool:
    """Verifie rapidement que le broker Redis est joignable.

    Evite de bloquer une requete HTTP (inscription) plusieurs dizaines de
    secondes lorsque le broker est injoignable : dans ce cas l'email est
    simplement differe, l'utilisateur pouvant demander un nouveau lien.
    """
    try:
        parsed = urlparse(str(settings.REDIS_URL))
        host = parsed.hostname
        if not host:
            return False
        port = parsed.port or 6379
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


def _idempotency_key(
    to_email: str, subject: str, template_name: str, context: dict
) -> str:
    payload = json.dumps(
        {
            "to": to_email,
            "subject": subject,
            "template": template_name,
            "context": context,
        },
        sort_keys=True,
        ensure_ascii=False,
        default=str,
    )
    digest = hashlib.sha256(payload.encode("utf-8")).hexdigest()
    return f"{IDEMPOTENCY_KEY_PREFIX}{digest}"


def _get_redis():
    try:
        import redis

        return redis.Redis.from_url(
            str(settings.REDIS_URL),
            socket_connect_timeout=2,
            socket_timeout=2,
        )
    except Exception as exc:  # pragma: no cover - depend de l'environnement
        _std_logger.warning("Redis indisponible pour l'idempotence email: %s", exc)
        return None


def _reserve(key: str) -> bool:
    """Reserve la cle si l'email n'a pas deja ete envoye (SET NX EX)."""
    client = _get_redis()
    if client is None:
        return True
    try:
        return bool(client.set(key, "1", nx=True, ex=IDEMPOTENCY_TTL_SECONDS))
    except Exception as exc:  # pragma: no cover - depend de l'environnement
        _std_logger.warning("Echec de reservation d'idempotence email: %s", exc)
        return True


def _release(key: str) -> None:
    """Libere la reservation pour autoriser un nouvel essai apres echec."""
    client = _get_redis()
    if client is None:
        return
    try:
        client.delete(key)
    except Exception as exc:  # pragma: no cover - depend de l'environnement
        _std_logger.warning("Echec de liberation d'idempotence email: %s", exc)


@celery_app.task(
    bind=True,
    name="notifications.send_templated_email",
    autoretry_for=(EmailDeliveryError,),
    retry_backoff=True,
    retry_backoff_max=600,
    retry_jitter=True,
    max_retries=5,
    acks_late=True,
)
def send_templated_email(
    self,
    to_email: str,
    subject: str,
    template_name: str,
    context: dict,
) -> dict:
    """Rend un template Jinja2 puis envoie l'email via SMTP.

    La tache est idempotente sur une fenetre de 24h (cle Redis derivee du
    contenu) et retentee avec un backoff exponentiel en cas d'echec SMTP.
    """
    key = _idempotency_key(to_email, subject, template_name, context)
    if not _reserve(key):
        logger.info("Email deja envoye, tache ignoree: %s (%s)", to_email, template_name)
        return {"status": "skipped", "reason": "already_sent", "to": to_email}

    try:
        sent = asyncio.run(
            send_templated_email_now(to_email, subject, template_name, context)
        )
    except ValueError:
        # Template inconnu : erreur de programmation, aucun retry utile.
        _release(key)
        raise
    except Exception as exc:
        _release(key)
        raise EmailDeliveryError(f"Echec d'envoi a {to_email}: {exc}") from exc

    if not sent:
        _release(key)
        raise EmailDeliveryError(f"Echec d'envoi a {to_email} (SMTP)")

    logger.info("Email envoye a %s (%s)", to_email, template_name)
    return {"status": "sent", "to": to_email, "template": template_name}
