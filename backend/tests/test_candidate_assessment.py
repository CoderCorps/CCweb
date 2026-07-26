import pytest
import hashlib
import secrets
import datetime
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.assessment import Assessment, AssessmentAttempt, AssessmentQuestion, AssessmentAnswer
from app.models.candidate import CandidateApplication, AssessmentInvitation, ReminderLog
from app.api.v1.public_apply import _hash_token
from app.cron.assessment_reminders import run_assessment_sweeps
from app.services.email_service import send_email

def test_assessment_attempt_owner_constraint():
    """Assertion test: Exactly one of candidate_id / invitation_id must be set on any AssessmentAttempt."""
    attempt_both = AssessmentAttempt(
        assessment_id=1,
        candidate_id=1,
        invitation_id=1,
        status="in_progress"
    )
    with pytest.raises(ValueError, match="Exactly one of candidate_id or invitation_id must be set"):
        attempt_both.check_owner_constraint()

    attempt_neither = AssessmentAttempt(
        assessment_id=1,
        candidate_id=None,
        invitation_id=None,
        status="in_progress"
    )
    with pytest.raises(ValueError, match="Exactly one of candidate_id or invitation_id must be set"):
        attempt_neither.check_owner_constraint()

    # Valid candidate attempt
    attempt_candidate = AssessmentAttempt(
        assessment_id=1,
        candidate_id=1,
        invitation_id=None,
        status="in_progress"
    )
    attempt_candidate.check_owner_constraint()  # Should not raise

    # Valid public candidate invitation attempt
    attempt_invitation = AssessmentAttempt(
        assessment_id=1,
        candidate_id=None,
        invitation_id=1,
        status="in_progress"
    )
    attempt_invitation.check_owner_constraint()  # Should not raise


def test_token_hashing_security():
    """Assertion test: Raw tokens are stored hashed (SHA-256) in the database."""
    raw_token = secrets.token_urlsafe(32)
    hashed_token = _hash_token(raw_token)

    assert raw_token != hashed_token
    assert len(hashed_token) == 64  # SHA-256 hex string length
    assert hashlib.sha256(raw_token.encode("utf-8")).hexdigest() == hashed_token


def test_public_candidate_answer_revelation_assertions():
    """
    Assertion test:
    - Correct options/explanations MUST NOT be present in initial question payloads (/start, /current-question).
    - Correct options/explanations MUST BE present in completion responses (/answer final, /result).
    """
    raw_q_data = {
        "question_text": "What is the output of print(type([]))?",
        "options": ["<class 'list'>", "<class 'array'>", "<class 'tuple'>", "<class 'set'>"],
        "correct_option_index": 0,
        "explanation": "Square brackets define a list literal.",
        "difficulty": "basic",
        "order_index": 1,
        "time_limit_seconds": 45
    }

    # Initial candidate question payload (NO correct options / explanations)
    from app.schemas.candidate import PublicCandidateQuestion, PublicQuestionResult

    initial_payload = PublicCandidateQuestion(
        id=101,
        question_text=raw_q_data["question_text"],
        options=raw_q_data["options"],
        difficulty=raw_q_data["difficulty"],
        order_index=raw_q_data["order_index"],
        time_limit_seconds=raw_q_data["time_limit_seconds"],
        served_at=None,
        total_questions=10
    )

    initial_dict = initial_payload.model_dump()
    assert "correct_option_index" not in initial_dict
    assert "explanation" not in initial_dict

    # Final completion result payload (MUST REVEAL correct_option_index & explanation)
    result_payload = PublicQuestionResult(
        question_id=101,
        order_index=1,
        question_text=raw_q_data["question_text"],
        options=raw_q_data["options"],
        selected_option_index=0,
        correct_option_index=raw_q_data["correct_option_index"],
        is_correct=True,
        difficulty=raw_q_data["difficulty"],
        explanation=raw_q_data["explanation"],
        time_limit_seconds=45,
        time_taken_seconds=12.5,
        was_timeout=False
    )

    result_dict = result_payload.model_dump()
    assert "correct_option_index" in result_dict
    assert result_dict["correct_option_index"] == 0
    assert "explanation" in result_dict
    assert result_dict["explanation"] == "Square brackets define a list literal."
