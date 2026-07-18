from sqlalchemy import String, Integer, DateTime, ForeignKey, Text, func, JSON, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base
import datetime

class Sprint(Base):
    __tablename__ = "sprints"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    sprint_number: Mapped[int] = mapped_column(Integer, nullable=False)
    start_date: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False)
    end_date: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False)
    goal: Mapped[str] = mapped_column(Text, nullable=True)

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="sprints")
    tasks: Mapped[list["Task"]] = relationship("Task", back_populates="sprint", cascade="all, delete-orphan")

class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    sprint_id: Mapped[int] = mapped_column(Integer, ForeignKey("sprints.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="todo", nullable=False) # 'todo' | 'in_progress' | 'review' | 'done'
    github_pr_url: Mapped[str] = mapped_column(String(255), nullable=True)
    
    # Extended fields
    task_mode: Mapped[str] = mapped_column(String(50), default="individual", nullable=False) # 'individual' | 'competitive'
    difficulty: Mapped[str] = mapped_column(String(50), nullable=True) # 'easy' | 'medium' | 'hard'
    due_date: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=True)
    ci_status: Mapped[str] = mapped_column(String(50), nullable=True) # 'pending', 'success', 'failed'
    test_coverage: Mapped[float] = mapped_column(Float, nullable=True)

    # Relationships
    sprint: Mapped["Sprint"] = relationship("Sprint", back_populates="tasks")
    assignments: Mapped[list["TaskAssignment"]] = relationship("TaskAssignment", back_populates="task", cascade="all, delete-orphan")
    task_submissions: Mapped[list["TaskSubmission"]] = relationship("TaskSubmission", back_populates="task", cascade="all, delete-orphan")
    comments: Mapped[list["TaskComment"]] = relationship("TaskComment", back_populates="task", cascade="all, delete-orphan")
    stuck_flags: Mapped[list["StuckFlag"]] = relationship("StuckFlag", back_populates="task", cascade="all, delete-orphan")
    peer_review_requests: Mapped[list["PeerReviewRequest"]] = relationship("PeerReviewRequest", back_populates="task", cascade="all, delete-orphan")

class TaskAssignment(Base):
    __tablename__ = "task_assignments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    task_id: Mapped[int] = mapped_column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    assigned_by_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    assigned_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="assigned", nullable=False) # 'assigned' | 'in_progress' | 'submitted' | 'reviewed'

    # Relationships
    task: Mapped["Task"] = relationship("Task", back_populates="assignments")
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id], back_populates="task_assignments")
    assigner: Mapped["User"] = relationship("User", foreign_keys=[assigned_by_id], back_populates="assigned_by_tasks")

class TaskSubmission(Base):
    __tablename__ = "task_submissions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    task_id: Mapped[int] = mapped_column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    repo_url: Mapped[str] = mapped_column(String(255), nullable=True)
    demo_url: Mapped[str] = mapped_column(String(255), nullable=True)
    approach_notes: Mapped[str] = mapped_column(Text, nullable=True)
    submitted_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    mentor_score: Mapped[int] = mapped_column(Integer, nullable=True) # 0-100, nullable until reviewed
    mentor_feedback: Mapped[str] = mapped_column(Text, nullable=True)
    reviewed_at: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=True)
    submission_source: Mapped[str] = mapped_column(String(50), default="platform", nullable=False) # 'platform' | 'google_form'
    
    # AI Pre-Review fields
    ai_score: Mapped[int] = mapped_column(Integer, nullable=True)
    ai_feedback_json: Mapped[dict] = mapped_column(JSON, nullable=True)

    # Relationships
    task: Mapped["Task"] = relationship("Task", back_populates="task_submissions")
    user: Mapped["User"] = relationship("User", back_populates="task_submissions")

class TaskComment(Base):
    __tablename__ = "task_comments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    task_id: Mapped[int] = mapped_column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    parent_comment_id: Mapped[int] = mapped_column(Integer, ForeignKey("task_comments.id", ondelete="CASCADE"), nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    edited_at: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=True)

    # Relationships
    task: Mapped["Task"] = relationship("Task", back_populates="comments")
    user: Mapped["User"] = relationship("User")
    parent: Mapped["TaskComment"] = relationship("TaskComment", remote_side=[id])

class StuckFlag(Base):
    __tablename__ = "stuck_flags"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    task_id: Mapped[int] = mapped_column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    note: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    resolved_at: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=True)
    resolved_by: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    task: Mapped["Task"] = relationship("Task", back_populates="stuck_flags")
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])
    resolver: Mapped["User"] = relationship("User", foreign_keys=[resolved_by])

class PeerReviewRequest(Base):
    __tablename__ = "peer_review_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    task_id: Mapped[int] = mapped_column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    requester_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    reviewer_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False) # 'pending' | 'reviewed'
    review_note: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    reviewed_at: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=True)

    # Relationships
    task: Mapped["Task"] = relationship("Task", back_populates="peer_review_requests")
    requester: Mapped["User"] = relationship("User", foreign_keys=[requester_id])
    reviewer: Mapped["User"] = relationship("User", foreign_keys=[reviewer_id])
