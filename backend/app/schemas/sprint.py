from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict
import datetime

class TaskAssignmentResponse(BaseModel):
    id: int
    task_id: int
    user_id: int
    assigned_by_id: Optional[int] = None
    assigned_at: datetime.datetime
    status: str

    model_config = ConfigDict(from_attributes=True)

class TaskSubmissionResponse(BaseModel):
    id: int
    task_id: int
    user_id: int
    repo_url: Optional[str] = None
    demo_url: Optional[str] = None
    approach_notes: Optional[str] = None
    submitted_at: datetime.datetime
    mentor_score: Optional[int] = None
    mentor_feedback: Optional[str] = None
    reviewed_at: Optional[datetime.datetime] = None
    ai_score: Optional[int] = None
    ai_feedback_json: Optional[Dict] = None

    model_config = ConfigDict(from_attributes=True)

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: str = "todo" # 'todo' | 'in_progress' | 'review' | 'done'
    github_pr_url: Optional[str] = None
    task_mode: str = "individual" # 'individual' | 'competitive'
    difficulty: Optional[str] = None # 'easy' | 'medium' | 'hard'
    due_date: Optional[datetime.datetime] = None
    ci_status: Optional[str] = None
    test_coverage: Optional[float] = None

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    github_pr_url: Optional[str] = None
    task_mode: Optional[str] = None
    difficulty: Optional[str] = None
    due_date: Optional[datetime.datetime] = None

class TaskResponse(TaskBase):
    id: int
    sprint_id: int
    assignments: List[TaskAssignmentResponse] = []

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
