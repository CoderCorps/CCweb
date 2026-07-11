from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from typing import List

from app.deps import get_db, get_current_user
from app.models.user import User
from app.models.communication import MessageReaction, RoomMessage
from app.models.daily_activity import DailyReport
from app.schemas.communication import MessageReactionCreate, MessageReactionResponse

router = APIRouter()

def verify_target_exists(db: Session, target_type: str, target_id: int):
    if target_type == "room_message":
        if not db.query(RoomMessage).filter(RoomMessage.id == target_id).first():
            raise HTTPException(status_code=404, detail="Room message not found")
    elif target_type == "daily_report":
        if not db.query(DailyReport).filter(DailyReport.id == target_id).first():
            raise HTTPException(status_code=404, detail="Daily report not found")
    else:
        raise HTTPException(status_code=400, detail="Invalid target type")

@router.get("", response_model=List[MessageReactionResponse])
def get_reactions(
    target_type: str,
    target_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(MessageReaction).filter(
        MessageReaction.target_type == target_type,
        MessageReaction.target_id == target_id
    ).all()

@router.post("", response_model=MessageReactionResponse, status_code=status.HTTP_201_CREATED)
def toggle_or_create_reaction(
    payload: MessageReactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Toggle a reaction: if it exists, remove it; if not, add it.
    """
    verify_target_exists(db, payload.target_type, payload.target_id)

    existing = db.query(MessageReaction).filter(
        MessageReaction.target_type == payload.target_type,
        MessageReaction.target_id == payload.target_id,
        MessageReaction.user_id == current_user.id,
        MessageReaction.emoji == payload.emoji
    ).first()

    if existing:
        db.delete(existing)
        db.commit()
        # Return 204 No Content for a toggle-off
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    new_reaction = MessageReaction(
        target_type=payload.target_type,
        target_id=payload.target_id,
        user_id=current_user.id,
        emoji=payload.emoji
    )
    db.add(new_reaction)
    db.commit()
    db.refresh(new_reaction)
    return new_reaction

@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def delete_reaction(
    payload: MessageReactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Explicitly delete a reaction.
    """
    existing = db.query(MessageReaction).filter(
        MessageReaction.target_type == payload.target_type,
        MessageReaction.target_id == payload.target_id,
        MessageReaction.user_id == current_user.id,
        MessageReaction.emoji == payload.emoji
    ).first()

    if existing:
        db.delete(existing)
        db.commit()
    
    return Response(status_code=status.HTTP_204_NO_CONTENT)
