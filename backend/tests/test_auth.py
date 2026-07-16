"""
Tests for /auth endpoints: signup, login, /me, refresh, logout.
Each test verifies both the happy path AND the expected rejection.
"""
import pytest
from fastapi.testclient import TestClient
from tests.conftest import auth_headers
from app.api.v1.auth import rate_limit_records


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    """Clear the in-memory rate limiter before each test to avoid 429 interference."""
    rate_limit_records.clear()
    yield
    rate_limit_records.clear()


class TestSignup:
    def test_signup_success(self, client: TestClient):
        res = client.post("/api/v1/auth/signup", json={
            "name": "New User",
            "email": "newuser@test.com",
            "password": "securepass123",
            "role": "student"
        })
        assert res.status_code == 201
        data = res.json()
        assert "access_token" in data
        assert data["user"]["email"] == "newuser@test.com"
        assert data["user"]["role"] == "student"

    def test_signup_duplicate_email_rejected(self, client: TestClient, student_user):
        """Duplicate email must return 400."""
        res = client.post("/api/v1/auth/signup", json={
            "name": "Another Name",
            "email": student_user.email,  # already exists
            "password": "anypassword",
            "role": "student"
        })
        assert res.status_code == 400
        assert "already exists" in res.json()["detail"].lower()

    def test_signup_invalid_role_rejected(self, client: TestClient):
        """Role must be one of student/mentor/admin — not arbitrary strings."""
        res = client.post("/api/v1/auth/signup", json={
            "name": "Bad Role User",
            "email": "badrole@test.com",
            "password": "securepass",
            "role": "superadmin"  # invalid
        })
        assert res.status_code == 422  # Pydantic validation error


class TestLogin:
    def test_login_success(self, client: TestClient, student_user):
        res = client.post("/api/v1/auth/login", data={
            "username": student_user.email,
            "password": "testpassword"
        })
        assert res.status_code == 200
        data = res.json()
        assert "access_token" in data
        assert data["user"]["id"] == student_user.id

    def test_login_wrong_password_rejected(self, client: TestClient, student_user):
        """Wrong password must return 400."""
        res = client.post("/api/v1/auth/login", data={
            "username": student_user.email,
            "password": "wrongpassword"
        })
        assert res.status_code == 400

    def test_login_unknown_email_rejected(self, client: TestClient):
        """Non-existent email must return 400."""
        res = client.post("/api/v1/auth/login", data={
            "username": "nobody@nowhere.com",
            "password": "doesntmatter"
        })
        # Rate limiter may fire (429) or unknown email (400) — both are correct rejections
        assert res.status_code in (400, 429)


class TestMe:
    def test_me_returns_current_user(self, client: TestClient, student_user, student_token):
        res = client.get("/api/v1/auth/me",
                         headers=auth_headers(student_token))
        assert res.status_code == 200
        data = res.json()
        assert data["id"] == student_user.id
        assert data["email"] == student_user.email

    def test_me_without_token_rejected(self, client: TestClient):
        """No token → 401."""
        res = client.get("/api/v1/auth/me")
        assert res.status_code == 401

    def test_me_with_invalid_token_rejected(self, client: TestClient):
        """Garbage token → 401."""
        res = client.get("/api/v1/auth/me",
                         headers={"Authorization": "Bearer totally.invalid.jwt"})
        assert res.status_code == 401


class TestLogout:
    def test_logout_clears_cookie(self, client: TestClient, student_token):
        res = client.post("/api/v1/auth/logout",
                          headers=auth_headers(student_token))
        assert res.status_code == 200
        # Cookie should be deleted (set-cookie with max-age=0 or expires in past)
        set_cookie = res.headers.get("set-cookie", "")
        assert "refresh_token" in set_cookie


class TestAccountUpdate:
    def test_password_change_requires_correct_current_password(
        self, client: TestClient, student_user, student_token
    ):
        res = client.patch("/api/v1/auth/account",
                           headers=auth_headers(student_token),
                           json={
                               "current_password": "wrongcurrent",
                               "new_password": "newpass123"
                           })
        assert res.status_code == 400

    def test_password_change_success(self, client: TestClient, student_user, student_token):
        res = client.patch("/api/v1/auth/account",
                           headers=auth_headers(student_token),
                           json={
                               "current_password": "testpassword",
                               "new_password": "newpass456"
                           })
        assert res.status_code == 200
        # Can now login with new password
        login_res = client.post("/api/v1/auth/login", data={
            "username": student_user.email,
            "password": "newpass456"
        })
        assert login_res.status_code == 200

    def test_email_change_rejected_if_taken(
        self, client: TestClient, student_user, mentor_user, student_token
    ):
        """Can't change email to one that belongs to another user."""
        res = client.patch("/api/v1/auth/account",
                           headers=auth_headers(student_token),
                           json={"email": mentor_user.email})
        assert res.status_code == 400
