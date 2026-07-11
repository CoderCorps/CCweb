from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func, desc
from typing import List
import datetime

from app.deps import get_db, get_current_user
from app.models.user import User
from app.models.communication import DirectMessage
from app.schemas.communication import DirectMessageCreate, DirectMessageResponse, ThreadPreviewResponse
from app.schemas.user import UserResponse

router = APIRouter()

@router.get("/threads", response_model=List[ThreadPreviewResponse])
def get_message_threads(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns a list of users you've DMed, with the last message preview and unread count.
    """
    # Find all users I have exchanged messages with
    # This requires some complex aggregation in SQLAlchemy, but we can do it via subqueries or python processing.
    # For v1, we can fetch all messages involving the user and group them.
    messages = db.query(DirectMessage).filter(
        or_(
            DirectMessage.sender_id == current_user.id,
            DirectMessage.recipient_id == current_user.id
        )
    ).order_by(desc(DirectMessage.created_at)).all()

    threads = {} # user_id -> { "user": User, "last_message": DirectMessage, "unread_count": int }
    
    for msg in messages:
        other_user_id = msg.sender_id if msg.recipient_id == current_user.id else msg.recipient_id
        if other_user_id not in threads:
            other_user = msg.sender if msg.sender_id == other_user_id else msg.recipient
            threads[other_user_id] = {
                "user": other_user,
                "last_message": msg,
                "unread_count": 0
            }
        
        # If I am the recipient and it's unread, increment count
        if msg.recipient_id == current_user.id and msg.read_at is None:
            threads[other_user_id]["unread_count"] += 1

    return list(threads.values())

@router.get("/thread/{user_id}", response_model=List[DirectMessageResponse])
def get_message_thread(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns full history with a specific user.
    """
    messages = db.query(DirectMessage).filter(
        or_(
            and_(DirectMessage.sender_id == current_user.id, DirectMessage.recipient_id == user_id),
            and_(DirectMessage.sender_id == user_id, DirectMessage.recipient_id == current_user.id)
        )
    ).order_by(DirectMessage.created_at.asc()).all()

    return messages

@router.post("", response_model=DirectMessageResponse, status_code=status.HTTP_201_CREATED)
def create_direct_message(
    payload: DirectMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Send a direct message to a user.
    """
    if payload.recipient_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot send message to yourself")

    recipient = db.query(User).filter(User.id == payload.recipient_id).first()
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")

    new_msg = DirectMessage(
        sender_id=current_user.id,
        recipient_id=payload.recipient_id,
        content=payload.content
    )
    db.add(new_msg)
    db.commit()
    db.refresh(new_msg)
    return new_msg

@router.patch("/{id}/read", response_model=DirectMessageResponse)
def mark_message_read(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Marks a message as read. Only the recipient can mark it read.
    """
    msg = db.query(DirectMessage).filter(DirectMessage.id == id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    
    if msg.recipient_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to mark this message as read")
    
    if msg.read_at is None:
        msg.read_at = datetime.datetime.utcnow()
        db.commit()
        db.refresh(msg)
        
    return msg
