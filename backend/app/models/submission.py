from sqlalchemy import String, Integer, DateTime, ForeignKey, Text, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base
import datetime

class Submission(Base):
    __tablename__ = "submissions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    demo_url: Mapped[str] = mapped_column(String(255), nullable=True)
    repo_url: Mapped[str] = mapped_column(String(255), nullable=True)
    reviewed_by_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    feedback: Mapped[str] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="submitted", nullable=False) # 'submitted' | 'approved' | 'needs_revision'
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="submissions")
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id], back_populates="submissions")
    reviewer: Mapped["User"] = relationship("User", foreign_keys=[reviewed_by_id], back_populates="reviewed_submissions")

class Certificate(Base):
    __tablename__ = "certificates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    issued_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    criteria_met: Mapped[dict] = mapped_column(JSON, nullable=False) # JSON audit trail details

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="certificates")
    project: Mapped["Project"] = relationship("Project", back_populates="certificates")
