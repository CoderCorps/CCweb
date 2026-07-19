from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
import asyncio

from typing import List
from app.deps import get_db, get_current_user
from app.models.user import User, Profile
from app.schemas.user import UserResponse, PortfolioUpdate
from app.schemas.badge import UserBadge
from app.schemas.submission import CertificateResponse

class PortfolioResponse(UserResponse):
    badges: List[UserBadge] = []
    certificates: List[CertificateResponse] = []

router = APIRouter()

@router.get("", response_model=List[str])
async def list_public_portfolios(db: Session = Depends(get_db)):
    users = await asyncio.to_thread(
        lambda: db.query(User).join(User.profile).filter(Profile.is_public == True).all()
    )
    return [u.name.lower().replace(" ", "-") for u in users]


@router.get("/{username}", response_model=PortfolioResponse)
async def get_public_portfolio(username: str, db: Session = Depends(get_db)):
    def _query():
        user = db.query(User).filter(
            func.lower(func.replace(User.name, " ", "-")) == username.lower()
        ).first()
        if not user:
            try:
                user_id = int(username)
                user = db.query(User).filter(User.id == user_id).first()
            except ValueError:
                pass
        return user

    user = await asyncio.to_thread(_query)
    if not user or not user.profile or not user.profile.is_public:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Portfolio not found or private")
    return user

@router.patch("/me", response_model=UserResponse)
async def update_my_portfolio(
    payload: PortfolioUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    def _update():
        if payload.name is not None:
            current_user.name = payload.name
        if payload.email is not None:
            existing = db.query(User).filter(User.email == payload.email, User.id != current_user.id).first()
            if existing:
                return None, "email_taken"
            current_user.email = payload.email
        if payload.avatar_url is not None:
            current_user.avatar_url = payload.avatar_url

        profile = current_user.profile
        if not profile:
            profile = Profile(user_id=current_user.id)
            db.add(profile)
            db.commit()
            db.refresh(profile)

        if payload.bio is not None:
            profile.bio = payload.bio
        if payload.college is not None:
            profile.college = payload.college
        if payload.skills is not None:
            profile.skills = payload.skills
        if payload.github_url is not None:
            profile.github_url = payload.github_url
        if payload.linkedin_url is not None:
            profile.linkedin_url = payload.linkedin_url
        if payload.resume_url is not None:
            profile.resume_url = payload.resume_url
        if payload.is_public is not None:
            profile.is_public = payload.is_public
        if payload.availability is not None:
            profile.availability = payload.availability

        db.commit()
        db.refresh(current_user)
        return current_user, "ok"

    result, status_str = await asyncio.to_thread(_update)
    if status_str == "email_taken":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered by another user")
    return result
