from pydantic import BaseModel, ConfigDict
from typing import Optional, List
import datetime

class TodoItem(BaseModel):
    task_id: Optional[int] = None
    description: str

class StartDayPayload(BaseModel):
    project_id: int
    date: datetime.date
    todos: List[TodoItem]

class TodoStatusUpdate(BaseModel):
    status: str # 'planned' | 'in_progress' | 'done' | 'carried_over'

class DailyTodoResponse(BaseModel):
    id: int
    user_id: int
    project_id: int
    task_id: Optional[int] = None
    date: datetime.date
    description: str
    status: str
    source: str
    started_at: Optional[datetime.datetime] = None
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

class DailyReportCreate(BaseModel):
    project_id: int
    date: datetime.date
    summary: str
    blockers: Optional[str] = None
    links: List[str] = []
    hours_spent: Optional[float] = None

class FeedbackPayload(BaseModel):
    feedback: str

class DailyReportResponse(BaseModel):
    id: int
    user_id: int
    user_name: str
    project_id: int
    date: datetime.date
    summary: str
    blockers: Optional[str] = None
    links: List[str] = []
    hours_spent: Optional[float] = None
    mentor_id: Optional[int] = None
    submitted_at: datetime.datetime
    mentor_feedback: Optional[str] = None
    mentor_read_at: Optional[datetime.datetime] = None
    todos: List[dict] = []

    model_config = ConfigDict(from_attributes=True)
