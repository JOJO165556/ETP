"""Endpoints des notifications in-app (isoles par utilisateur)."""
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.modules.auth.dependencies import get_current_user
from src.modules.notifications.schemas import (
    NotificationListResponse,
    NotificationMarkedResponse,
    NotificationReadAllResponse,
    NotificationResponse,
)
from src.modules.notifications.services import NotificationService
from src.modules.users.models import User

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get(
    "/me",
    response_model=NotificationListResponse,
    summary="Lister ses notifications",
)
async def get_my_notifications(
    unread_only: bool = Query(False, description="Ne retourner que les non lues"),
    limit: int = Query(20, ge=1, le=100, description="Taille de page"),
    offset: int = Query(0, ge=0, description="Decalage de pagination"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NotificationListResponse:
    """Retourne uniquement les notifications de l'utilisateur authentifie."""
    service = NotificationService(db)
    notifications, total, unread_count = await service.list_for_user(
        user_id=str(current_user.id),
        unread_only=unread_only,
        limit=limit,
        offset=offset,
    )
    return NotificationListResponse(
        notifications=[NotificationResponse.model_validate(n) for n in notifications],
        total=total,
        unread_count=unread_count,
        limit=limit,
        offset=offset,
    )


@router.patch(
    "/{notification_id}/read",
    response_model=NotificationMarkedResponse,
    summary="Marquer une notification comme lue",
)
async def mark_as_read(
    notification_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NotificationMarkedResponse:
    """Verifie la propriete de la notification avant mise a jour (anti-IDOR)."""
    service = NotificationService(db)
    notification = await service.mark_as_read(
        notification_id=notification_id,
        user_id=str(current_user.id),
    )
    return NotificationMarkedResponse(
        message="Notification marquée comme lue.",
        id=notification.id,
        is_read=True,
    )


@router.post(
    "/read-all",
    response_model=NotificationReadAllResponse,
    summary="Marquer toutes ses notifications comme lues",
)
async def mark_all_as_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NotificationReadAllResponse:
    """Marque toutes les notifications non lues de l'utilisateur connecte."""
    service = NotificationService(db)
    updated = await service.mark_all_as_read(str(current_user.id))
    return NotificationReadAllResponse(
        message="Toutes les notifications ont été marquées comme lues.",
        updated=updated,
    )
