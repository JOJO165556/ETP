from celery import Celery
from src.core.config import settings

# Configuration de l'application Celery
# Le broker et le backend utilisent tous les deux Redis
celery_app = Celery(
    "etp_worker",
    broker=str(settings.REDIS_URL),
    backend=str(settings.REDIS_URL)
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    # On autorise le chargement des tâches depuis nos différents modules
    imports=[
        "src.modules.applications.tasks"
    ]
)
