"""Gestion securisee des tokens JWT et mots de passe."""
from datetime import datetime, timedelta, timezone
from typing import Any, Union, Optional
import bcrypt
from jose import jwt
from src.core.config import settings

# HMAC-SHA256 pour access tokens
ALGORITHM = "HS256"
# Cle separee pour les refresh tokens (defense en profondeur)
REFRESH_SECRET_KEY = settings.SECRET_KEY + "_refresh"
REFRESH_TOKEN_EXPIRE_DAYS = 30


def create_access_token(subject: Union[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Genere un JWT signe pour l'authentification."""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {"exp": expire, "sub": str(subject), "type": "access"}
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(subject: Union[str, Any]) -> str:
    """Genere un refresh token avec une cle separee."""
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode = {"exp": expire, "sub": str(subject), "type": "refresh"}
    return jwt.encode(to_encode, REFRESH_SECRET_KEY, algorithm=ALGORITHM)


def verify_access_token(token: str) -> dict:
    """Verifie et decode un access token."""
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])


def verify_refresh_token(token: str) -> dict:
    """Verifie et decode un refresh token avec la cle separee."""
    return jwt.decode(token, REFRESH_SECRET_KEY, algorithms=[ALGORITHM])


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifie un mot de passe contre son hash bcrypt."""
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8"),
    )


def get_password_hash(password: str) -> str:
    """Hash un mot de passe avec bcrypt."""
    return bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt(),
    ).decode("utf-8")
