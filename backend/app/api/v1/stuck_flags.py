from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import datetime

from app.deps import get_db, get_current_user
from app.models.user import User
from app.models.sprint import StuckFlag
from app.schemas.interaction import StuckFlagResponse

router = APIRouter()

@router.patch("/{id}/resolve", response_model=StuckFlagResponse)
def resolve_stuck_flag(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Resolves a stuck flag. Can be done by the student who raised it or the project mentor.
    """
    flag = db.query(StuckFlag).filter(StuckFlag.id == id).first()
    if not flag:
        raise HTTPException(status_code=404, detail="Stuck flag not found")
        
    is_author = flag.user_id == current_user.id
    
    is_mentor = False
    if current_user.role == "mentor" or current_user.role == "admin":
        if flag.task and flag.task.sprint and flag.task.sprint.project:
            if flag.task.sprint.project.mentor_id == current_user.id or current_user.role == "admin":
                is_mentor = True

    if not is_author and not is_mentor:
        raise HTTPException(status_code=403, detail="Not authorized to resolve this stuck flag")

    if flag.resolved_at is None:
        flag.resolved_at = datetime.datetime.utcnow()
        flag.resolved_by = current_user.id
        db.commit()
        db.refresh(flag)
    
    return flag
