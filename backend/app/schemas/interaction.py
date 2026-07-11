from pydantic import BaseModel, ConfigDict
from typing import Optional, List
import datetime
from app.schemas.user import UserResponse

class TaskCommentBase(BaseModel):
    content: str
    parent_comment_id: Optional[int] = None

class TaskCommentCreate(TaskCommentBase):
    pass

class TaskCommentResponse(TaskCommentBase):
    id: int
    task_id: int
    user_id: int
    created_at: datetime.datetime
    edited_at: Optional[datetime.datetime] = None
    user: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)

class StuckFlagBase(BaseModel):
    note: Optional[str] = None

class StuckFlagCreate(StuckFlagBase):
    pass

class StuckFlagResponse(StuckFlagBase):
    id: int
    task_id: int
    user_id: int
    created_at: datetime.datetime
    resolved_at: Optional[datetime.datetime] = None
    resolved_by: Optional[int] = None
    user: Optional[UserResponse] = None
    resolver: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)

class PeerReviewCreate(BaseModel):
    reviewer_id: int

class PeerReviewUpdate(BaseModel):
    review_note: Optional[str] = None

class PeerReviewResponse(BaseModel):
    id: int
    task_id: int
    requester_id: int
    reviewer_id: int
    status: str
    review_note: Optional[str] = None
    created_at: datetime.datetime
    reviewed_at: Optional[datetime.datetime] = None
    
    requester: Optional[UserResponse] = None
    reviewer: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)

class ResourceBase(BaseModel):
    title: str
    url: str
    description: Optional[str] = None

class ResourceCreate(ResourceBase):
    pass

class ResourceResponse(ResourceBase):
    id: int
    project_id: int
    added_by: Optional[int] = None
    created_at: datetime.datetime
    user: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)
