from pydantic import BaseModel, ConfigDict
from typing import List, Optional
import datetime

class QuizOptionBase(BaseModel):
    text: str
    is_correct: bool = False

class QuizOptionResponse(QuizOptionBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class QuizQuestionBase(BaseModel):
    text: str
    question_type: str = "multiple_choice"
    points: int = 10

class QuizQuestionResponse(QuizQuestionBase):
    id: int
    options: List[QuizOptionResponse]
    model_config = ConfigDict(from_attributes=True)

class QuizBase(BaseModel):
    title: str
    description: Optional[str] = None
    min_score_to_pass: int = 70
    is_active: bool = True

class QuizResponse(QuizBase):
    id: int
    created_at: datetime.datetime
    questions: List[QuizQuestionResponse]
    model_config = ConfigDict(from_attributes=True)

class QuizAttemptCreate(BaseModel):
    quiz_id: int
    answers: List[dict] # List of {question_id: int, selected_option_id: int}

class QuizAttemptResponse(BaseModel):
    id: int
    quiz_id: int
    score: int
    passed: bool
    attempted_at: datetime.datetime
    model_config = ConfigDict(from_attributes=True)
