from logging.config import fileConfig
from sqlalchemy import create_engine, pool
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
from src.modules.users.models import User, Profile
from src.modules.companies.models import Company
from src.modules.jobs.models import Job
from src.modules.applications.models import Application

target_metadata = Base.metadata

# Construction de l'URL de base de données
DATABASE_URL = f"postgresql+psycopg2://{os.getenv('POSTGRES_USER')}:{os.getenv('POSTGRES_PASSWORD')}@localhost:5432/{os.getenv('POSTGRES_DB')}"

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
    connectable = create_engine(DATABASE_URL)

    with connectable.connect() as connection:
        context.configure(
            connection=connection, 
            target_metadata=target_metadata,
            include_object=include_object 
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()