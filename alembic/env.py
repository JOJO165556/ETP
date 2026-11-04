from logging.config import fileConfig
from sqlalchemy import create_engine
from alembic import context
import os
from dotenv import load_dotenv

# Charge les variables depuis le fichier .env
load_dotenv()

# Objet de configuration Alembic
config = context.config

# Interprétation du fichier de configuration pour le logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Import des modèles pour l'autogenerate
from src.core.database import Base
from src.modules.users.models import User, Profile  # noqa: F401
from src.modules.companies.models import Company  # noqa: F401
from src.modules.jobs.models import Job  # noqa: F401
from src.modules.applications.models import Application  # noqa: F401
from src.modules.interviews.models import Interview  # noqa: F401
from src.modules.notifications.models import Notification  # noqa: F401
from src.modules.ai.models import AIAuditLog, AIJobConfig, AIProviderConfig  # noqa: F401

target_metadata = Base.metadata

# Réutilisation de DATABASE_URL si définie (Render / Neon / Docker), sinon reconstruction depuis les variables
_raw_url = os.getenv("DATABASE_URL", "")
if _raw_url:
    # Alembic requiert un driver synchrone — on convertit vers postgresql+psycopg2://
    DATABASE_URL = _raw_url
    if DATABASE_URL.startswith("postgresql+asyncpg://"):
        DATABASE_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql+psycopg2://", 1)
    elif DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)
    elif DATABASE_URL.startswith("postgresql://"):
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)
    # Neon / Render fournissent sslmode=require ; psycopg2 accepte les deux formes
    if "ssl=require" in DATABASE_URL and "sslmode=require" not in DATABASE_URL:
        DATABASE_URL = DATABASE_URL.replace("ssl=require", "sslmode=require")
else:
    # Fallback : reconstruction depuis les variables individuelles
    _user = os.getenv("POSTGRES_USER", "postgres")
    _pwd = os.getenv("POSTGRES_PASSWORD", "postgres")
    _host = os.getenv("POSTGRES_SERVER", "localhost")
    _db = os.getenv("POSTGRES_DB", "etp_db")
    DATABASE_URL = f"postgresql+psycopg2://{_user}:{_pwd}@{_host}:5432/{_db}"

def include_object(object, name, type_, reflected, compare_to):
    """Filtre pour ignorer les tables système PostGIS et Tiger Geocoder."""
    if type_ == "table":
        # Ignore les schémas système PostGIS et Tiger
        if object.schema in ["tiger", "topology", "tiger_data"]:
            return False
        # Ignore les tables système de PostGIS / Tiger Geocoder présentes dans le schéma public
        postgis_tables = {
            "spatial_ref_sys", "geography_columns", "geometry_columns", 
            "raster_columns", "raster_overviews", "edges", "addr", 
            "faces", "featnames", "addrfeat", "place", "cousub", 
            "county", "state", "tract", "tabblock", "bg", "zcta5",
            "zip_lookup_base", "direction_lookup", "street_type_lookup",
            "countysub_lookup", "pagc_lex", "loader_platform",
            "geocode_settings_default", "state_lookup", "pagc_gaz",
            "secondary_unit_lookup", "geocode_settings", "place_lookup",
            "county_lookup", "topology", "layer", "zip_state",
            "tabblock20", "zip_state_loc", "zip_lookup", "pagc_rules",
            "loader_variables", "loader_lookuptables", "zip_lookup_all"
        }
        if name in postgis_tables or name.startswith("topology") or name.startswith("tiger"):
            return False
    return True


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    context.configure(
        url=DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_object=include_object,
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    import logging
    _log = logging.getLogger("alembic.env")

    # Masquer le mot de passe dans les logs
    _safe_url = DATABASE_URL.split("@")[-1] if "@" in DATABASE_URL else DATABASE_URL
    _log.info("Connexion DB pour migrations : ...@%s", _safe_url)

    connectable = create_engine(DATABASE_URL)

    # Extensions PostgreSQL requises (PostGIS, btree_gist) — doivent être créées
    # en AUTOCOMMIT : CREATE EXTENSION est interdit dans une transaction explicite.
    # On utilise une connexion brute distincte pour éviter de polluer la transaction Alembic.
    try:
        raw = connectable.raw_connection()
        raw.set_isolation_level(0)  # AUTOCOMMIT
        cur = raw.cursor()
        cur.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
        cur.execute("CREATE EXTENSION IF NOT EXISTS btree_gist;")
        cur.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")
        cur.close()
        raw.close()
    except Exception as ext_err:
        import logging
        logging.getLogger("alembic.env").warning(
            "Extensions PostgreSQL non créées (droits insuffisants ou déjà présentes) : %s", ext_err
        )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_object=include_object,
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()