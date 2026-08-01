from pydantic import BaseModel, EmailStr, ConfigDict, Field
from typing import Optional, List
from datetime import datetime

class IssueReportCreate(BaseModel):
    reporter_name: str = Field(..., min_length=1, max_length=255)
    reporter_email: EmailStr
    reporter_role: str = "other" # 'student' | 'mentor' | 'candidate' | 'other'
    reporter_role_detail: Optional[str] = None

    category: str # 'website_bug' | 'assessment_email_issue' | 'account_login' | 'feature_request' | 'other'
    page_url: Optional[str] = None
    description: str = Field(..., min_length=5)

    # Assessment-specific triage fields
    assessment_email_used: Optional[str] = None
    assessment_link_received: Optional[bool] = None
    assessment_link_worked: Optional[bool] = None

    screenshot_url: Optional[str] = None

    # Honeypot field (hidden input bots fill, real users do not)
    honeypot: Optional[str] = None

class IssueReportUpdate(BaseModel):
    status: Optional[str] = None # 'open' | 'in_progress' | 'resolved'
    admin_notes: Optional[str] = None

class IssueReportResponse(BaseModel):
    id: int
    reporter_name: str
    reporter_email: str
    reporter_role: str
    reporter_role_detail: Optional[str] = None
    reported_by_user_id: Optional[int] = None

    category: str
    page_url: Optional[str] = None
    description: str

    assessment_email_used: Optional[str] = None
    assessment_link_received: Optional[bool] = None
    assessment_link_worked: Optional[bool] = None

    screenshot_url: Optional[str] = None
    status: str
    admin_notes: Optional[str] = None

    submitted_at: datetime
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)

class IssueReportListResponse(BaseModel):
    items: List[IssueReportResponse]
    total: int
    page: int
    limit: int
    assessment_issues_last_24h: int = 0
