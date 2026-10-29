from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.database import Base
from src.models.mixins import AuditMixin, BaseUUIDMixin

if TYPE_CHECKING:
    from src.modules.applications.models import Application
    from src.modules.users.models import User


class InterviewStatus(str, Enum):
    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"


class Interview(Base, BaseUUIDMixin, AuditMixin):
    __tablename__ = "interviews"

    application_id: Mapped[str] = mapped_column(
        ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True
    )
    interviewer_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    scheduled_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    duration_minutes: Mapped[int] = mapped_column(Integer, default=45, nullable=False)
    status: Mapped[InterviewStatus] = mapped_column(
        SQLEnum(InterviewStatus), default=InterviewStatus.SCHEDULED, nullable=False, index=True
    )
    meeting_link: Mapped[str | None] = mapped_column(String(512), nullable=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    __table_args__ = (
        CheckConstraint("duration_minutes > 0", name="ck_interview_duration_positive"),
    )

    # Relations
    application: Mapped["Application"] = relationship("Application", back_populates="interviews")
    interviewer: Mapped["User"] = relationship("User")
