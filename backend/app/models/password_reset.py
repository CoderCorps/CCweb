from sqlalchemy import String, Integer, DateTime, ForeignKey, Text, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base
import datetime

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True) # SHA-256 hex digest
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    expires_at: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False) # created_at + 30 mins
    used_at: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=True)
    requested_ip: Mapped[str] = mapped_column(String(45), nullable=True)

    # Relationship
    user: Mapped["User"] = relationship("User")

class SecurityAuditLog(Base):
    __tablename__ = "security_audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True) # 'password_reset_requested' | 'password_reset_completed' | 'password_reset_token_invalid_attempt'
    ip_address: Mapped[str] = mapped_column(String(45), nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    metadata_json: Mapped[dict] = mapped_column(JSON, nullable=True)

    # Relationship
    user: Mapped["User"] = relationship("User")
