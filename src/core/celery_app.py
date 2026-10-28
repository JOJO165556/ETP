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
    # Fiabilite : la tache n'est acquittee qu'apres execution reussie. En cas
    # de crash worker, le message est requeue (redelivery) au lieu d'etre perdu.
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    task_acks_on_failure_or_timeout=True,
    # Un worker ne prefetch qu'une tache a la fois pour que acks_late reste
    # equitable entre workers et evite les taches "en vol" non acquittees.
    worker_prefetch_multiplier=1,
    # Garde-fous d'execution (soft = exception Python, hard = kill du worker)
    task_time_limit=300,
    task_soft_time_limit=270,
    # Reconnexion au broker au demarrage (utile en conteneur/orchestration)
    broker_connection_retry_on_startup=True,
    # On autorise le chargement des taches depuis nos differents modules
    imports=[
        "src.modules.applications.tasks",
        "src.modules.users.tasks",
        "src.modules.notifications.tasks"
    ]
)
