from pydantic import BaseModel, ConfigDict
from typing import Optional, List
import datetime
from app.schemas.user import UserResponse

class ProjectMemberBase(BaseModel):
    user_id: int
    role: str = "contributor"

class ProjectMemberResponse(ProjectMemberBase):
    user: UserResponse

    model_config = ConfigDict(from_attributes=True)

class ProjectBase(BaseModel):
    title: str
    description: str
    status: str = "planning" # 'planning' | 'active' | 'completed'
    mentor_id: Optional[int] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectResponse(ProjectBase):
    id: int
    created_at: datetime.datetime
    mentor: Optional[UserResponse] = None
    members: List[ProjectMemberResponse] = []

    model_config = ConfigDict(from_attributes=True)
