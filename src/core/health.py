import asyncio

from sqlalchemy import text

from src.core.celery_app import celery_app
from src.core.database import get_db
from src.core.storage import AsyncStorageService


async def check_postgresql() -> dict:
    """Vérifie la connectivité PostgreSQL."""
    try:
        async for db in get_db():
            result = await db.execute(text("SELECT 1"))
            result.scalar()
            return {"status": "healthy", "service": "postgresql"}
    except Exception as e:
        return {"status": "unhealthy", "service": "postgresql", "error": str(e)}


async def check_redis() -> dict:
    """Vérifie la connectivité Redis."""
    try:
        from redis import asyncio as aioredis

        from src.core.config import settings

        redis = await aioredis.from_url(str(settings.REDIS_URL))
        await redis.ping()
        await redis.close()
        return {"status": "healthy", "service": "redis"}
    except Exception as e:
        return {"status": "unhealthy", "service": "redis", "error": str(e)}


async def check_minio() -> dict:
    """Vérifie la connectivité MinIO."""
    try:
        storage_service = AsyncStorageService()
        await storage_service.initialize_buckets()
        return {"status": "healthy", "service": "minio"}
    except Exception as e:
        return {"status": "unhealthy", "service": "minio", "error": str(e)}


async def check_celery() -> dict:
    """Vérifie la connectivité Celery."""
    try:
        inspector = celery_app.control.inspect()
        stats = inspector.stats()
        if stats:
            return {"status": "healthy", "service": "celery", "workers": len(stats)}
        else:
            return {"status": "unhealthy", "service": "celery", "error": "No workers available"}
    except Exception as e:
        return {"status": "unhealthy", "service": "celery", "error": str(e)}


async def health_check() -> dict:
    """Health check profond vérifiant tous les services en parallèle."""
    checks = await asyncio.gather(
        check_postgresql(),
        check_redis(),
        check_minio(),
        check_celery(),
        return_exceptions=True,
    )

    services = {}
    overall_healthy = True

    for check in checks:
        if isinstance(check, Exception):
            overall_healthy = False
            continue
        if check["status"] == "unhealthy":
            overall_healthy = False
        services[check["service"]] = check

    return {
        "status": "healthy" if overall_healthy else "degraded",
        "services": services,
    }
