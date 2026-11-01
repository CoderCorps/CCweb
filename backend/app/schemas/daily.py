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


class CategoryMastery(BaseModel):
    category: str
    level: int
    progress: int
    xp: int


class UnlockedNode(BaseModel):
    id: str
    title: str
    category: str
    unlocked_at: str
    xp_awarded: int


class RecommendedNode(BaseModel):
    id: str
    title: str
    category: str
    required_xp: int
    description: str


class AIMentorFeedback(BaseModel):
    mentor_name: str
    mentor_title: str
    weekly_headline: str
    strengths: List[str]
    growth_areas: List[str]
    suggested_focus: str


class WeeklySkillDigestResponse(BaseModel):
    period_start: str
    period_end: str
    weekly_xp_gained: int
    total_xp: int
    weekly_tasks_completed: int
    weekly_prs_merged: int
    active_streak_days: int
    velocity_score: int
    category_mastery: List[CategoryMastery]
    unlocked_nodes: List[UnlockedNode]
    next_recommended_nodes: List[RecommendedNode]
    ai_mentor_feedback: AIMentorFeedback
    committed_target_node_id: Optional[str] = None

