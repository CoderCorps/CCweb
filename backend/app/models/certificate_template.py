from sqlalchemy import String, Integer, DateTime, ForeignKey, Text, Float, Enum, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base
import datetime
import enum

class EmailTemplateType(str, enum.Enum):
    certificate_issued = "certificate_issued"

class CertificateTemplate(Base):
    __tablename__ = "certificate_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    background_image_url: Mapped[str] = mapped_column(String(500), nullable=False)
    width_px: Mapped[int] = mapped_column(Integer, nullable=False, default=2000)
    height_px: Mapped[int] = mapped_column(Integer, nullable=False, default=1414)
    program_id: Mapped[int] = mapped_column(Integer, ForeignKey("programs.id", ondelete="SET NULL"), nullable=True)
    created_by: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)

    fields: Mapped[list["CertificateTemplateField"]] = relationship("CertificateTemplateField", back_populates="template", cascade="all, delete-orphan")
    creator: Mapped["User"] = relationship("User", foreign_keys=[created_by])
    program: Mapped["Program"] = relationship("Program")

class CertificateTemplateField(Base):
    __tablename__ = "certificate_template_fields"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    template_id: Mapped[int] = mapped_column(Integer, ForeignKey("certificate_templates.id", ondelete="CASCADE"), nullable=False)
    field_key: Mapped[str] = mapped_column(String(100), nullable=False)
    x_percent: Mapped[float] = mapped_column(Float, nullable=False)
    y_percent: Mapped[float] = mapped_column(Float, nullable=False)
    font_family: Mapped[str] = mapped_column(String(100), nullable=True)
    font_size: Mapped[int] = mapped_column(Integer, nullable=True)
    font_weight: Mapped[str] = mapped_column(String(50), nullable=True)
    color: Mapped[str] = mapped_column(String(50), nullable=True)
    text_align: Mapped[str] = mapped_column(String(50), default="left")

    template: Mapped["CertificateTemplate"] = relationship("CertificateTemplate", back_populates="fields")

class EmailTemplate(Base):
    __tablename__ = "email_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(String(50), default=EmailTemplateType.certificate_issued.value, nullable=False)
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    body_html: Mapped[str] = mapped_column(Text, nullable=False)
    created_by: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    creator: Mapped["User"] = relationship("User", foreign_keys=[created_by])

class CertificateEmailLog(Base):
    __tablename__ = "certificate_email_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    certificate_id: Mapped[int] = mapped_column(Integer, ForeignKey("certificates.id", ondelete="CASCADE"), nullable=False)
    recipient_email: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False)
    sent_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    error_message: Mapped[str] = mapped_column(Text, nullable=True)

    certificate: Mapped["Certificate"] = relationship("Certificate")
