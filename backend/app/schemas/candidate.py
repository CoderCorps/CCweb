from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime

class PublicApplyCreate(BaseModel):
    name: str = Field(..., min_length=1)
    email: EmailStr
    phone: Optional[str] = None
    college: Optional[str] = None
    why_join: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    resume_url: Optional[str] = None
    instagram_url: Optional[str] = None

class PublicApplyResponse(BaseModel):
    message: str = "Check your email for your assessment link."
    token: Optional[str] = None  # Raw token returned to Next.js server route for branded email dispatch

class PublicAssessmentStatus(BaseModel):
    title: str
    topic: str
    question_count: int
    basic_time_seconds: int
    intermediate_time_seconds: int
    status: str  # pending | in_progress | completed | expired
    expires_at: datetime
    is_valid: bool = True

class PublicCandidateQuestion(BaseModel):
    id: int
    question_text: str
    options: List[str]
    difficulty: str
    order_index: int
    time_limit_seconds: int
    served_at: Optional[datetime] = None
    total_questions: int

class PublicStartResponse(BaseModel):
    attempt_id: int
    first_question: PublicCandidateQuestion

class PublicQuestionResult(BaseModel):
    question_id: int
    order_index: int
    question_text: str
    options: List[str]
    selected_option_index: Optional[int]
    correct_option_index: int
    is_correct: bool
    difficulty: str
    explanation: str
    time_limit_seconds: int
    time_taken_seconds: Optional[float]
    was_timeout: bool

class PublicCandidateResult(BaseModel):
    attempt_id: int
    candidate_name: str
    assessment_title: str
    total_score: float
    total_questions: int
    correct_count: int
    basic_correct_count: int
    basic_total: int
    intermediate_correct_count: int
    intermediate_total: int
    total_time_seconds: float
    completed_at: Optional[datetime]
    questions: List[PublicQuestionResult]

class PublicAnswerSubmitResponse(BaseModel):
    question_id: int
    is_completed: bool
    next_question: Optional[PublicCandidateQuestion] = None
    result: Optional[PublicCandidateResult] = None

class ReminderLogSchema(BaseModel):
    id: int
    reminder_number: int
    sent_at: datetime
    email_provider_message_id: Optional[str]

    class Config:
        from_attributes = True

class AdminCandidateSummary(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str]
    college: Optional[str]
    applied_at: datetime
    invitation_status: str
    expires_at: datetime
    total_score: Optional[float]
    reminders_count: int

class AdminCandidateDetail(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str]
    college: Optional[str]
    why_join: Optional[str]
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    resume_url: Optional[str] = None
    instagram_url: Optional[str] = None
    applied_at: datetime
    source: Optional[str]
    invitation: Optional[dict]
    reminder_logs: List[ReminderLogSchema]
    result: Optional[PublicCandidateResult]
