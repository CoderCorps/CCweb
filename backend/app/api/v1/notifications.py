from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import datetime
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
def get_my_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Returns all notifications sorted newest first
    return db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).all()

@router.patch("/{id}/read", response_model=NotificationResponse)
def mark_notification_read(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notif = db.query(Notification).filter(
        Notification.id == id,
        Notification.user_id == current_user.id
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    if notif.read_at is None:
        notif.read_at = datetime.datetime.now(datetime.timezone.utc)
        db.commit()
        db.refresh(notif)
        
    return notif

@router.patch("/read-all")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    now = datetime.datetime.now(datetime.timezone.utc)
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.read_at.is_(None)
    ).update({Notification.read_at: now}, synchronize_session=False)
    db.commit()
    return {"status": "success", "message": "All notifications marked as read"}
