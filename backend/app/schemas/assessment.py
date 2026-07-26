from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class AssessmentCreate(BaseModel):
    title: str
    topic: str = "python"
    basic_question_count: int = 5
    intermediate_question_count: int = 5
    basic_time_seconds: int = 45
    intermediate_time_seconds: int = 90
    is_active: bool = True

class AssessmentResponse(BaseModel):
    id: int
    title: str
    topic: str
    basic_question_count: int
    intermediate_question_count: int
    basic_time_seconds: int
    intermediate_time_seconds: int
    created_by: int
    created_at: datetime
    is_active: bool
    attempt_status: Optional[str] = None  # None | in_progress | completed | abandoned
    attempt_id: Optional[int] = None

    class Config:
        from_attributes = True

class CandidateQuestionResponse(BaseModel):
    id: int
    question_text: str
    options: List[str]
    difficulty: str
    order_index: int
    time_limit_seconds: int
    served_at: Optional[datetime] = None
    total_questions: int

    class Config:
        from_attributes = True

class AnswerSubmit(BaseModel):
    question_id: int
    selected_option_index: Optional[int] = None

class AttemptResultResponse(BaseModel):
    attempt_id: int
    total_score: float
    total_questions: int
    correct_count: int
    basic_correct_count: int
    basic_total: int
    intermediate_correct_count: int
    intermediate_total: int
    total_time_seconds: float
    status: str
    completed_at: Optional[datetime] = None

class AnswerSubmitResponse(BaseModel):
    question_id: int
    is_completed: bool
    next_question: Optional[CandidateQuestionResponse] = None
    result: Optional[AttemptResultResponse] = None

class StartAttemptResponse(BaseModel):
    attempt_id: int
    first_question: CandidateQuestionResponse

class MentorQuestionReview(BaseModel):
    question_id: int
    order_index: int
    question_text: str
    options: List[str]
    correct_option_index: int
    selected_option_index: Optional[int]
    is_correct: bool
    difficulty: str
    explanation: str
    time_limit_seconds: int
    time_taken_seconds: Optional[float]
    served_at: Optional[datetime]
    submitted_at: Optional[datetime]
    was_timeout: bool

class CandidateUserSchema(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str] = None
    college: Optional[str] = None
    why_join: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    resume_url: Optional[str] = None
    instagram_url: Optional[str] = None
    applied_at: Optional[datetime] = None
    is_public_candidate: bool = False
    invitation_token: Optional[str] = None

    class Config:
        from_attributes = True

class MentorAttemptSummary(BaseModel):
    id: int
    assessment_id: int
    candidate: CandidateUserSchema
    status: str
    started_at: datetime
    completed_at: Optional[datetime]
    total_score: Optional[float]
    tab_switch_count: int

    class Config:
        from_attributes = True

class MentorAttemptReview(BaseModel):
    attempt_id: int
    assessment_title: str
    candidate: CandidateUserSchema
    status: str
    started_at: datetime
    completed_at: Optional[datetime]
    total_score: Optional[float]
    tab_switch_count: int
    questions: List[MentorQuestionReview]
