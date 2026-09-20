from sqlalchemy import String, Integer, DateTime, ForeignKey, Text, JSON, Boolean, func
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

    # NEW FIELDS for Advanced Certificate Management
    program_id: Mapped[int] = mapped_column(Integer, ForeignKey("programs.id", ondelete="SET NULL"), nullable=True)
    certificate_type: Mapped[str] = mapped_column(String(50), nullable=True) # "project" | "internship"
    certificate_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=True)
    verification_code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=True)
    public_url: Mapped[str] = mapped_column(String(255), nullable=True)
    title: Mapped[str] = mapped_column(String(255), nullable=True)
    duration_start: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=True)
    duration_end: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=True)
    signature_hash: Mapped[str] = mapped_column(String(255), nullable=True)
    pdf_url: Mapped[str] = mapped_column(String(255), nullable=True)
    template_id: Mapped[int] = mapped_column(Integer, ForeignKey("certificate_templates.id", ondelete="SET NULL"), nullable=True)
    issued_by: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id], back_populates="certificates")
    project: Mapped["Project"] = relationship("Project", back_populates="certificates")
    template: Mapped["CertificateTemplate"] = relationship("CertificateTemplate")
    issuer: Mapped["User"] = relationship("User", foreign_keys=[issued_by])
