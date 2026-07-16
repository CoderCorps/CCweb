"""
Backend-wide pytest configuration.
Uses an in-memory SQLite DB to avoid touching the real dev database.
"""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.main import app
from app.db.session import Base
from app.deps import get_db, get_current_user
from app.models.user import User, Profile
from app.core import security

# ---------------------------------------------------------------------------
# In-memory SQLite test engine (isolated, never touches codercorps.db)
# ---------------------------------------------------------------------------
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def create_tables():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def db():
    """Provide a transactional test DB session that rolls back after each test."""
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture()
def client(db):
    """FastAPI test client with overridden DB dependency."""
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Seed fixtures
# ---------------------------------------------------------------------------

@pytest.fixture()
def mentor_user(db):
    user = User(
        name="Test Mentor",
        email="mentor@test.com",
        password_hash=security.get_password_hash("testpassword"),
        role="mentor",
    )
    db.add(user)
    db.flush()
    db.add(Profile(user_id=user.id, bio="", college="", skills=[], github_url="",
                   linkedin_url="", resume_url="", is_public=True))
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture()
def student_user(db):
    user = User(
        name="Test Student",
        email="student@test.com",
        password_hash=security.get_password_hash("testpassword"),
        role="student",
    )
    db.add(user)
    db.flush()
    db.add(Profile(user_id=user.id, bio="", college="", skills=[], github_url="",
                   linkedin_url="", resume_url="", is_public=True))
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture()
def student_user2(db):
    user = User(
        name="Test Student 2",
        email="student2@test.com",
        password_hash=security.get_password_hash("testpassword"),
        role="student",
    )
    db.add(user)
    db.flush()
    db.add(Profile(user_id=user.id, bio="", college="", skills=[], github_url="",
                   linkedin_url="", resume_url="", is_public=True))
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture()
def mentor_token(mentor_user):
    return security.create_access_token(subject=mentor_user.id)


@pytest.fixture()
def student_token(student_user):
    return security.create_access_token(subject=student_user.id)


@pytest.fixture()
def student2_token(student_user2):
    return security.create_access_token(subject=student_user2.id)


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}
