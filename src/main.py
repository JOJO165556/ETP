from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.core.config import settings
from src.core.database import engine
from src.core.storage import AsyncStorageService
from src.core.logging_config import setup_logging

# Logging structure (JSON)
setup_logging()

from src.modules.auth.router import router as auth_router
from src.modules.users.router import router as users_router
from src.modules.companies.router import router as companies_router
from src.modules.jobs.router import router as jobs_router
from src.modules.applications.router import router as applications_router
from src.modules.analytics.router import router as analytics_router
from src.modules.gdpr.router import router as gdpr_router
from src.modules.notifications.router import router as notifications_router
from src.modules.search.router import router as search_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Actions au démarrage de l'API
    # 1. Initialisation des buckets MinIO / S3 pour les CVs
    storage_service = AsyncStorageService()
    await storage_service.initialize_buckets()
        
    yield
    
    # Actions à l'extinction de l'API
    # Couper proprement les connexions du pool SQL
    await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Injection des règles CORS d'entreprise
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Enregistrement des routes de l'API v1
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(users_router, prefix=settings.API_V1_STR)
app.include_router(companies_router, prefix=settings.API_V1_STR)
app.include_router(jobs_router, prefix=settings.API_V1_STR)
app.include_router(applications_router, prefix=settings.API_V1_STR)
app.include_router(analytics_router, prefix=settings.API_V1_STR)
app.include_router(gdpr_router, prefix=settings.API_V1_STR)
app.include_router(notifications_router, prefix=settings.API_V1_STR)
app.include_router(search_router, prefix=settings.API_V1_STR)

# Rate limiting (optionnel, nécessite Redis)
try:
    from src.core.rate_limit import RateLimitMiddleware
    app.add_middleware(RateLimitMiddleware, redis_url=str(settings.REDIS_URL), default_limit=100)
except Exception:
    pass

@app.get("/health", tags=["Infrastructure"], summary="Vérification de l'état de santé")
async def health_check():
    return {"status": "healthy", "service": settings.PROJECT_NAME}
