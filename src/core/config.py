"""Configuration centralisée avec generation automatique de secrets."""
import secrets
from typing import Any, List, Optional
from pydantic import AnyHttpUrl, PostgresDsn, RedisDsn, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _generate_secret(length: int = 64) -> str:
    """Genere un secret cryptographiquement sur."""
    return secrets.token_urlsafe(length)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", case_sensitive=True,
        extra="ignore"  # Ignorer les champs supplementaires dans .env
    )

    PROJECT_NAME: str = "Enterprise Talent Platform"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = _generate_secret()
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60  # 1 heure

    # CORS
    BACKEND_CORS_ORIGINS: List[AnyHttpUrl] = []

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Any) -> List[AnyHttpUrl] | str:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        return []

    # POSTGRES (PostGIS inclus)
    POSTGRES_SERVER: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    DATABASE_URL: Optional[PostgresDsn] = None

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_db_connection(cls, v: Optional[str], info: Any) -> Any:
        if isinstance(v, str):
            return v
        return f"postgresql+asyncpg://{info.data.get('POSTGRES_USER')}:{info.data.get('POSTGRES_PASSWORD')}@{info.data.get('POSTGRES_SERVER')}/{info.data.get('POSTGRES_DB')}"

    # REDIS (Cache & Celery Broker)
    REDIS_URL: RedisDsn

    # INFRASTRUCTURE DE STOCKAGE (MinIO / S3)
    MINIO_ENDPOINT: str
    MINIO_ACCESS_KEY: str = _generate_secret(20)
    MINIO_SECRET_KEY: str = _generate_secret(40)
    MINIO_BUCKET_NAME: str = "etp-documents"
    MINIO_BUCKET_CV: str = "candidats-cv"

    # OAUTH (Google & LinkedIn)
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    LINKEDIN_CLIENT_ID: Optional[str] = None
    LINKEDIN_CLIENT_SECRET: Optional[str] = None


settings = Settings()
