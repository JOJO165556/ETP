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

    # URL publique du frontend (liens de confirmation / redirections)
    FRONTEND_URL: str = "http://localhost:3000"

    # VERIFICATION D'EMAIL
    EMAIL_VERIFICATION_EXPIRE_HOURS: int = 24

    # SMTP (dev : MailHog / Mailpit sur le port 1025)
    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 1025
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM_EMAIL: str = "noreply@etp-platform.com"
    SMTP_TLS: bool = False
    SMTP_SSL: bool = False
    SMTP_TIMEOUT: int = 15

    # CORS
    BACKEND_CORS_ORIGINS: List[AnyHttpUrl] = []

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Any) -> Any:
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

    # OAUTH (Google & Facebook) — DEPRECATED, remplace par Firebase Auth
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    FACEBOOK_CLIENT_ID: Optional[str] = None
    FACEBOOK_CLIENT_SECRET: Optional[str] = None

    # FIREBASE AUTH (fournisseur d'identite unique)
    # Jusqu'a la saisie des credentials, Firebase est desactive (mode no-op).
    FIREBASE_PROJECT_ID: Optional[str] = None
    FIREBASE_PRIVATE_KEY_ID: Optional[str] = None
    FIREBASE_PRIVATE_KEY: Optional[str] = None
    FIREBASE_CLIENT_EMAIL: Optional[str] = None
    FIREBASE_CLIENT_ID: Optional[str] = None
    # Chemin alternatif vers le JSON du compte de service (remplace les 5 cles ci-dessus)
    GOOGLE_APPLICATION_CREDENTIALS: Optional[str] = None
    # AI PARSING — Gemini (API gratuite via AI Studio)
    # Vide = fallback regex (aucune IA)
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-2.5-flash"
    GEMINI_API_BASE: str = "https://generativelanguage.googleapis.com/v1beta"
    # AI PARSING — Hugging Face Inference Providers (fournisseur prioritaire)
    HF_API_KEY: Optional[str] = None
    HF_MODEL: str = "mistralai/Mistral-7B-Instruct-v0.3"
    HF_API_BASE: str = "https://router.huggingface.co/v1"
    # Garde-fous d'appel (delai borne, taille de CV transmise au modele)
    AI_REQUEST_TIMEOUT: float = 30.0
    AI_MAX_CV_CHARS: int = 12000
    # Verification du jeton App Check recu dans le header X-Firebase-AppCheck
    FIREBASE_APP_CHECK_ENABLED: bool = True


settings = Settings()
