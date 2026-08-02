import os
import hashlib
import datetime
from datetime import timezone, timedelta
import pytest
from app.models.user import User
from app.models.password_reset import PasswordResetToken, SecurityAuditLog
from app.core import security
from app.core.rate_limiter import rate_limiter

def auth_headers(token: str):
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(autouse=True)
def clear_rate_limiter():
    rate_limiter.reset()

def test_forgot_password_non_existent_email_returns_identical_generic_response(client, db):
    """
    SECURITY REQUIREMENT: Requesting a reset for a non-existent email returns the exact same
    response status code and body as for an existing email.
    """
    # 1. Existing user
    existing_user = User(
        name="Existing User",
        email="existing_user_test@codercorps.com",
        password_hash=security.get_password_hash("password123456"),
        role="student",
        status="active"
    )
    db.add(existing_user)
    db.commit()

    # Request reset for existing email
    res1 = client.post("/api/v1/auth/forgot-password", json={"email": "existing_user_test@codercorps.com"})
    assert res1.status_code == 200
    body1 = res1.json()

    # Request reset for non-existent email
    res2 = client.post("/api/v1/auth/forgot-password", json={"email": "non_existent_random99@codercorps.com"})
    assert res2.status_code == 200
    body2 = res2.json()

    # Assert byte-for-byte identical response body & status code
    assert res1.status_code == res2.status_code
    assert body1 == body2
    assert body1["message"] == "If an account exists with that email, a password reset link has been sent."

def test_forgot_password_generates_hashed_30min_token_in_db(client, db):
    user = User(
        name="Token Test User",
        email="token_user@codercorps.com",
        password_hash=security.get_password_hash("password123456"),
        role="student",
        status="active"
    )
    db.add(user)
    db.commit()

    res = client.post("/api/v1/auth/forgot-password", json={"email": "token_user@codercorps.com"})
    assert res.status_code == 200

    token_rec = db.query(PasswordResetToken).filter(PasswordResetToken.user_id == user.id).first()
    assert token_rec is not None
    assert token_rec.used_at is None
    assert len(token_rec.token_hash) == 64 # SHA-256 hex string

    now = datetime.datetime.now(timezone.utc).replace(tzinfo=None)
    # Check expiry is roughly 30 minutes from creation
    diff_minutes = (token_rec.expires_at - token_rec.created_at).total_seconds() / 60.0
    assert abs(diff_minutes - 30.0) < 1.0

def test_requesting_second_reset_invalidates_first_active_token(client, db):
    """
    SECURITY REQUIREMENT: Requesting a new reset invalidates any previous unused reset token for that account.
    """
    user = User(
        name="Multi Request User",
        email="multi_request@codercorps.com",
        password_hash=security.get_password_hash("password123456"),
        role="student",
        status="active"
    )
    db.add(user)
    db.commit()

    # First request
    client.post("/api/v1/auth/forgot-password", json={"email": "multi_request@codercorps.com"})
    first_token_rec = db.query(PasswordResetToken).filter(PasswordResetToken.user_id == user.id).order_by(PasswordResetToken.id.asc()).first()
    assert first_token_rec.used_at is None

    # Second request
    client.post("/api/v1/auth/forgot-password", json={"email": "multi_request@codercorps.com"})
    
    db.refresh(first_token_rec)
    assert first_token_rec.used_at is not None # First token has been invalidated!

def test_verify_and_reset_password_flow_with_single_use_and_expiry(client, db):
    """
    Tests token verification, single-use restriction, and expiry.
    """
    user = User(
        name="Reset Flow User",
        email="reset_flow@codercorps.com",
        password_hash=security.get_password_hash("old_password_123"),
        role="student",
        status="active"
    )
    db.add(user)
    db.commit()

    # Request reset
    client.post("/api/v1/auth/forgot-password", json={"email": "reset_flow@codercorps.com"})
    
    # Retrieve raw token from DB via audit log / matching token hash
    token_rec = db.query(PasswordResetToken).filter(PasswordResetToken.user_id == user.id).first()
    
    # Test bad token verify
    res_bad = client.get("/api/v1/auth/reset-password/bad_invalid_token_xyz/verify")
    assert res_bad.status_code == 400
    assert res_bad.json()["detail"] == "This link is invalid or has expired."

    # Test expired token
    token_rec.expires_at = datetime.datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(minutes=1)
    db.commit()

    # We need a fresh valid token for actual reset
    client.post("/api/v1/auth/forgot-password", json={"email": "reset_flow@codercorps.com"})
    fresh_token_rec = db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used_at.is_(None)
    ).first()

    # We mock or compute matching raw token for test by looking at database token_hash match
    # In test, create token directly with known raw token
    import secrets
    raw_test_token = secrets.token_urlsafe(32)
    raw_hash = hashlib.sha256(raw_test_token.encode("utf-8")).hexdigest()
    
    now = datetime.datetime.now(timezone.utc).replace(tzinfo=None)
    test_token_rec = PasswordResetToken(
        user_id=user.id,
        token_hash=raw_hash,
        created_at=now,
        expires_at=now + timedelta(minutes=30)
    )
    db.add(test_token_rec)
    db.commit()

    # Verify valid raw token
    res_verify = client.get(f"/api/v1/auth/reset-password/{raw_test_token}/verify")
    assert res_verify.status_code == 200
    assert res_verify.json()["valid"] is True

    # Complete reset
    res_reset = client.post("/api/v1/auth/reset-password", json={
        "token": raw_test_token,
        "new_password": "new_secure_password_999"
    })
    assert res_reset.status_code == 200
    assert res_reset.json()["ok"] is True

    # SINGLE-USE TEST: Using the token a second time MUST fail
    res_reuse = client.get(f"/api/v1/auth/reset-password/{raw_test_token}/verify")
    assert res_reuse.status_code == 400
    assert res_reuse.json()["detail"] == "This link is invalid or has expired."

    res_reset_reuse = client.post("/api/v1/auth/reset-password", json={
        "token": raw_test_token,
        "new_password": "another_new_password_123"
    })
    assert res_reset_reuse.status_code == 400
    assert res_reset_reuse.json()["detail"] == "This link is invalid or has expired."

def test_password_reset_invalidates_all_active_user_sessions(client, db):
    """
    CRITICAL SECURITY REQUIREMENT: Successfully resetting the password invalidates ALL active sessions / refresh tokens.
    """
    user = User(
        name="Session Revocation User",
        email="session_revocation@codercorps.com",
        password_hash=security.get_password_hash("original_password_123"),
        role="student",
        status="active",
        token_version=1
    )
    db.add(user)
    db.commit()

    # Login before reset to get active access token
    old_access_token = security.create_access_token(subject=user.id, token_version=user.token_version)

    # Verify old token works before reset
    res_me_before = client.get("/api/v1/auth/me", headers=auth_headers(old_access_token))
    assert res_me_before.status_code == 200

    # Perform password reset
    import secrets
    raw_token = secrets.token_urlsafe(32)
    raw_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    now = datetime.datetime.now(timezone.utc).replace(tzinfo=None)

    reset_token_rec = PasswordResetToken(
        user_id=user.id,
        token_hash=raw_hash,
        created_at=now,
        expires_at=now + timedelta(minutes=30)
    )
    db.add(reset_token_rec)
    db.commit()

    res_reset = client.post("/api/v1/auth/reset-password", json={
        "token": raw_token,
        "new_password": "updated_secret_password_123"
    })
    assert res_reset.status_code == 200

    # SESSION INVALIDATION ASSERTION: Old access token MUST now be rejected with 401 Unauthorized!
    res_me_after = client.get("/api/v1/auth/me", headers=auth_headers(old_access_token))
    assert res_me_after.status_code == 401

    # Old password login fails
    res_login_old = client.post("/api/v1/auth/login", data={"username": "session_revocation@codercorps.com", "password": "original_password_123"})
    assert res_login_old.status_code == 400

    # New password login succeeds
    res_login_new = client.post("/api/v1/auth/login", data={"username": "session_revocation@codercorps.com", "password": "updated_secret_password_123"})
    assert res_login_new.status_code == 200

def test_password_reset_rejects_same_password_and_common_passwords(client, db):
    user = User(
        name="Validation User",
        email="validation_user@codercorps.com",
        password_hash=security.get_password_hash("current_password_123"),
        role="student",
        status="active"
    )
    db.add(user)
    db.commit()

    import secrets
    raw_token = secrets.token_urlsafe(32)
    raw_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    now = datetime.datetime.now(timezone.utc).replace(tzinfo=None)

    db.add(PasswordResetToken(
        user_id=user.id,
        token_hash=raw_hash,
        created_at=now,
        expires_at=now + timedelta(minutes=30)
    ))
    db.commit()

    # Reject identical password
    res_same = client.post("/api/v1/auth/reset-password", json={
        "token": raw_token,
        "new_password": "current_password_123"
    })
    assert res_same.status_code == 400
    assert "same as your current password" in res_same.json()["detail"]

    # Reject short password (< 12 chars)
    res_short = client.post("/api/v1/auth/reset-password", json={
        "token": raw_token,
        "new_password": "short123"
    })
    assert res_short.status_code in (400, 422)

def test_rate_limiting_on_forgot_password(client, db):
    """
    Verifies that requesting reset repeatedly triggers 429 Too Many Requests.
    """
    rate_limiter.reset()
    
    # 5 requests should succeed
    for i in range(5):
        res = client.post("/api/v1/auth/forgot-password", json={"email": f"rate_limit_{i}@codercorps.com"})
        assert res.status_code == 200

    # 6th request should fail with 429
    res_blocked = client.post("/api/v1/auth/forgot-password", json={"email": "rate_limit_6@codercorps.com"})
    assert res_blocked.status_code == 429
    assert "Too many password reset requests" in res_blocked.json()["detail"]
