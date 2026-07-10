from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.deps import get_db, get_current_user
from app.models.user import User, Profile
from app.schemas.user import UserResponse, ProfileBase

router = APIRouter()

@router.get("/{username}", response_model=UserResponse)
def get_public_portfolio(username: str, db: Session = Depends(get_db)):
    # Match user where slugified name matches username. E.g. "atul-sharma" matches "Atul Sharma"
    # Replace spaces with hyphens, lowercase it
    user = db.query(User).filter(
        func.lower(func.replace(User.name, " ", "-")) == username.lower()
    ).first()
    
    if not user:
        # Fallback to direct ID match if username is an integer
        try:
            user_id = int(username)
            user = db.query(User).filter(User.id == user_id).first()
        except ValueError:
            pass

    if not user or not user.profile or not user.profile.is_public:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found or private"
        )
    return user

@router.patch("/me", response_model=UserResponse)
def update_my_portfolio(
    profile_in: ProfileBase,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    profile = current_user.profile
    if not profile:
        # Create profile if not exists
        profile = Profile(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)

    # Update profile fields
    update_data = profile_in.model_dump(exclude_unset=True)
    for key, val in update_data.items():
        setattr(profile, key, val)

    db.commit()
    db.refresh(current_user)
    return current_user
