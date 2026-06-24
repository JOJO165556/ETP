"""Rate limiting basé sur Redis."""
import time
import logging
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)

# Configuration par défaut
DEFAULT_RATE_LIMIT = 100  # requêtes
DEFAULT_WINDOW = 60  # secondes


class RateLimiter:
    """Rate limiter utilisant Redis comme stockage."""

    def __init__(self, redis_url: str = ""):
        self.redis_url = redis_url
        self._redis = None

    async def _get_redis(self):
        if self._redis is None:
            try:
                import redis.asyncio as aioredis
                self._redis = await aioredis.from_url(
                    self.redis_url, decode_responses=True
                )
            except Exception as e:
                logger.warning("Redis indisponible, rate limiting désactivé: %s", e)
                return None
        return self._redis

    async def is_rate_limited(
        self, key: str, limit: int = DEFAULT_RATE_LIMIT, window: int = DEFAULT_WINDOW
    ) -> tuple[bool, dict]:
        """Vérifie si une clé a dépassé la limite. Retourne (is_limited, info)."""
        redis = await self._get_redis()
        if redis is None:
            return False, {"limit": limit, "remaining": limit, "reset": 0}

        now = time.time()
        window_start = now - window

        pipe = redis.pipeline()
        pipe.zremrangebyscore(key, 0, window_start)
        pipe.zadd(key, {str(now): now})
        pipe.zcard(key)
        pipe.expire(key, window)
        results = await pipe.execute()

        request_count = results[2]
        remaining = max(0, limit - request_count)
        reset = int(now + window)

        return request_count > limit, {
            "limit": limit,
            "remaining": remaining,
            "reset": reset,
            "retry_after": window if request_count > limit else 0,
        }


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Middleware FastAPI pour le rate limiting."""

    def __init__(self, app, redis_url: str = "", default_limit: int = DEFAULT_RATE_LIMIT):
        super().__init__(app)
        self.limiter = RateLimiter(redis_url)
        self.default_limit = default_limit

    async def dispatch(self, request: Request, call_next):
        # Identifier le client (IP ou token)
        client_id = request.client.host if request.client else "unknown"
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            client_id = auth_header[7:30]  # Utiliser une partie du token comme clé

        key = f"rate_limit:{client_id}:{request.url.path}"
        is_limited, info = await self.limiter.is_rate_limited(key, self.default_limit)

        if is_limited:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Trop de requêtes. Réessayez plus tard.",
                headers={
                    "X-RateLimit-Limit": str(info["limit"]),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(info["reset"]),
                    "Retry-After": str(info["retry_after"]),
                },
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(info["limit"])
        response.headers["X-RateLimit-Remaining"] = str(info["remaining"])
        response.headers["X-RateLimit-Reset"] = str(info["reset"])
        return response
