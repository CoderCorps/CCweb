from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.deps import get_db, get_current_user
from app.models.user import User
from app.models.badge import Badge as BadgeModel, UserBadge as UserBadgeModel
from app.schemas.badge import Badge, UserBadge, BadgeCreate

router = APIRouter()

@router.get("/", response_model=List[Badge])
def get_all_badges(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve all available badges in the system.
    """
    return db.query(BadgeModel).all()

@router.get("/my", response_model=List[UserBadge])
def get_my_badges(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve badges earned by the current user.
    """
    return db.query(UserBadgeModel).filter(UserBadgeModel.user_id == current_user.id).all()

@router.get("/user/{user_id}", response_model=List[UserBadge])
def get_user_badges(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve badges earned by a specific user (for portfolio view).
    """
    return db.query(UserBadgeModel).filter(UserBadgeModel.user_id == user_id).all()

@router.post("/", response_model=Badge, status_code=status.HTTP_201_CREATED)
def create_badge(
    badge_in: BadgeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new badge (Admin only).
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can create badges")
    
    db_badge = BadgeModel(**badge_in.model_dump())
    db.add(db_badge)
    db.commit()
    db.refresh(db_badge)
    return db_badge
