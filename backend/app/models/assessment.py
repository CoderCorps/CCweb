from sqlalchemy import String, Integer, DateTime, ForeignKey, Text, JSON, func, Boolean, Float, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship, validates
from app.db.session import Base
import datetime
from typing import Optional, List

class Assessment(Base):
    __tablename__ = "assessments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    topic: Mapped[str] = mapped_column(String(100), default="python", nullable=False)
    basic_question_count: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    intermediate_question_count: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    basic_time_seconds: Mapped[int] = mapped_column(Integer, default=45, nullable=False)
    intermediate_time_seconds: Mapped[int] = mapped_column(Integer, default=90, nullable=False)
    created_by: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    creator: Mapped["User"] = relationship("User")
    attempts: Mapped[List["AssessmentAttempt"]] = relationship("AssessmentAttempt", back_populates="assessment", cascade="all, delete-orphan")


class AssessmentAttempt(Base):
    __tablename__ = "assessment_attempts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    assessment_id: Mapped[int] = mapped_column(Integer, ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False)
    candidate_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    invitation_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("assessment_invitations.id", ondelete="CASCADE"), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="in_progress", nullable=False)  # in_progress | completed | abandoned
    started_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    completed_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)
    total_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    tab_switch_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    assessment: Mapped["Assessment"] = relationship("Assessment", back_populates="attempts")
    candidate: Mapped[Optional["User"]] = relationship("User")
    invitation: Mapped[Optional["AssessmentInvitation"]] = relationship(
        "AssessmentInvitation", foreign_keys=[invitation_id]
    )
    questions: Mapped[List["AssessmentQuestion"]] = relationship("AssessmentQuestion", back_populates="attempt", cascade="all, delete-orphan", order_by="AssessmentQuestion.order_index")

    def check_owner_constraint(self):
        """Ensure exactly one of candidate_id or invitation_id is set."""
        has_cand = self.candidate_id is not None
        has_inv = self.invitation_id is not None
        if (has_cand and has_inv) or (not has_cand and not has_inv):
            raise ValueError("Exactly one of candidate_id or invitation_id must be set per attempt.")


class AssessmentQuestion(Base):
    __tablename__ = "assessment_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    assessment_attempt_id: Mapped[int] = mapped_column(Integer, ForeignKey("assessment_attempts.id", ondelete="CASCADE"), nullable=False)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[list] = mapped_column(JSON, nullable=False)  # List of 4 strings
    correct_option_index: Mapped[int] = mapped_column(Integer, nullable=False)  # 0-3
    difficulty: Mapped[str] = mapped_column(String(50), nullable=False)  # basic | intermediate
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    time_limit_seconds: Mapped[int] = mapped_column(Integer, nullable=False)
    served_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime, nullable=True)

    attempt: Mapped["AssessmentAttempt"] = relationship("AssessmentAttempt", back_populates="questions")
    answer: Mapped[Optional["AssessmentAnswer"]] = relationship("AssessmentAnswer", back_populates="question", uselist=False, cascade="all, delete-orphan")


class AssessmentAnswer(Base):
    __tablename__ = "assessment_answers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    question_id: Mapped[int] = mapped_column(Integer, ForeignKey("assessment_questions.id", ondelete="CASCADE"), nullable=False, unique=True)
    selected_option_index: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    time_taken_seconds: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    submitted_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    was_timeout: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    question: Mapped["AssessmentQuestion"] = relationship("AssessmentQuestion", back_populates="answer")
