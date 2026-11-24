import asyncio
import logging
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from src.core.config import settings
from src.core.database import engine
from src.core.storage import AsyncStorageService
from src.core.logging_config import setup_logging
from src.core.health import health_check
from src.core.rate_limit import RateLimitMiddleware

logger = logging.getLogger("etp.api")

# Log level DEBUG en dev, INFO en prod
setup_logging(level="DEBUG" if settings.is_development else "INFO")

# Router imports after setup_logging
from src.modules.auth.router import router as auth_router
from src.modules.users.router import router as users_router
from src.modules.companies.router import router as companies_router
from src.modules.jobs.router import router as jobs_router
from src.modules.applications.router import router as applications_router
from src.modules.analytics.router import router as analytics_router
from src.modules.gdpr.router import router as gdpr_router
from src.modules.notifications.router import router as notifications_router
from src.modules.search.router import router as search_router
from src.modules.ai.router import router as ai_router
from src.modules.interviews.router import router as interviews_router


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Trace chaque requête HTTP avec méthode, chemin, code statut, durée et présence auth."""

    async def dispatch(self, request: Request, call_next):
        start = time.time()
        has_auth = "authorization" in request.headers
        has_cookie = "etp_access_token" in request.cookies

        response: Response = await call_next(request)
        duration_ms = (time.time() - start) * 1000

        log_level = logging.WARNING if response.status_code >= 400 else logging.INFO
        logger.log(
            log_level,
            "[HTTP] %s %s -> %s en %.1fms (auth: %s, cookie: %s)",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
            has_auth,
            has_cookie,
        )
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Ajoute les headers de securite a chaque reponse."""
    
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        
        # HSTS uniquement en production (HTTPS réel)
        if settings.is_production:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        # Protege contre le clickjacking
        response.headers["X-Frame-Options"] = "DENY"
        # Empêche le MIME sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"
        # XSS filter (legacy mais encore utile)
        response.headers["X-XSS-Protection"] = "1; mode=block"
        # Pas de referrer header sensible
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        # Politique de permission (camera, mic, geo = none)
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        
        return response


def _run_migrations() -> None:
    """Exécute les migrations Alembic automatiquement au démarrage."""
    import os
    from alembic import command
    from alembic.config import Config

    log = logging.getLogger(__name__)

    # Racine du projet = deux niveaux au-dessus de src/main.py
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ini_path = os.path.join(project_root, "alembic.ini")
    if not os.path.exists(ini_path):
        log.error("alembic.ini introuvable dans %s — migrations ignorées.", project_root)
        return

    try:
        alembic_cfg = Config(ini_path)
        # Forcer script_location en absolu pour éviter tout problème de cwd
        alembic_cfg.set_main_option("script_location", os.path.join(project_root, "alembic"))
        command.upgrade(alembic_cfg, "head")
        log.info("Migrations appliquees avec succes.")
    except Exception:
        log.exception("Echec des migrations Alembic au demarrage — details ci-dessus.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # En développement uniquement : migrations automatiques au démarrage
    # En production, les migrations sont exécutées par le script de déploiement (Dockerfile / CI)
    if not settings.is_production:
        await asyncio.to_thread(_run_migrations)

    # Initialisation des buckets MinIO / S3 pour les CVs (non bloquant en cas d'indisponibilité)
    try:
        storage_service = AsyncStorageService()
        await storage_service.initialize_buckets()
    except Exception as exc:
        logging.getLogger(__name__).warning("Initialisation stockage ignorée : %s", exc)

    yield

    # Couper proprement les connexions du pool SQL
    await engine.dispose()


# Swagger/ReDoc désactivés en prod
_docs_url = None if settings.is_production else "/docs"
_redoc_url = None if settings.is_production else "/redoc"
_openapi_url = None if settings.is_production else "/openapi.json"

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    lifespan=lifespan,
    docs_url=_docs_url,
    redoc_url=_redoc_url,
    openapi_url=_openapi_url,
)

# Instrumentation Prometheus
Instrumentator().instrument(app).expose(app)

# Traçage des requêtes HTTP pour les logs en production
app.add_middleware(RequestLoggingMiddleware)

# Security headers
app.add_middleware(SecurityHeadersMiddleware)

# CORS restrictif — origines autorisées sans slash final
if settings.BACKEND_CORS_ORIGINS:
    cors_origins = [str(origin).rstrip("/") for origin in settings.BACKEND_CORS_ORIGINS]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
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
app.include_router(ai_router, prefix=settings.API_V1_STR)
app.include_router(interviews_router, prefix=settings.API_V1_STR)

# Rate limiting via Redis (100 requêtes / minute / client)
app.add_middleware(RateLimitMiddleware, redis_url=str(settings.REDIS_URL), default_limit=100)

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    logger.warning(
        "[HTTP %d] %s %s : %s",
        exc.status_code,
        request.method,
        request.url.path,
        exc.detail,
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=exc.headers,
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logging.getLogger("uvicorn.error").exception("Erreur serveur non gérée sur %s: %s", request.url.path, exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Une erreur inattendue est survenue côté serveur."},
    )


@app.get("/health", tags=["Infrastructure"], summary="Verification de l'etat de sante (deep)")
async def health_check_endpoint():
    """Health check profond vérifiant PostgreSQL, Redis, MinIO et Celery."""
    return await health_check()


@app.get("/health/ready", tags=["Infrastructure"], summary="Probe de préparation (simple)")
async def readiness_check():
    """Probe de préparation simple"""
    return {"status": "ready", "service": settings.PROJECT_NAME}
