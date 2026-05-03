import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

# Récupération de l'URL depuis .env
DATABASE_URL = os.getenv("DATABASE_URL")

# Création du moteur asynchrone
engine = create_async_engine(DATABASE_URL, echo=True)

# Création de la fabrique de sessions
AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

# Base pour les modèles ORM
Base = declarative_base()

# Fonction pour obtenir une session de base de données
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session