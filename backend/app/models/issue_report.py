from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.db.session import Base

def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)

class IssueReport(Base):
    __tablename__ = "issue_reports"

    id = Column(Integer, primary_key=True, index=True)
    reporter_name = Column(String(255), nullable=False)
    reporter_email = Column(String(255), nullable=False, index=True)
    reporter_role = Column(String(50), nullable=False, default="other") # 'student' | 'mentor' | 'candidate' | 'other'
    reporter_role_detail = Column(String(255), nullable=True)
    reported_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    category = Column(String(100), nullable=False, index=True) # 'website_bug' | 'assessment_email_issue' | 'account_login' | 'feature_request' | 'other'
    page_url = Column(String(500), nullable=True)
    description = Column(Text, nullable=False)

    # Assessment-specific triage fields
    assessment_email_used = Column(String(255), nullable=True)
    assessment_link_received = Column(Boolean, nullable=True)
    assessment_link_worked = Column(Boolean, nullable=True)

    screenshot_url = Column(String(500), nullable=True)
    status = Column(String(50), nullable=False, default="open", index=True) # 'open' | 'in_progress' | 'resolved'
    admin_notes = Column(Text, nullable=True)

    submitted_at = Column(DateTime, default=utcnow, nullable=False)
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    reported_by_user = relationship("User", foreign_keys=[reported_by_user_id], backref="submitted_issue_reports")
    resolver_user = relationship("User", foreign_keys=[resolved_by], backref="resolved_issue_reports")
