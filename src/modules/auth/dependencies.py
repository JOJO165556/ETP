"""Dependances d'authentification et d'autorisation."""
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from src.core.config import settings
from src.core.database import get_db
from src.core.security import verify_access_token, ALGORITHM
from src.modules.auth.schemas import TokenData
from src.modules.users.models import User, UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme),
) -> User:
    """
    Dependance centrale d'authentification.
    Decode le JWT, valide la signature et retourne l'utilisateur actif correspondant.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Impossible de valider les informations d'identification",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = verify_access_token(token)
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        token_data = TokenData(user_id=user_id)
    except JWTError:
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == token_data.user_id))
    user = result.scalars().first()

    if user is None or not user.is_active:
        raise credentials_exception

    # Stocker l'utilisateur dans request.state pour modified_by
    request.state.current_user = user

    return user


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
