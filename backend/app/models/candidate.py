from sqlalchemy import String, Integer, DateTime, ForeignKey, Text, func, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base
import datetime
from typing import Optional, List, TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.assessment import Assessment, AssessmentAttempt


class CandidateApplication(Base):
    __tablename__ = "candidate_applications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    college: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    why_join: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    linkedin_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    github_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    resume_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    instagram_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    applied_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    source: Mapped[Optional[str]] = mapped_column(String(100), default="website", nullable=True)

    invitations: Mapped[List["AssessmentInvitation"]] = relationship(
        "AssessmentInvitation", back_populates="application", cascade="all, delete-orphan"
    )


class AssessmentInvitation(Base):
    __tablename__ = "assessment_invitations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    application_id: Mapped[int] = mapped_column(Integer, ForeignKey("candidate_applications.id", ondelete="CASCADE"), nullable=False)
    assessment_id: Mapped[int] = mapped_column(Integer, ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False)
    token: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)  # SHA-256 hash of token
    status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)  # pending | in_progress | completed | expired
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    expires_at: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False)
    started_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)
    attempt_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    application: Mapped["CandidateApplication"] = relationship("CandidateApplication", back_populates="invitations")
    assessment: Mapped["Assessment"] = relationship("Assessment")
    attempt: Mapped[Optional["AssessmentAttempt"]] = relationship(
        "AssessmentAttempt",
        primaryjoin="AssessmentInvitation.attempt_id == AssessmentAttempt.id",
        foreign_keys="[AssessmentInvitation.attempt_id]",
        uselist=False
    )
    reminder_logs: Mapped[List["ReminderLog"]] = relationship(
        "ReminderLog", back_populates="invitation", cascade="all, delete-orphan"
    )


class ReminderLog(Base):
    __tablename__ = "reminder_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    invitation_id: Mapped[int] = mapped_column(Integer, ForeignKey("assessment_invitations.id", ondelete="CASCADE"), nullable=False)
    reminder_number: Mapped[int] = mapped_column(Integer, nullable=False)  # 1, 2, 3
    sent_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    email_provider_message_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    invitation: Mapped["AssessmentInvitation"] = relationship("AssessmentInvitation", back_populates="reminder_logs")
