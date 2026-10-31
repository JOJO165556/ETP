"""Configuration centralisée de l'application."""
import secrets
from typing import Any, List, Optional
from pydantic import AnyHttpUrl, PostgresDsn, RedisDsn, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _generate_secret(length: int = 64) -> str:
    return secrets.token_urlsafe(length)


def _normalize_postgres_url(url: str) -> str:
    url = url.strip()
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

    if "?" in url:
        from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

        parsed = urlparse(url)
        qs = parse_qs(parsed.query)
        # Supprimer les options libpq non supportees par asyncpg (ex: Neon channel_binding)
        for param in ["channel_binding", "target_session_attrs", "gssencmode"]:
            qs.pop(param, None)
        if "sslmode" in qs and "ssl" not in qs:
            qs["ssl"] = qs.pop("sslmode")
        new_query = urlencode(qs, doseq=True)
        url = urlunparse(
            (parsed.scheme, parsed.netloc, parsed.path, parsed.params, new_query, parsed.fragment)
        )
    return url


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", case_sensitive=True, extra="ignore"
    )

    PROJECT_NAME: str = "Enterprise Talent Platform"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = _generate_secret()
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    ENVIRONMENT: str = "development"
    FRONTEND_URL: str = "https://tryetp.vercel.app"
    EMAIL_VERIFICATION_EXPIRE_HOURS: int = 24

    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 1025
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM_EMAIL: str = "noreply@etp-platform.com"
    SMTP_TLS: bool = False
    SMTP_SSL: bool = False
    SMTP_TIMEOUT: int = 15
    RESEND_API_KEY: Optional[str] = None

    BACKEND_CORS_ORIGINS: List[AnyHttpUrl] = [
        "http://localhost:3000",
        "https://tryetp.vercel.app",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Any) -> Any:
        default_origins = [
            "http://localhost:3000",
            "https://tryetp.vercel.app",
        ]
        if isinstance(v, str) and not v.startswith("["):
            origins = [i.strip() for i in v.split(",") if i.strip()]
            return origins if origins else default_origins
        elif isinstance(v, list):
            return v if v else default_origins
        elif isinstance(v, str):
            return v
        return default_origins

    POSTGRES_SERVER: Optional[str] = "localhost"
    POSTGRES_USER: Optional[str] = "postgres"
    POSTGRES_PASSWORD: Optional[str] = "postgres"
    POSTGRES_DB: Optional[str] = "etp_db"
    DATABASE_URL: Optional[PostgresDsn] = None

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_db_connection(cls, v: Optional[str], info: Any) -> Any:
        if isinstance(v, str) and v.strip():
            return _normalize_postgres_url(v)
        server = info.data.get("POSTGRES_SERVER") or "localhost"
        user = info.data.get("POSTGRES_USER") or "postgres"
        pwd = info.data.get("POSTGRES_PASSWORD") or "postgres"
        db = info.data.get("POSTGRES_DB") or "etp_db"
        return f"postgresql+asyncpg://{user}:{pwd}@{server}/{db}"

    REDIS_URL: RedisDsn

    # Stockage S3-compatible (Cloudflare R2 en prod, MinIO en dev)
    S3_ENDPOINT_URL: Optional[str] = None
    S3_ACCESS_KEY_ID: Optional[str] = None
    S3_SECRET_ACCESS_KEY: Optional[str] = None
    S3_BUCKET_NAME: Optional[str] = None
    S3_BUCKET_CV: Optional[str] = None
    S3_REGION: str = "auto"
    S3_USE_SSL: bool = False
    S3_PUBLIC_URL: Optional[str] = None

    # Aliases legacy MinIO (compatibilité)
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = _generate_secret(20)
    MINIO_SECRET_KEY: str = _generate_secret(40)
    MINIO_BUCKET_NAME: str = "etp-documents"
    MINIO_BUCKET_CV: str = "candidats-cv"

    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    FACEBOOK_CLIENT_ID: Optional[str] = None
    FACEBOOK_CLIENT_SECRET: Optional[str] = None

    FIREBASE_PROJECT_ID: Optional[str] = None
    FIREBASE_PRIVATE_KEY_ID: Optional[str] = None
    FIREBASE_PRIVATE_KEY: Optional[str] = None
    FIREBASE_CLIENT_EMAIL: Optional[str] = None
    FIREBASE_CLIENT_ID: Optional[str] = None
    GOOGLE_APPLICATION_CREDENTIALS: Optional[str] = None
    FIREBASE_APP_CHECK_ENABLED: bool = True

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == "development"

    @property
    def is_test(self) -> bool:
        return self.ENVIRONMENT == "test"

    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-2.5-flash"
    GEMINI_API_BASE: str = "https://generativelanguage.googleapis.com/v1beta"
    HF_API_KEY: Optional[str] = None
    HF_MODEL: str = "mistralai/Mistral-7B-Instruct-v0.3"
    HF_API_BASE: str = "https://router.huggingface.co/v1"
    AI_REQUEST_TIMEOUT: float = 30.0
    AI_MAX_CV_CHARS: int = 12000


settings = Settings()
