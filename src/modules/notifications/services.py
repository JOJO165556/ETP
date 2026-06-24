"""Service d'envoi d'emails et de gestion des notifications."""
import logging
import re
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# Templates HTML pour les emails
EMAIL_TEMPLATES = {
    "application_received": {
        "subject": "Candidature reçue - {{ job_title }}",
        "body": """
        <h2>Votre candidature a été reçue</h2>
        <p>Bonjour,</p>
        <p>Votre candidature pour le poste <strong>{{ job_title }}</strong> chez <strong>{{ company_name }}</strong> a été enregistrée avec succès.</p>
        <p>Nous examinerons votre dossier et reviendrons vers vous prochainement.</p>
        <p>Cordialement,<br>L'équipe ETP</p>
        """,
    },
    "stage_changed": {
        "subject": "Mise à jour de votre candidature - {{ job_title }}",
        "body": """
        <h2>Votre candidature a évolué</h2>
        <p>Bonjour,</p>
        <p>Votre candidature pour le poste <strong>{{ job_title }}</strong> est maintenant au stage : <strong>{{ new_stage }}</strong>.</p>
        <p>{{ message }}</p>
        <p>Cordialement,<br>L'équipe ETP</p>
        """,
    },
    "application_rejected": {
        "subject": "Candidature - {{ job_title }}",
        "body": """
        <h2>Réponse à votre candidature</h2>
        <p>Bonjour,</p>
        <p>Malheureusement, nous avons décidé de ne pas donner suite à votre candidature pour le poste <strong>{{ job_title }}</strong>.</p>
        <p>Nous vous souhaitons bonne chance dans vos recherches.</p>
        <p>Cordialement,<br>L'équipe ETP</p>
        """,
    },
    "new_job_match": {
        "subject": "Nouvelle offre correspondant à votre profil",
        "body": """
        <h2>Offre correspondant à vos compétences</h2>
        <p>Bonjour,</p>
        <p>Une nouvelle offre <strong>{{ job_title }}</strong> chez <strong>{{ company_name }}</strong> correspond à votre profil avec un score de <strong>{{ match_score }}%</strong>.</p>
        <p>Consultez l'offre pour plus de détails.</p>
        <p>Cordialement,<br>L'équipe ETP</p>
        """,
    },
}


def render_email(template_name: str, context: dict) -> tuple[str, str]:
    """Rend un template d'email et retourne (subject, html_body)."""
    template_data = EMAIL_TEMPLATES.get(template_name)
    if not template_data:
        raise ValueError(f"Template inconnu: {template_name}")

    subject = template_data["subject"]
    body = template_data["body"]

    # Substitution simple {{ variable }}
    for key, value in context.items():
        subject = subject.replace("{{ " + key + " }}", str(value))
        body = body.replace("{{ " + key + " }}", str(value))

    return subject, body


class EmailService:
    """Service d'envoi d'emails (configure un SMTP en prod)."""

    def __init__(self, smtp_host: str = "", smtp_port: int = 587, smtp_user: str = "", smtp_pass: str = ""):
        self.smtp_host = smtp_host
        self.smtp_port = smtp_port
        self.smtp_user = smtp_user
        self.smtp_pass = smtp_pass

    async def send_email(self, to: str, subject: str, html_body: str) -> bool:
        """Envoie un email. En dev, log seulement."""
        logger.info("EMAIL → %s | Sujet: %s", to, subject)
        # TODO: Implémenter l'envoi SMTP réel en prod
        # import aiosmtplib
        # message = MIMEMultipart("alternative")
        # message["From"] = self.smtp_user
        # message["To"] = to
        # message["Subject"] = subject
        # message.attach(MIMEText(html_body, "html"))
        # await aiosmtplib.send(message, hostname=self.smtp_host, port=self.smtp_port, ...)
        return True

    async def send_notification_email(
        self, to: str, template_name: str, context: dict
    ) -> bool:
        """Envoie un email à partir d'un template."""
        subject, body = render_email(template_name, context)
        return await self.send_email(to, subject, body)


class NotificationService:
    """Service de notifications in-app (stockées en base)."""

    def __init__(self, db):
        self.db = db

    async def create(self, recipient_id: str, subject: str, body: str, notification_type: str = "info") -> dict:
        """Crée une notification in-app."""
        # TODO: Créer un modèle Notification et sauvegarder en BDD
        notification = {
            "recipient_id": recipient_id,
            "subject": subject,
            "body": body,
            "notification_type": notification_type,
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        logger.info("Notification créée pour %s: %s", recipient_id, subject)
        return notification

    async def notify_application_received(self, user_id: str, job_title: str, company_name: str):
        """Notifie un candidat que sa candidature est reçue."""
        await self.create(
            recipient_id=user_id,
            subject=f"Candidature reçue - {job_title}",
            body=f"Votre candidature pour {job_title} chez {company_name} a été enregistrée.",
            notification_type="success",
        )

    async def notify_stage_changed(self, user_id: str, job_title: str, new_stage: str, message: str = ""):
        """Notifie un candidat d'un changement de stage."""
        await self.create(
            recipient_id=user_id,
            subject=f"Candidature mise à jour - {job_title}",
            body=f"Votre candidature pour {job_title} est maintenant au stage: {new_stage}. {message}",
            notification_type="info",
        )
