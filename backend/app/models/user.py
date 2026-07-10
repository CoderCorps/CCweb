from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey, Text, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base
import datetime

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="student", nullable=False) # 'student' | 'mentor' | 'admin'
    avatar_url: Mapped[str] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)

    # Relationships
    profile: Mapped["Profile"] = relationship("Profile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    project_memberships: Mapped[list["ProjectMember"]] = relationship("ProjectMember", back_populates="user", cascade="all, delete-orphan")
    assigned_tasks: Mapped[list["Task"]] = relationship("Task", back_populates="assignee")
    submissions: Mapped[list["Submission"]] = relationship("Submission", foreign_keys="[Submission.user_id]", back_populates="user")
    reviewed_submissions: Mapped[list["Submission"]] = relationship("Submission", foreign_keys="[Submission.reviewed_by_id]", back_populates="reviewer")
    certificates: Mapped[list["Certificate"]] = relationship("Certificate", back_populates="user")

class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    bio: Mapped[str] = mapped_column(Text, nullable=True)
    college: Mapped[str] = mapped_column(String(255), nullable=True)
    skills: Mapped[dict] = mapped_column(JSON, default=list, nullable=False) # JSON array of strings
    github_url: Mapped[str] = mapped_column(String(255), nullable=True)
    linkedin_url: Mapped[str] = mapped_column(String(255), nullable=True)
    resume_url: Mapped[str] = mapped_column(String(255), nullable=True)
    is_public: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="profile")
