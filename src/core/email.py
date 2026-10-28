"""Service d'envoi d'emails (SMTP) et rendu des templates Jinja2.

L'envoi est realise via la bibliotheque standard (``smtplib``) executee dans un
thread pour ne jamais bloquer la boucle asyncio. Le service est appele depuis
les taches Celery, jamais directement depuis une requete HTTP.
"""
import logging
import re
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, TemplateNotFound, select_autoescape

from src.core.config import settings

logger = logging.getLogger(__name__)

TEMPLATES_DIR = Path(__file__).resolve().parents[1] / "templates" / "emails"

_env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=select_autoescape(["html", "xml"]),
    trim_blocks=True,
    lstrip_blocks=True,
)

# Sujets par defaut (utilises par le helper de compatibilite ``render_email``).
DEFAULT_SUBJECTS: dict[str, str] = {
    "verify_email": "Confirmez votre adresse email - ETP",
    "application_received": "Candidature reçue - {{ job_title }}",
    "stage_changed": "Mise à jour de votre candidature - {{ job_title }}",
    "application_rejected": "Candidature - {{ job_title }}",
    "new_job_match": "Nouvelle offre correspondant à votre profil",
}


class EmailDeliveryError(RuntimeError):
    """Echec d'acheminement SMTP (utilise pour declencher les retries Celery)."""


def _html_to_text(html: str) -> str:
    """Repli texte simple lorsqu'aucun template ``.txt`` n'est fourni."""
    text = re.sub(r"(?is)<(script|style).*?>.*?</\1>", " ", html)
    text = re.sub(r"(?i)<br\s*/?>", "\n", text)
    text = re.sub(r"(?i)</p>", "\n\n", text)
    text = re.sub(r"<[^>]+>", "", text)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def render_email_template(template_name: str, context: dict) -> tuple[str, str]:
    """Rend un template et retourne ``(html, texte)``.

    Leve ``ValueError`` si le template HTML est inconnu.
    """
    try:
        html_template = _env.get_template(f"{template_name}.html")
    except TemplateNotFound as exc:
        raise ValueError(f"Template inconnu: {template_name}") from exc

    html_body = html_template.render(**context)

    try:
        text_template = _env.get_template(f"{template_name}.txt")
        text_body = text_template.render(**context)
    except TemplateNotFound:
        text_body = _html_to_text(html_body)

    return html_body, text_body


def render_email(template_name: str, context: dict) -> tuple[str, str]:
    """Compatibilite : rend ``(sujet, corps html)`` depuis un template connu."""
    if template_name not in DEFAULT_SUBJECTS:
        raise ValueError(f"Template inconnu: {template_name}")
    subject = _env.from_string(DEFAULT_SUBJECTS[template_name]).render(**context)
    html_body, _ = render_email_template(template_name, context)
    return subject, html_body


def _build_message(
    to_email: str,
    subject: str,
    html_body: str,
    text_body: str | None = None,
) -> MIMEMultipart:
    message = MIMEMultipart("alternative")
    message["From"] = formataddr(("ETP", settings.SMTP_FROM_EMAIL))
    message["To"] = to_email
    message["Subject"] = subject
    message.attach(MIMEText(text_body or _html_to_text(html_body), "plain", "utf-8"))
    message.attach(MIMEText(html_body, "html", "utf-8"))
    return message


def _send_message_sync(message: MIMEMultipart) -> None:
    """Envoi SMTP bloquant (execute dans un thread dedie)."""
    host = settings.SMTP_HOST
    port = settings.SMTP_PORT
    timeout = settings.SMTP_TIMEOUT
    context = ssl.create_default_context()

    if settings.SMTP_SSL or port == 465:
        with smtplib.SMTP_SSL(host, port, timeout=timeout, context=context) as server:
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(message)
        return

    with smtplib.SMTP(host, port, timeout=timeout) as server:
        server.ehlo()
        if settings.SMTP_TLS:
            server.starttls(context=context)
            server.ehlo()
        if settings.SMTP_USER and settings.SMTP_PASSWORD:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.send_message(message)


async def send_email(
    to_email: str,
    subject: str,
    html_body: str,
    text_body: str | None = None,
) -> bool:
    """Envoie un email MIME multipart/alternative.

    Retourne ``True`` en cas de succes, ``False`` sinon (erreur journalisee).
    """
    import asyncio

    message = _build_message(to_email, subject, html_body, text_body)
    try:
        await asyncio.to_thread(_send_message_sync, message)
        logger.info("Email envoye a %s | Sujet: %s", to_email, subject)
        return True
    except Exception as exc:
        logger.error("Echec de l'envoi de l'email a %s: %s", to_email, exc)
        return False


async def send_templated_email_now(
    to_email: str,
    subject: str,
    template_name: str,
    context: dict,
) -> bool:
    """Rend le template puis envoie l'email (execution immediate)."""
    html_body, text_body = render_email_template(template_name, context)
    return await send_email(to_email, subject, html_body, text_body)
