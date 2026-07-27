from fastapi import APIRouter, Depends, HTTPException, status, Response, Cookie, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import time
import asyncio
from datetime import timedelta
from typing import Optional
from pydantic import BaseModel, EmailStr
from collections import defaultdict

from app.deps import get_db, get_current_user, get_current_user_unverified
from app.core.config import settings
from app.core import security
from app.models.user import User, Profile
from app.models.candidate import CandidateApplication
from app.schemas.user import UserCreate, UserResponse, Token

# Simple in-memory rate limiter: IP -> (list of timestamps)
rate_limit_records = defaultdict(list)

def check_rate_limit(request: Request):
    x_forwarded = request.headers.get("x-forwarded-for")
    if x_forwarded:
        client_ip = x_forwarded.split(",")[0].strip()
    else:
        client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    
    # Clean up timestamps older than 60 seconds
    rate_limit_records[client_ip] = [t for t in rate_limit_records[client_ip] if now - t < 60]
    
    # Allow 20 attempts per minute per unique client IP
    if len(rate_limit_records[client_ip]) >= 20:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many authentication attempts. Please try again in a minute."
        )
        
    rate_limit_records[client_ip].append(now)

router = APIRouter()

@router.post("/signup", response_model=Token, status_code=status.HTTP_201_CREATED)
async def signup(
    response: Response,
    user_in: UserCreate,
    db: Session = Depends(get_db),
    _ = Depends(check_rate_limit)
):
    clean_email = user_in.email.strip().lower()

    # Check if user already exists
    user = db.query(User).filter(User.email == clean_email).first()
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists."
        )

    # Students MUST have a passed assessment (score >= 70) to be able to sign up.
    # Mentors can sign up directly and go through admin approval.
    if user_in.role == "student":
        from app.models.assessment import AssessmentAttempt
        from app.models.candidate import AssessmentInvitation
        passed_attempt = (
            db.query(AssessmentAttempt)
            .join(AssessmentInvitation, AssessmentAttempt.invitation_id == AssessmentInvitation.id)
            .join(CandidateApplication, AssessmentInvitation.application_id == CandidateApplication.id)
            .filter(CandidateApplication.email == clean_email)
            .filter(AssessmentAttempt.status == "completed")
            .filter(AssessmentAttempt.total_score >= 70.0)
            .first()
        )
        if not passed_attempt:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Students must apply and pass the screening assessment (score ≥ 70%) before creating an account. Please visit the Apply page to begin."
            )

    app_rec = db.query(CandidateApplication).filter(CandidateApplication.email == clean_email).first()
    is_pre_approved = app_rec is not None and app_rec.source == "pre_approved"

    # Hash password & create user
    hashed_password = security.get_password_hash(user_in.password)
    db_user = User(
        name=user_in.name,
        email=clean_email,
        password_hash=hashed_password,
        role=user_in.role,
        status="active" if is_pre_approved else ("pending" if user_in.role in ["mentor", "student"] else "active"),
        avatar_url=user_in.avatar_url
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # Create empty profile associated with user
    db_profile = Profile(
        user_id=db_user.id,
        bio="",
        college="",
        skills=[],
        github_url="",
        linkedin_url="",
        resume_url="",
        is_public=True
    )
    db.add(db_profile)
    db.commit()
    db.refresh(db_user) # Reload user to include profile relationship

    # Generate tokens
    access_token = security.create_access_token(subject=db_user.id)
    refresh_token = security.create_refresh_token(subject=db_user.id)

    # Set refresh token in HttpOnly cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        samesite="none",
        secure=True,
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "refresh_token": refresh_token,
        "user": db_user
    }

@router.post("/login", response_model=Token)
async def login(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
    _ = Depends(check_rate_limit)
):
    # Authenticate user (form_data.username is treated as email)
    clean_username = form_data.username.strip().lower()
    user = db.query(User).filter(User.email == clean_username).first()
    if not user or not security.verify_password(form_data.password.strip(), user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password"
        )
    
    # Generate tokens
    access_token = security.create_access_token(subject=user.id)
    refresh_token = security.create_refresh_token(subject=user.id)
 
    # Set refresh token in HttpOnly cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        samesite="none",
        secure=True,
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "refresh_token": refresh_token,
        "user": user
    }

@router.post("/refresh", response_model=Token)
async def refresh_token_route(
    response: Response,
    refresh_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing"
        )
    
    payload = security.decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    # Generate new access token and refresh token
    new_access_token = security.create_access_token(subject=user.id)
    new_refresh_token = security.create_refresh_token(subject=user.id)

    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        samesite="none",
        secure=True,
    )

    return {
        "access_token": new_access_token,
        "token_type": "bearer",
        "refresh_token": new_refresh_token,
        "user": user
    }

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user_unverified)):
    return current_user

@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(key="refresh_token")
    return {"detail": "Successfully logged out"}

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class AccountUpdate(BaseModel):
    email: Optional[EmailStr] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None

@router.post("/forgot-password")
async def forgot_password(
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db)
):
    # Search user by email
    user = db.query(User).filter(User.email == payload.email).first()
    
    # In development mode, log reset token to console if user exists.
    # Return generic success response to prevent user enumeration.
    if user:
        reset_token = security.create_access_token(subject=user.id, expires_delta=timedelta(hours=1))
        print(f"\n[DEV MODE] PASSWORD RESET REQUEST FOR {user.email}")
        print(f"[DEV MODE] RESET TOKEN: {reset_token}\n")
        # TODO: Wire a real email provider like Resend or SendGrid here
        
    return {"message": "If this email exists in our system, a password reset link has been sent."}

@router.patch("/account")
async def update_account(
    payload: AccountUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Update email if provided
    if payload.email is not None and payload.email != current_user.email:
        # Check if email is already taken
        existing = db.query(User).filter(User.email == payload.email, User.id != current_user.id).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered by another user."
            )
        current_user.email = payload.email
        
    # 2. Update password if new password is provided
    if payload.new_password:
        if not payload.current_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is required to change password."
            )
        if not security.verify_password(payload.current_password, current_user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Incorrect current password."
            )
        current_user.password_hash = security.get_password_hash(payload.new_password)
        
    db.commit()
    db.refresh(current_user)
    return {"status": "success", "message": "Account updated successfully."}

