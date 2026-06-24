from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.modules.auth.dependencies import get_current_user
from src.modules.users.models import User
from src.modules.notifications.services import NotificationService
from src.modules.notifications.schemas import NotificationCreate

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.post("/", summary="Créer une notification")
async def create_notification(
    body: NotificationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = NotificationService(db)
    return await service.create(
        recipient_id=body.recipient_id,
        subject=body.subject,
        body=body.body,
        notification_type=body.notification_type,
    )


@router.get("/me", summary="Mes notifications")
async def get_my_notifications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # TODO: Requête en base pour les notifications de l'utilisateur
    return {"notifications": [], "unread_count": 0}


@router.post("/{notification_id}/read", summary="Marquer comme lu")
async def mark_as_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
):
    return {"message": "Notification marquée comme lue", "id": notification_id}
