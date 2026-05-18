# Import de la Base déclarative
from src.core.database import Base

# Import de tous les modèles pour l'enregistrement des métadonnées par Alembic
from src.modules.companies.models import Company
from src.modules.users.models import User, Profile
from src.modules.jobs.models import Job
from src.modules.applications.models import Application

# Exposer declarative_base pour Alembic
__all__ = ["Base", "Company", "User", "Profile", "Job", "Application"]