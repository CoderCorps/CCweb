from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session

from app.deps import get_db, get_current_user
from app.models.user import User
from app.models.sprint import TaskComment

router = APIRouter()

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task_comment(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Deletes a task comment. Must be the author or the project mentor.
    """
    comment = db.query(TaskComment).filter(TaskComment.id == id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    # Author check
    is_author = comment.user_id == current_user.id
    
    # Mentor check
    is_mentor = False
    if current_user.role == "mentor" or current_user.role == "admin":
        if comment.task and comment.task.sprint and comment.task.sprint.project:
            if comment.task.sprint.project.mentor_id == current_user.id or current_user.role == "admin":
                is_mentor = True

    if not is_author and not is_mentor:
        raise HTTPException(status_code=403, detail="Not authorized to delete this comment")

    db.delete(comment)
    db.commit()
    
    return Response(status_code=status.HTTP_204_NO_CONTENT)
