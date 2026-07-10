from pydantic import BaseModel, ConfigDict
from typing import Optional, List
import datetime
from app.schemas.user import UserResponse

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: str = "todo" # 'todo' | 'in_progress' | 'review' | 'done'
    assigned_to_id: Optional[int] = None
    github_pr_url: Optional[str] = None

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    assigned_to_id: Optional[int] = None
    github_pr_url: Optional[str] = None

class TaskResponse(TaskBase):
    id: int
    sprint_id: int
    assignee: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)

class SprintBase(BaseModel):
    sprint_number: int
    start_date: datetime.datetime
    end_date: datetime.datetime
    goal: Optional[str] = None

class SprintCreate(SprintBase):
    pass

class SprintResponse(SprintBase):
    id: int
    project_id: int
    tasks: List[TaskResponse] = []

    model_config = ConfigDict(from_attributes=True)
