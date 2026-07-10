from sqlalchemy import String, Integer, DateTime, ForeignKey, Text
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
    assigned_to_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="todo", nullable=False) # 'todo' | 'in_progress' | 'review' | 'done'
    github_pr_url: Mapped[str] = mapped_column(String(255), nullable=True)

    # Relationships
    sprint: Mapped["Sprint"] = relationship("Sprint", back_populates="tasks")
    assignee: Mapped["User"] = relationship("User", back_populates="assigned_tasks")
