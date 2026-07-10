from sqlalchemy import String, Integer, DateTime, ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base
import datetime

class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="planning", nullable=False) # 'planning' | 'active' | 'completed'
    mentor_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    start_date: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=True)
    end_date: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)

    # Relationships
    mentor: Mapped["User"] = relationship("User", foreign_keys=[mentor_id])
    members: Mapped[list["ProjectMember"]] = relationship("ProjectMember", back_populates="project", cascade="all, delete-orphan")
    sprints: Mapped[list["Sprint"]] = relationship("Sprint", back_populates="project", cascade="all, delete-orphan")
    submissions: Mapped[list["Submission"]] = relationship("Submission", back_populates="project", cascade="all, delete-orphan")
    certificates: Mapped[list["Certificate"]] = relationship("Certificate", back_populates="project")

class ProjectMember(Base):
    __tablename__ = "project_members"

    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role: Mapped[str] = mapped_column(String(50), default="contributor", nullable=False) # 'contributor' | 'lead'

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="members")
    user: Mapped["User"] = relationship("User", back_populates="project_memberships")
