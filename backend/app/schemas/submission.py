from pydantic import BaseModel, ConfigDict, AnyHttpUrl
from typing import Optional
import datetime
from app.schemas.user import UserResponse

class SubmissionBase(BaseModel):
    demo_url: Optional[AnyHttpUrl] = None
    repo_url: Optional[AnyHttpUrl] = None

class SubmissionCreate(SubmissionBase):
    project_id: int

class SubmissionReview(BaseModel):
    feedback: str
    status: str # 'approved' | 'needs_revision'

class SubmissionResponse(SubmissionBase):
    id: int
    project_id: int
    user_id: int
    reviewed_by_id: Optional[int] = None
    feedback: Optional[str] = None
    status: str
    created_at: datetime.datetime
    user: UserResponse
    reviewer: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)

class CertificateResponse(BaseModel):
    id: int
    user_id: int
    project_id: Optional[int] = None
    issued_at: datetime.datetime
    criteria_met: dict

    model_config = ConfigDict(from_attributes=True)
