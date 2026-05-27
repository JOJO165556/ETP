from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from src.core.config import settings

# Configuration du moteur async avec gestion du pool
engine = create_async_engine(
    str(settings.DATABASE_URL),
    pool_size=20,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=1800,
    pool_pre_ping=True,
    echo=False,   # En True unqiuement en debug SQL lourd
)

AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Alias explicite pour les workers Celery qui instancient leur session manuellement
async_session_maker = AsyncSessionLocal

# Registre centralisé pour les métadonnées SQLAlchemy et les futures migrations 
Base = declarative_base()

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependacy injection provider pour les sessions SQL asynchrones
    
    Garantit la fermerture propre de la session après l'exécution de la requête
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except:
            await session.rollback()
            raise
        finally:
            await session.close()

