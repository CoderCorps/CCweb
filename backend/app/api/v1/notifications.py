from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import datetime
import asyncio
from pydantic import BaseModel, ConfigDict

from app.deps import get_db, get_current_user
from app.models.user import User
from app.models.notification import Notification

router = APIRouter()

class NotificationResponse(BaseModel):
    id: int
    user_id: int
    type: str
    message: str
    link: str | None = None
    read_at: datetime.datetime | None = None
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

@router.get("/", response_model=List[NotificationResponse])
async def get_my_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await asyncio.to_thread(
        lambda: db.query(Notification).filter(
            Notification.user_id == current_user.id
        ).order_by(Notification.created_at.desc()).all()
    )

@router.patch("/{id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    def _mark():
        notif = db.query(Notification).filter(
            Notification.id == id,
            Notification.user_id == current_user.id
        ).first()
        if not notif:
            return None
        if notif.read_at is None:
            notif.read_at = datetime.datetime.now(datetime.timezone.utc)
            db.commit()
            db.refresh(notif)
        return notif

    notif = await asyncio.to_thread(_mark)
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    return notif

@router.patch("/read-all")
async def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    def _mark_all():
        now = datetime.datetime.now(datetime.timezone.utc)
        db.query(Notification).filter(
            Notification.user_id == current_user.id,
            Notification.read_at.is_(None)
        ).update({Notification.read_at: now}, synchronize_session=False)
        db.commit()

    await asyncio.to_thread(_mark_all)
    return {"status": "success", "message": "All notifications marked as read"}
