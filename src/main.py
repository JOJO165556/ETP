from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
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


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Ajoute les headers de securite a chaque reponse."""
    
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        
        # HSTS — force HTTPS pendant 1 an
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        # Protege contre le clickjacking
        response.headers["X-Frame-Options"] = "DENY"
        # Empêche le MIME sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"
        # XSS filter (legacy mais encore utile)
        response.headers["X-XSS-Protection"] = "1; mode=block"
        # Pas de referrer header sensibel
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        # Politique de permission (camera, mic, geo = none)
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        
        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialisation des buckets MinIO / S3 pour les CVs
    storage_service = AsyncStorageService()
    await storage_service.initialize_buckets()
        
    yield
    
    # Couper proprement les connexions du pool SQL
    await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Security headers
app.add_middleware(SecurityHeadersMiddleware)

# CORS restrictif — jamais de wildcard
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
        allow_headers=["Authorization", "Content-Type"],
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

# Rate limiting (optionnel, necessite Redis)
try:
    from src.core.rate_limit import RateLimitMiddleware
    app.add_middleware(RateLimitMiddleware, redis_url=str(settings.REDIS_URL), default_limit=100)
except Exception:
    pass

@app.get("/health", tags=["Infrastructure"], summary="Verification de l'etat de sante")
async def health_check():
    return {"status": "healthy", "service": settings.PROJECT_NAME}
