import os
import hashlib
import secrets
import datetime
from datetime import timezone, timedelta
from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.deps import get_db

from app.models.user import User
from app.models.password_reset import PasswordResetToken, SecurityAuditLog
from app.core import security
from app.core.rate_limiter import (
    get_client_ip,
    check_forgot_password_rate_limit,
    check_reset_verify_rate_limit,
    check_reset_password_rate_limit
)
from app.services.email_service import (
    send_password_reset_email,
    send_password_changed_notification_email
)

router = APIRouter()

COMMON_PASSWORDS_BLOCKLIST = {
    "password1234", "123456789012", "qwertyuiop12", "admin12345678",
    "letmein12345", "welcome12345", "password12345"
}

# --- Pydantic Schemas ---
class ForgotPasswordSchema(BaseModel):
    email: EmailStr

class ResetPasswordVerifySchema(BaseModel):
    valid: bool
    message: str

class ResetPasswordSchema(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        v_str = v.strip()
        if len(v_str) < 12:
            raise ValueError("Password must be at least 12 characters long.")
        if v_str.lower() in COMMON_PASSWORDS_BLOCKLIST:
            raise ValueError("This password is too common. Please choose a more secure password.")
        return v_str


def get_token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


# --------------------------------------------------------------------------
# 1. POST /auth/forgot-password
# --------------------------------------------------------------------------
@router.post("/forgot-password")
async def forgot_password(
    request: Request,
    payload: ForgotPasswordSchema,
    db: Session = Depends(get_db)
):
    clean_email = payload.email.strip().lower()
    ip_addr = get_client_ip(request)

    # Rate limiting (5 req/hr per IP, 3 req/hr per email)
    check_forgot_password_rate_limit(request, email=clean_email)

    user = db.query(User).filter(User.email == clean_email).first()

    now = datetime.datetime.now(timezone.utc).replace(tzinfo=None)
    generic_response = {"message": "If an account exists with that email, a password reset link has been sent."}

    if user:
        # Invalidate any previous unused reset tokens for this user
        db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used_at.is_(None)
        ).update({"used_at": now}, synchronize_session=False)

        # Generate cryptographically secure raw token & store SHA-256 hash
        raw_token = secrets.token_urlsafe(32)
        token_hash = get_token_hash(raw_token)
        expires_at = now + timedelta(minutes=30)

        reset_token_rec = PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            created_at=now,
            expires_at=expires_at,
            requested_ip=ip_addr
        )
        db.add(reset_token_rec)

        # Log security audit event
        audit_log = SecurityAuditLog(
            user_id=user.id,
            event_type="password_reset_requested",
            ip_address=ip_addr,
            created_at=now,
            metadata_json={"email": clean_email}
        )
        db.add(audit_log)
        db.commit()

        # Send password reset email
        send_password_reset_email(user.email, user.name, raw_token)

        return generic_response

    else:
        # Equal-cost dummy operation for non-existent email to prevent timing attacks
        _ = get_token_hash(secrets.token_urlsafe(32))

        audit_log = SecurityAuditLog(
            user_id=None,
            event_type="password_reset_requested",
            ip_address=ip_addr,
            created_at=now,
            metadata_json={"attempted_email": clean_email}
        )
        db.add(audit_log)
        db.commit()

        return generic_response


# --------------------------------------------------------------------------
# 2. GET /auth/reset-password/{token}/verify
# --------------------------------------------------------------------------
@router.get("/reset-password/{token}/verify", response_model=ResetPasswordVerifySchema)
async def verify_reset_token(
    token: str,
    request: Request,
    db: Session = Depends(get_db)
):
    ip_addr = get_client_ip(request)
    check_reset_verify_rate_limit(request)

    token_hash = get_token_hash(token)
    now = datetime.datetime.now(timezone.utc).replace(tzinfo=None)

    reset_token = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == token_hash
    ).first()

    invalid_exception = HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="This link is invalid or has expired."
    )

    if not reset_token or reset_token.used_at is not None or reset_token.expires_at < now:
        audit_log = SecurityAuditLog(
            user_id=reset_token.user_id if reset_token else None,
            event_type="password_reset_token_invalid_attempt",
            ip_address=ip_addr,
            created_at=now,
            metadata_json={"token_found": bool(reset_token)}
        )
        db.add(audit_log)
        db.commit()
        raise invalid_exception

    return {"valid": True, "message": "Token is valid."}


# --------------------------------------------------------------------------
# 3. POST /auth/reset-password
# --------------------------------------------------------------------------
@router.post("/reset-password")
async def reset_password(
    request: Request,
    payload: ResetPasswordSchema,
    db: Session = Depends(get_db)
):
    ip_addr = get_client_ip(request)
    check_reset_password_rate_limit(request)

    token_hash = get_token_hash(payload.token)
    now = datetime.datetime.now(timezone.utc).replace(tzinfo=None)

    reset_token = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == token_hash
    ).first()

    if not reset_token or reset_token.used_at is not None or reset_token.expires_at < now:
        audit_log = SecurityAuditLog(
            user_id=reset_token.user_id if reset_token else None,
            event_type="password_reset_token_invalid_attempt",
            ip_address=ip_addr,
            created_at=now,
            metadata_json={"token_found": bool(reset_token)}
        )
        db.add(audit_log)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This link is invalid or has expired."
        )

    user = db.query(User).filter(User.id == reset_token.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This link is invalid or has expired."
        )

    # Check if new password is identical to current password
    if security.verify_password(payload.new_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password cannot be the same as your current password."
        )

    # Update user password & increment token_version to invalidate ALL active sessions
    user.password_hash = security.get_password_hash(payload.new_password)
    user.token_version += 1

    # Mark current token used & invalidate all other active tokens for user
    reset_token.used_at = now
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used_at.is_(None)
    ).update({"used_at": now}, synchronize_session=False)

    # Log security audit log
    audit_log = SecurityAuditLog(
        user_id=user.id,
        event_type="password_reset_completed",
        ip_address=ip_addr,
        created_at=now
    )
    db.add(audit_log)
    db.commit()

    # Send security notification email to account email of record
    send_password_changed_notification_email(user.email, user.name)

    return {
        "ok": True,
        "message": "Password has been successfully updated. Please log in with your new password."
    }
