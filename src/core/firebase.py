"""Integration Firebase Auth — verification des ID tokens et App Check.

Le module est volontairement no-op tant que les credentials Firebase ne sont
pas renseignes dans .env. Les deux fonctions d'entree (`verify_id_token`,
`verify_app_check_token`) retournent alors des valeurs qui laissent le flux
poursuivre en mode degrade (developpement), comme documente dans l'ADR-0001.
"""
import asyncio
import logging
import json
import os
from functools import lru_cache
from typing import Any, Optional

from fastapi import HTTPException, Request, status

from src.core.config import settings

logger = logging.getLogger(__name__)


FIREBASE_PROVIDER_MAP = {
    "google.com": "google",
    "facebook.com": "facebook",
    "phone": "phone",
}


def extract_provider(claims: dict[str, Any]) -> str:
    """Retourne le nom du provider d'identite depuis les claims Firebase."""
    providers = claims.get("firebase", {}).get("sign_in_provider") or ""
    return FIREBASE_PROVIDER_MAP.get(providers, "email")


def is_enabled() -> bool:
    """True si les credentials Firebase (compte de service) sont configures."""
    if settings.GOOGLE_APPLICATION_CREDENTIALS:
        return True
    return all([
        settings.FIREBASE_PROJECT_ID,
        settings.FIREBASE_CLIENT_EMAIL,
        settings.FIREBASE_PRIVATE_KEY,
    ])


def _load_certificate() -> dict[str, Any]:
    """Construit le payload du certificat de service depuis .env ou un fichier."""
    if settings.GOOGLE_APPLICATION_CREDENTIALS:
        path = settings.GOOGLE_APPLICATION_CREDENTIALS
        if not os.path.isfile(path):
            raise RuntimeError(
                f"GOOGLE_APPLICATION_CREDENTIALS introuvable : {path}"
            )
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    return {
        "type": "service_account",
        "project_id": settings.FIREBASE_PROJECT_ID,
        "private_key_id": settings.FIREBASE_PRIVATE_KEY_ID,
        "private_key": (settings.FIREBASE_PRIVATE_KEY or "").replace("\\n", "\n"),
        "client_email": settings.FIREBASE_CLIENT_EMAIL,
        "client_id": settings.FIREBASE_CLIENT_ID,
    }


@lru_cache(maxsize=1)
def _get_app():
    """Initialise (une seule fois) l'app firebase-admin."""
    import firebase_admin
    from firebase_admin import credentials

    cert = credentials.Certificate(_load_certificate())
    return firebase_admin.initialize_app(cert)


def _get_auth():
    """Retourne le client Auth si Firebase est active, sinon None."""
    if not is_enabled():
        return None
    try:
        from firebase_admin import auth
        return auth
    except Exception as exc:  # pragma: no cover - dependance absente
        logger.warning("firebase-admin indisponible : %s", exc)
        return None


def verify_id_token(id_token: str) -> Optional[dict[str, Any]]:
    """
    Verifie un ID token Firebase et retourne ses claims.

    Retourne None si Firebase n'est pas configure (mode developpement).
    Leve HTTPException 401 si le jeton est invalide/expire.
    """
    auth = _get_auth()
    if auth is None:
        logger.debug("Firebase desactive : ID token non verifie")
        return None
    try:
        _get_app()
    except Exception as exc:  # pragma: no cover - config genante
        logger.warning("Initialisation Firebase echouee : %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Firebase non configure sur le serveur.",
        ) from exc
    try:
        return auth.verify_id_token(id_token, check_revoked=True)
    except Exception as exc:
        logger.warning("Verification ID token echouee : %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session Firebase invalide ou expiree.",
        ) from exc


def verify_app_check_token(app_check_token: Optional[str]) -> bool:
    """
    Verifie un jeton App Check (reCAPTCHA / Play Integrity).

    Retourne True quand :
    - App Check est desactive par configuration, ou
    - Firebase est desactive (mode developpement), ou
    - le jeton est valide.
    Retourne False (401) si la verification est demandee et echoue.
    """
    if not settings.FIREBASE_APP_CHECK_ENABLED or not is_enabled():
        return True
    if not app_check_token:
        logger.warning("App Check active mais jeton absent")
        return False

    project_id = settings.FIREBASE_PROJECT_ID or _load_certificate().get("project_id")
    if not project_id:
        return True

    import httpx

    url = (
        "https://recaptchaenterprise.googleapis.com/v1/projects/"
        f"{project_id}/appCheckTokens:verify"
    )
    try:
        resp = httpx.post(
            url,
            headers={"Accept": "application/json"},
            json={"app_check_token": app_check_token},
        )
    except Exception as exc:
        logger.warning("Appel App Check echoue : %s", exc)
        return False
    if resp.status_code != 200:
        logger.warning("App Check refuse : %s", resp.text[:200])
        return False
    return bool(resp.json().get("valid", False))


async def provision_user(
    email: str,
    password: str,
    user_id: str,
    display_name: str | None = None,
) -> Optional[str]:
    """
    Cree le compte dans Firebase (email/password) pour un user local existant.

    Retourne le firebase_uid cree, ou None si Firebase est desactive ou si la
    creation a echoue (l'echec ne doit jamais bloquer l'inscription locale).
    """
    auth = _get_auth()
    if auth is None:
        return None
    try:
        _get_app()
        record = await asyncio.to_thread(
            auth.create_user,
            email=email,
            password=password,
            display_name=display_name,
            uid=user_id,
        )
        logger.info("Compte Firebase provisionne pour %s", email)
        return record.uid
    except Exception as exc:
        logger.warning("Provisionnement Firebase echoue pour %s : %s", email, exc)
        return None


async def extract_app_check_token(request: Request) -> Optional[str]:
    """Recupere le jeton App Check depuis le header standard X-Firebase-AppCheck."""
    token = request.headers.get("X-Firebase-AppCheck")
    return token.strip() if token else None


def require_id_token(token: str) -> Optional[dict[str, Any]]:
    """Wrapper utilise par le endpoint d'auth : levee d'erreur si jeton absent."""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="ID token Firebase manquant.",
        )
    return verify_id_token(token)