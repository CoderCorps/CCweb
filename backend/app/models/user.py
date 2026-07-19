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
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False) # 'pending' | 'active' | 'rejected'
    rejection_reason: Mapped[str] = mapped_column(Text, nullable=True)
    avatar_url: Mapped[str] = mapped_column(Text, nullable=True)
    unlocked_skills: Mapped[dict] = mapped_column(JSON, default=list, nullable=False)
    skill_points: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    last_reminder_sent_at: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=True)

    # Relationships
    profile: Mapped["Profile"] = relationship("Profile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    project_memberships: Mapped[list["ProjectMember"]] = relationship("ProjectMember", back_populates="user", cascade="all, delete-orphan")
    task_assignments: Mapped[list["TaskAssignment"]] = relationship("TaskAssignment", foreign_keys="[TaskAssignment.user_id]", back_populates="user", cascade="all, delete-orphan")
    assigned_by_tasks: Mapped[list["TaskAssignment"]] = relationship("TaskAssignment", foreign_keys="[TaskAssignment.assigned_by_id]", back_populates="assigner")
    task_submissions: Mapped[list["TaskSubmission"]] = relationship("TaskSubmission", back_populates="user", cascade="all, delete-orphan")
    daily_todos: Mapped[list["DailyTodo"]] = relationship("DailyTodo", back_populates="user", cascade="all, delete-orphan")
    daily_reports: Mapped[list["DailyReport"]] = relationship("DailyReport", foreign_keys="[DailyReport.user_id]", back_populates="user", cascade="all, delete-orphan")
    assigned_mentor_reports: Mapped[list["DailyReport"]] = relationship("DailyReport", foreign_keys="[DailyReport.mentor_id]", back_populates="mentor")
    submissions: Mapped[list["Submission"]] = relationship("Submission", foreign_keys="[Submission.user_id]", back_populates="user")
    reviewed_submissions: Mapped[list["Submission"]] = relationship("Submission", foreign_keys="[Submission.reviewed_by_id]", back_populates="reviewer")
    certificates: Mapped[list["Certificate"]] = relationship("Certificate", back_populates="user")
    notifications: Mapped[list["Notification"]] = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    messages_sent: Mapped[list["DirectMessage"]] = relationship("DirectMessage", foreign_keys="[DirectMessage.sender_id]", back_populates="sender", cascade="all, delete-orphan")
    messages_received: Mapped[list["DirectMessage"]] = relationship("DirectMessage", foreign_keys="[DirectMessage.recipient_id]", back_populates="recipient", cascade="all, delete-orphan")
    badges: Mapped[list["UserBadge"]] = relationship("UserBadge", back_populates="user", cascade="all, delete-orphan")
    skills: Mapped[list["UserSkill"]] = relationship("UserSkill", back_populates="user", cascade="all, delete-orphan")
    approval_messages: Mapped[list["ProjectApprovalMessage"]] = relationship("ProjectApprovalMessage", back_populates="user", cascade="all, delete-orphan")

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
    # Mentor availability / office hours — plain text or Markdown
    availability: Mapped[str] = mapped_column(Text, nullable=True)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="profile")
