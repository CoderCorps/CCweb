from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session

from app.deps import get_db, get_current_user
from app.models.user import User
from app.models.project import Resource

router = APIRouter()

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resource(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Deletes a project resource. Must be the author or the project mentor.
    """
    resource = db.query(Resource).filter(Resource.id == id).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")

    is_author = resource.added_by == current_user.id
    
    is_mentor = False
    if current_user.role == "mentor" or current_user.role == "admin":
        if resource.project:
            if resource.project.mentor_id == current_user.id or current_user.role == "admin":
                is_mentor = True

    if not is_author and not is_mentor:
        raise HTTPException(status_code=403, detail="Not authorized to delete this resource")

    db.delete(resource)
    db.commit()
    
    return Response(status_code=status.HTTP_204_NO_CONTENT)
