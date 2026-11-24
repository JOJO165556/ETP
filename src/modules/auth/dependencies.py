"""Dependances d'authentification et d'autorisation."""
import logging
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from src.core.config import settings
from src.core.database import get_db
from src.core.security import verify_access_token
from src.modules.auth.constants import UNVERIFIED_EMAIL_DETAIL
from src.modules.auth.schemas import TokenData
from src.modules.users.models import User, UserRole
from sqlalchemy.orm import selectinload

logger = logging.getLogger("etp.auth")

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login",
    auto_error=False,
)


async def get_current_user_optional(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """
    Variante de `get_current_user` qui ne leve jamais d'erreur : si aucun token
    (Authorization/Cookie) n'est fourni ou s'il est invalide, retourne None.

    Utilisee pour les endpoints publics qui peuvent personnaliser la reponse
    (ex: match_score des offres) sans exiger de connexion.
    """
    authorization = request.headers.get("authorization", "")
    token = None
    if authorization.lower().startswith("bearer "):
        token = authorization[7:]
    if not token:
        token = request.cookies.get("etp_access_token")

    if not token:
        return None

    try:
        payload = verify_access_token(token)
        user_id: str | None = payload.get("sub")
        if user_id is None:
            return None
    except JWTError:
        return None

    result = await db.execute(
        select(User).options(selectinload(User.profile)).where(User.id == user_id)
    )
    user = result.scalars().first()
    if user is None or not user.is_active:
        return None
    return user


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
    bearer_token: str | None = Depends(oauth2_scheme),
) -> User:
    """
    Dépendance centrale d'authentification.
    Extrait le token depuis le header Authorization: Bearer, le cookie etp_access_token
    ou le header brut, décode le JWT et retourne l'utilisateur actif.
    """
    token = bearer_token
    if not token:
        token = request.cookies.get("etp_access_token")
    if not token:
        auth_header = request.headers.get("authorization", "")
        if auth_header.lower().startswith("bearer "):
            token = auth_header[7:].strip()

    if not token:
        logger.warning(
            "Auth echec : aucun jeton pour %s %s (cookies: %s)",
            request.method,
            request.url.path,
            list(request.cookies.keys()),
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Impossible de valider les informations d'identification",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = verify_access_token(token)
        user_id: str | None = payload.get("sub")
        if user_id is None:
            logger.warning("Auth echec : sub manquant dans le JWT pour %s", request.url.path)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Impossible de valider les informations d'identification",
                headers={"WWW-Authenticate": "Bearer"},
            )
        token_data = TokenData(user_id=user_id)
    except JWTError as err:
        logger.warning("Auth echec JWT (%s) pour %s", err, request.url.path)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Impossible de valider les informations d'identification",
            headers={"WWW-Authenticate": "Bearer"},
        )

    result = await db.execute(select(User).where(User.id == token_data.user_id))
    user = result.scalars().first()

    if user is None or not user.is_active:
        logger.warning("Auth echec : utilisateur %s introuvable ou inactif", token_data.user_id)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Impossible de valider les informations d'identification",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verification d'email obligatoire : un token emis a l'inscription ne doit
    # pas permettre de contourner la confirmation de l'adresse email.
    if not user.is_verified:
        logger.warning("Auth echec : compte %s non vérifié", user.email)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=UNVERIFIED_EMAIL_DETAIL,
        )

    # Stocker l'utilisateur dans request.state pour modified_by
    request.state.current_user = user

    return user


def get_tenant_company_id(current_user: User) -> str:
    """
    Extrait le company_id du locataire depuis le user connecté.
    Levée si le user n'a pas de company_id assigné (cas recruteur sans entreprise).
    """
    if not current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès non autorisé à ces données multi-tenant.",
        )
    return str(current_user.company_id)


def tenant_company_id(current_user: User) -> str:
    """
    Retourne le company_id du locataire actuel depuis l'utilisateur connecté.

    Les rôles métier (COMPANY_ADMIN, RECRUITER) doivent appartenir à une entreprise.
    Les superadmins peuvent avoir company_id=None (cas administrateur global) —
    dans ce cas, aucune isolation multi-tenant n'est appliquée et l'accès est
    autorisé sur l'ensemble des données.

    Raises
    ------
    HTTPException 403 si un rôle métier n'a pas de company_id assigné.
    """
    if current_user.role in (UserRole.COMPANY_ADMIN, UserRole.RECRUITER):
        if not current_user.company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Compte de recruteur/company_admin sans entreprise assignée.",
            )
        return str(current_user.company_id)

    # SUPERADMIN : pas de filtrage multi-tenant (accès global)
    return str(current_user.company_id) if current_user.company_id else ""


def require_roles(*roles: UserRole):
    """
    Guard factory : retourne une dependance FastAPI qui verifie que l'utilisateur
    authentifie possede l'un des roles autorises. Leve une 403 sinon.
    """
    async def _check_role(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acces refuse. Roles autorises : {[r.value for r in roles]}",
            )
        return current_user

    return _check_role
