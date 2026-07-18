from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.deps import get_db, get_current_user
from app.models.user import User
from app.models.quiz import Quiz, QuizQuestion, QuizOption, UserQuizAttempt
from app.schemas.quiz import QuizResponse, QuizAttemptCreate, QuizAttemptResponse

router = APIRouter()

@router.get("/", response_model=List[QuizResponse])
def get_active_quizzes(db: Session = Depends(get_db)):
    """
    Returns a list of active quizzes for internships/new users.
    """
    return db.query(Quiz).filter(Quiz.is_active == True).all()

@router.post("/submit", response_model=QuizAttemptResponse)
def submit_quiz_attempt(
    payload: QuizAttemptCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Evaluates a quiz attempt and returns the score/status.
    """
    quiz = db.query(Quiz).filter(Quiz.id == payload.quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
        
    total_points = 0
    earned_points = 0
    
    # Simple evaluation logic
    for q in quiz.questions:
        total_points += q.points
        # Find the user's answer for this question
        user_answer = next((a for a in payload.answers if a.get("question_id") == q.id), None)
        if user_answer:
            selected_option_id = user_answer.get("selected_option_id")
            # Check if correct
            correct_option = next((opt for opt in q.options if opt.is_correct), None)
            if correct_option and correct_option.id == selected_option_id:
                earned_points += q.points
                
    score_percentage = int((earned_points / total_points) * 100) if total_points > 0 else 0
    passed = score_percentage >= quiz.min_score_to_pass
    
    attempt = UserQuizAttempt(
        user_id=current_user.id,
        quiz_id=quiz.id,
        score=score_percentage,
        passed=passed
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    
    return attempt
