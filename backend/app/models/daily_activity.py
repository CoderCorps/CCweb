from sqlalchemy import String, Integer, DateTime, ForeignKey, Date, Numeric, JSON, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship, foreign
from app.db.session import Base
import datetime

class DailyTodo(Base):
    __tablename__ = "daily_todos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    task_id: Mapped[int] = mapped_column(Integer, ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True)
    date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="planned", nullable=False) # 'planned' | 'in_progress' | 'done' | 'carried_over'
    source: Mapped[str] = mapped_column(String(50), default="self", nullable=False) # 'assigned' | 'self'
    started_at: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="daily_todos")
    project: Mapped["Project"] = relationship("Project")
    task: Mapped["Task"] = relationship("Task")

class DailyReport(Base):
    __tablename__ = "daily_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    summary: Mapped[str] = mapped_column(String(1000), nullable=False) # what got done
    blockers: Mapped[str] = mapped_column(String(500), nullable=True)
    links: Mapped[list] = mapped_column(JSON, default=list, nullable=False) # array of URLs
    hours_spent: Mapped[float] = mapped_column(Numeric(5, 2), nullable=True)
    mentor_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    submitted_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    mentor_feedback: Mapped[str] = mapped_column(String(1000), nullable=True)
    mentor_read_at: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=True)

    # Unique constraint: one report per person per project per day
    __table_args__ = (
        UniqueConstraint("user_id", "project_id", "date", name="uq_daily_report_user_project_date"),
    )

    # Relationships
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id], back_populates="daily_reports")
    project: Mapped["Project"] = relationship("Project")
    mentor: Mapped["User"] = relationship("User", foreign_keys=[mentor_id], back_populates="assigned_mentor_reports")
    reactions: Mapped[list["MessageReaction"]] = relationship(
        "MessageReaction",
        primaryjoin="and_(MessageReaction.target_type=='daily_report', foreign(MessageReaction.target_id)==DailyReport.id)",
        cascade="all, delete-orphan",
        viewonly=True,
    )
