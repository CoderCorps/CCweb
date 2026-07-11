from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from typing import List

from app.deps import get_db, get_current_user
from app.models.user import User
from app.models.communication import Announcement, AnnouncementRead
from app.schemas.communication import AnnouncementReadReceipt

router = APIRouter()

@router.post("/{id}/read", status_code=status.HTTP_201_CREATED)
def mark_announcement_read(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Marks an announcement as read for the current user.
    """
    announcement = db.query(Announcement).filter(Announcement.id == id).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")
        
    existing = db.query(AnnouncementRead).filter(
        AnnouncementRead.announcement_id == id,
        AnnouncementRead.user_id == current_user.id
    ).first()
    
    if not existing:
        new_read = AnnouncementRead(announcement_id=id, user_id=current_user.id)
        db.add(new_read)
        db.commit()
    
    return Response(status_code=status.HTTP_201_CREATED)

@router.get("/{id}/read-receipts", response_model=List[AnnouncementReadReceipt])
def get_announcement_read_receipts(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lists users who have read the announcement. Mentor only.
    """
    announcement = db.query(Announcement).filter(Announcement.id == id).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")
        
    # Mentor check
    if current_user.role != "admin" and (current_user.role != "mentor" or announcement.project.mentor_id != current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to view read receipts")

    receipts = db.query(AnnouncementRead).filter(AnnouncementRead.announcement_id == id).all()
    return receipts
