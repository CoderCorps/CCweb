import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session, selectinload
import asyncio
from typing import Optional, List

from app.deps import get_db
from app.models.assessment import Assessment, AssessmentAttempt, AssessmentQuestion, AssessmentAnswer
from app.models.candidate import CandidateApplication, AssessmentInvitation, ReminderLog
from app.schemas.candidate import (
    PublicApplyCreate,
    PublicApplyResponse,
    PublicAssessmentStatus,
    PublicStartResponse,
    PublicCandidateQuestion,
    PublicAnswerSubmitResponse,
    PublicCandidateResult,
    PublicQuestionResult
)
from app.schemas.assessment import AnswerSubmit
from app.services.question_generator import generate_full_assessment_questions
from app.services.email_service import send_invitation_email

router = APIRouter()

def _hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()

def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)

# Store raw tokens in memory for resending duplicate emails if candidate clicks Apply twice
RAW_TOKEN_CACHE = {}

# --------------------------------------------------------------------------
# 1. PUBLIC APPLY ENDPOINT (No login required)
# --------------------------------------------------------------------------
@router.post("/apply", response_model=PublicApplyResponse)
async def public_apply(
    apply_in: PublicApplyCreate,
    db: Session = Depends(get_db)
):
    def _apply():
        now = _utcnow()
        clean_email = apply_in.email.strip().lower()

        # Check existing active non-expired non-completed invitation
        existing_app = db.query(CandidateApplication).filter(CandidateApplication.email == clean_email).first()
        if existing_app:
            active_inv = db.query(AssessmentInvitation).filter(
                AssessmentInvitation.application_id == existing_app.id,
                AssessmentInvitation.status.in_(["pending", "in_progress"]),
                AssessmentInvitation.expires_at > now
            ).first()

            if active_inv:
                # Resend existing token link
                cached_raw = RAW_TOKEN_CACHE.get(active_inv.id)
                if not cached_raw:
                    cached_raw = secrets.token_urlsafe(32)
                    active_inv.token = _hash_token(cached_raw)
                    RAW_TOKEN_CACHE[active_inv.id] = cached_raw
                    db.commit()

                expires_str = active_inv.expires_at.strftime("%Y-%m-%d %H:%M UTC")
                send_invitation_email(clean_email, existing_app.name, cached_raw, expires_str)
                return PublicApplyResponse(message="Check your email for your assessment link.", token=cached_raw)

        # Create new Candidate Application
        app_record = CandidateApplication(
            name=apply_in.name.strip(),
            email=clean_email,
            phone=apply_in.phone.strip() if apply_in.phone else None,
            college=apply_in.college.strip() if apply_in.college else None,
            why_join=apply_in.why_join.strip() if apply_in.why_join else None,
            linkedin_url=apply_in.linkedin_url.strip() if apply_in.linkedin_url else None,
            github_url=apply_in.github_url.strip() if apply_in.github_url else None,
            resume_url=apply_in.resume_url.strip() if apply_in.resume_url else None,
            instagram_url=apply_in.instagram_url.strip() if apply_in.instagram_url else None,
            applied_at=now,
            source="website"
        )
        db.add(app_record)
        db.flush()

        # Get active assessment config
        assessment = db.query(Assessment).filter(Assessment.is_active == True).order_by(Assessment.id.desc()).first()
        if not assessment:
            # Fallback create default assessment if none exist
            assessment = Assessment(
                title="Python Internship Screening",
                topic="python",
                basic_question_count=5,
                intermediate_question_count=5,
                basic_time_seconds=45,
                intermediate_time_seconds=90,
                created_by=1,
                is_active=True
            )
            db.add(assessment)
            db.flush()

        raw_token = secrets.token_urlsafe(32)
        hashed_tok = _hash_token(raw_token)
        expires_at = now + timedelta(hours=24)

        invitation = AssessmentInvitation(
            application_id=app_record.id,
            assessment_id=assessment.id,
            token=hashed_tok,
            status="pending",
            created_at=now,
            expires_at=expires_at
        )
        db.add(invitation)
        db.commit()

        RAW_TOKEN_CACHE[invitation.id] = raw_token

        expires_str = expires_at.strftime("%Y-%m-%d %H:%M UTC")
        send_invitation_email(clean_email, app_record.name, raw_token, expires_str)

        return PublicApplyResponse(message="Check your email for your assessment link.", token=raw_token)

    return await asyncio.to_thread(_apply)

# --------------------------------------------------------------------------
# 2. PUBLIC INVITATION STATUS (No login required)
# --------------------------------------------------------------------------
@router.get("/assessment/candidate/{token}/status", response_model=PublicAssessmentStatus)
async def get_candidate_assessment_status(
    token: str,
    db: Session = Depends(get_db)
):
    def _status():
        tok_hash = _hash_token(token)
        invitation = db.query(AssessmentInvitation).filter(AssessmentInvitation.token == tok_hash).options(
            selectinload(AssessmentInvitation.assessment)
        ).first()

        now = _utcnow()

        if not invitation:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid or expired assessment link.")

        if invitation.status != "completed" and invitation.expires_at < now:
            invitation.status = "expired"
            db.commit()
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid or expired assessment link.")

        ass = invitation.assessment
        total_qs = ass.basic_question_count + ass.intermediate_question_count

        return PublicAssessmentStatus(
            title=ass.title,
            topic=ass.topic,
            question_count=total_qs,
            basic_time_seconds=ass.basic_time_seconds,
            intermediate_time_seconds=ass.intermediate_time_seconds,
            status=invitation.status,
            expires_at=invitation.expires_at,
            is_valid=True
        )

    return await asyncio.to_thread(_status)

# --------------------------------------------------------------------------
# 3. PUBLIC START ASSESSMENT (No login required)
# --------------------------------------------------------------------------
@router.post("/assessment/candidate/{token}/start", response_model=PublicStartResponse)
async def start_candidate_assessment(
    token: str,
    db: Session = Depends(get_db)
):
    def _start():
        tok_hash = _hash_token(token)
        invitation = db.query(AssessmentInvitation).filter(AssessmentInvitation.token == tok_hash).options(
            selectinload(AssessmentInvitation.assessment),
            selectinload(AssessmentInvitation.application),
            selectinload(AssessmentInvitation.attempt).selectinload(AssessmentAttempt.questions)
        ).first()

        now = _utcnow()

        if not invitation or (invitation.status != "completed" and invitation.expires_at < now):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid or expired assessment link.")

        if invitation.status == "completed":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Assessment already completed.")

        # Resume if already started
        if invitation.attempt:
            unanswered = [q for q in invitation.attempt.questions if not q.answer]
            if unanswered:
                unanswered.sort(key=lambda x: x.order_index)
                curr_q = unanswered[0]
                if not curr_q.served_at:
                    curr_q.served_at = now
                    db.commit()

                return PublicStartResponse(
                    attempt_id=invitation.attempt.id,
                    first_question=PublicCandidateQuestion(
                        id=curr_q.id,
                        question_text=curr_q.question_text,
                        options=curr_q.options,
                        difficulty=curr_q.difficulty,
                        order_index=curr_q.order_index,
                        time_limit_seconds=curr_q.time_limit_seconds,
                        served_at=curr_q.served_at,
                        total_questions=len(invitation.attempt.questions)
                    )
                )

        ass = invitation.assessment

        # Generate fresh questions server-side
        cand_email = invitation.application.email if invitation.application else None
        raw_questions = generate_full_assessment_questions(
            topic=ass.topic,
            basic_count=ass.basic_question_count,
            intermediate_count=ass.intermediate_question_count,
            deep_count=ass.deep_question_count,
            db=db,
            candidate_email=cand_email
        )

        attempt = AssessmentAttempt(
            assessment_id=ass.id,
            candidate_id=None,
            invitation_id=invitation.id,
            status="in_progress",
            started_at=now
        )
        attempt.check_owner_constraint()
        db.add(attempt)
        db.flush()

        invitation.attempt_id = attempt.id
        invitation.status = "in_progress"
        invitation.started_at = now

        question_objs = []
        for q_data in raw_questions:
            q_tier = q_data.get("tier", "intermediate")
            t_limit = (
                ass.basic_time_seconds if q_tier == "basic"
                else ass.deep_time_seconds if q_tier == "deep"
                else ass.intermediate_time_seconds
            )
            q_obj = AssessmentQuestion(
                assessment_attempt_id=attempt.id,
                question_text=q_data["question_text"],
                options=q_data["options"],
                correct_option_index=q_data["correct_option_index"],
                difficulty=q_tier,
                tier=q_tier,
                concept_key=q_data.get("concept_key"),
                scenario_theme=q_data.get("scenario_theme"),
                content_fingerprint=q_data.get("content_fingerprint"),
                explanation=q_data["explanation"],
                order_index=q_data["order_index"],
                time_limit_seconds=t_limit,
                served_at=now if q_data["order_index"] == 1 else None
            )
            db.add(q_obj)
            question_objs.append(q_obj)

        db.commit()

        first_q = question_objs[0]

        return PublicStartResponse(
            attempt_id=attempt.id,
            first_question=PublicCandidateQuestion(
                id=first_q.id,
                question_text=first_q.question_text,
                options=first_q.options,
                difficulty=first_q.difficulty,
                order_index=first_q.order_index,
                time_limit_seconds=first_q.time_limit_seconds,
                served_at=first_q.served_at,
                total_questions=len(question_objs)
            )
        )

    return await asyncio.to_thread(_start)

# --------------------------------------------------------------------------
# 4. PUBLIC CURRENT QUESTION (No login required)
# --------------------------------------------------------------------------
@router.get("/assessment/candidate/{token}/current-question", response_model=PublicAnswerSubmitResponse)
async def get_candidate_current_question(
    token: str,
    db: Session = Depends(get_db)
):
    def _current():
        tok_hash = _hash_token(token)
        invitation = db.query(AssessmentInvitation).filter(AssessmentInvitation.token == tok_hash).options(
            selectinload(AssessmentInvitation.application),
            selectinload(AssessmentInvitation.assessment),
            selectinload(AssessmentInvitation.attempt).selectinload(AssessmentAttempt.questions).selectinload(AssessmentQuestion.answer)
        ).first()

        if not invitation or not invitation.attempt:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid assessment link or attempt not started.")

        attempt = invitation.attempt
        now = _utcnow()

        if invitation.status == "completed" or attempt.status == "completed":
            return _build_public_completed_response(db, invitation, attempt)

        questions = sorted(attempt.questions, key=lambda x: x.order_index)

        last_expire_time = attempt.started_at
        for q in questions:
            if not q.answer:
                if q.served_at:
                    elapsed = (now - q.served_at).total_seconds()
                    if elapsed > (q.time_limit_seconds + 2.0):
                        # Timeout! Auto-record null answer at exact question expiration time
                        expire_dt = q.served_at + timedelta(seconds=q.time_limit_seconds)
                        timeout_ans = AssessmentAnswer(
                            question_id=q.id,
                            selected_option_index=None,
                            is_correct=False,
                            time_taken_seconds=float(q.time_limit_seconds),
                            submitted_at=expire_dt,
                            was_timeout=True
                        )
                        db.add(timeout_ans)
                        q.answer = timeout_ans
                        last_expire_time = expire_dt
                        db.commit()
                        continue

                if not q.served_at:
                    q.served_at = last_expire_time if last_expire_time else now
                    elapsed = (now - q.served_at).total_seconds()
                    if elapsed > (q.time_limit_seconds + 2.0):
                        expire_dt = q.served_at + timedelta(seconds=q.time_limit_seconds)
                        timeout_ans = AssessmentAnswer(
                            question_id=q.id,
                            selected_option_index=None,
                            is_correct=False,
                            time_taken_seconds=float(q.time_limit_seconds),
                            submitted_at=expire_dt,
                            was_timeout=True
                        )
                        db.add(timeout_ans)
                        q.answer = timeout_ans
                        last_expire_time = expire_dt
                        db.commit()
                        continue
                    db.commit()

                return PublicAnswerSubmitResponse(
                    question_id=q.id,
                    is_completed=False,
                    next_question=PublicCandidateQuestion(
                        id=q.id,
                        question_text=q.question_text,
                        options=q.options,
                        difficulty=q.difficulty,
                        order_index=q.order_index,
                        time_limit_seconds=q.time_limit_seconds,
                        served_at=q.served_at,
                        total_questions=len(questions)
                    )
                )

        # All questions completed!
        attempt.status = "completed"
        attempt.completed_at = now
        invitation.status = "completed"
        invitation.completed_at = now
        db.commit()

        return _build_public_completed_response(db, invitation, attempt)

    return await asyncio.to_thread(_current)

# --------------------------------------------------------------------------
# 5. PUBLIC SUBMIT ANSWER (No login required)
# --------------------------------------------------------------------------
@router.post("/assessment/candidate/{token}/answer", response_model=PublicAnswerSubmitResponse)
async def submit_candidate_answer(
    token: str,
    answer_in: AnswerSubmit,
    db: Session = Depends(get_db)
):
    def _answer():
        tok_hash = _hash_token(token)
        invitation = db.query(AssessmentInvitation).filter(AssessmentInvitation.token == tok_hash).options(
            selectinload(AssessmentInvitation.application),
            selectinload(AssessmentInvitation.assessment),
            selectinload(AssessmentInvitation.attempt).selectinload(AssessmentAttempt.questions).selectinload(AssessmentQuestion.answer)
        ).first()

        if not invitation or not invitation.attempt:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid link or attempt.")

        attempt = invitation.attempt
        if invitation.status == "completed" or attempt.status == "completed":
            return _build_public_completed_response(db, invitation, attempt)

        question = db.query(AssessmentQuestion).filter(
            AssessmentQuestion.id == answer_in.question_id,
            AssessmentQuestion.assessment_attempt_id == attempt.id
        ).first()

        if not question:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found for this attempt")

        now = _utcnow()
        if not question.answer:
            if not question.served_at:
                question.served_at = now

            elapsed = (now - question.served_at).total_seconds()
            is_timeout = elapsed > (question.time_limit_seconds + 3.0)

            if is_timeout:
                selected_opt = None
                is_correct = False
                time_taken = float(question.time_limit_seconds)
                was_timeout = True
            else:
                selected_opt = answer_in.selected_option_index
                is_correct = (selected_opt == question.correct_option_index) if selected_opt is not None else False
                time_taken = min(round(elapsed, 2), float(question.time_limit_seconds))
                was_timeout = False

            answer_obj = AssessmentAnswer(
                question_id=question.id,
                selected_option_index=selected_opt,
                is_correct=is_correct,
                time_taken_seconds=time_taken,
                submitted_at=now,
                was_timeout=was_timeout
            )
            db.add(answer_obj)
            question.answer = answer_obj
            db.commit()

        questions = sorted(attempt.questions, key=lambda x: x.order_index)
        next_q = None
        for q in questions:
            if q.id != question.id and not q.answer:
                next_q = q
                break

        if next_q:
            if not next_q.served_at:
                next_q.served_at = now
            db.commit()

            return PublicAnswerSubmitResponse(
                question_id=question.id,
                is_completed=False,
                next_question=PublicCandidateQuestion(
                    id=next_q.id,
                    question_text=next_q.question_text,
                    options=next_q.options,
                    difficulty=next_q.difficulty,
                    order_index=next_q.order_index,
                    time_limit_seconds=next_q.time_limit_seconds,
                    served_at=next_q.served_at,
                    total_questions=len(questions)
                )
            )
        else:
            # Last question answered! Complete attempt and return full transparent result with correct options & explanations
            attempt.status = "completed"
            attempt.completed_at = now
            invitation.status = "completed"
            invitation.completed_at = now
            db.commit()

            return _build_public_completed_response(db, invitation, attempt)

    return await asyncio.to_thread(_answer)

# --------------------------------------------------------------------------
# 6. PUBLIC RESULT VIEW (No login required - Full transparent breakdown)
# --------------------------------------------------------------------------
@router.get("/assessment/candidate/{token}/result", response_model=PublicCandidateResult)
async def get_candidate_result(
    token: str,
    db: Session = Depends(get_db)
):
    def _result():
        tok_hash = _hash_token(token)
        invitation = db.query(AssessmentInvitation).filter(AssessmentInvitation.token == tok_hash).options(
            selectinload(AssessmentInvitation.application),
            selectinload(AssessmentInvitation.assessment),
            selectinload(AssessmentInvitation.attempt).selectinload(AssessmentAttempt.questions).selectinload(AssessmentQuestion.answer)
        ).first()

        if not invitation or not invitation.attempt:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid link.")

        if invitation.status != "completed":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Assessment is not yet completed.")

        return _build_public_result_payload(invitation, invitation.attempt)

    return await asyncio.to_thread(_result)


# --- Helper Methods ---

def _build_public_result_payload(invitation: AssessmentInvitation, attempt: AssessmentAttempt) -> PublicCandidateResult:
    from app.services.scoring import calculate_attempt_scoring
    scoring = calculate_attempt_scoring(attempt)

    attempt.total_score = scoring["overall_weighted_score"]
    attempt.overall_weighted_score = scoring["overall_weighted_score"]
    attempt.intermediate_tier_accuracy = scoring["intermediate_tier_accuracy"]
    attempt.deep_tier_accuracy = scoring["deep_tier_accuracy"]
    attempt.tier_classification = scoring["tier_classification"]

    total_qs = len(attempt.questions)
    total_time = sum(q.answer.time_taken_seconds for q in attempt.questions if q.answer and q.answer.time_taken_seconds) or 0.0
    total_correct = scoring["basic_correct"] + scoring["intermediate_correct"] + scoring["deep_correct"]

    q_results = []
    for q in sorted(attempt.questions, key=lambda x: x.order_index):
        ans = q.answer
        q_results.append(
            PublicQuestionResult(
                question_id=q.id,
                order_index=q.order_index,
                question_text=q.question_text,
                options=q.options,
                selected_option_index=ans.selected_option_index if ans else None,
                correct_option_index=q.correct_option_index,
                is_correct=ans.is_correct if ans else False,
                difficulty=q.difficulty,
                explanation=q.explanation,
                time_limit_seconds=q.time_limit_seconds,
                time_taken_seconds=ans.time_taken_seconds if ans else None,
                was_timeout=ans.was_timeout if ans else False
            )
        )

    cand_name = invitation.application.name if invitation.application else "Candidate"
    cand_email = invitation.application.email if invitation.application else None
    ass_title = invitation.assessment.title if invitation.assessment else "Assessment"

    return PublicCandidateResult(
        attempt_id=attempt.id,
        candidate_name=cand_name,
        candidate_email=cand_email,
        assessment_title=ass_title,
        total_score=scoring["overall_weighted_score"],
        overall_weighted_score=scoring["overall_weighted_score"],
        intermediate_tier_accuracy=scoring["intermediate_tier_accuracy"],
        deep_tier_accuracy=scoring["deep_tier_accuracy"],
        tier_classification=scoring["tier_classification"],
        total_questions=total_qs,
        correct_count=total_correct,
        basic_correct_count=scoring["basic_correct"],
        basic_total=scoring["basic_total"],
        intermediate_correct_count=scoring["intermediate_correct"],
        intermediate_total=scoring["intermediate_total"],
        deep_correct_count=scoring["deep_correct"],
        deep_total=scoring["deep_total"],
        total_time_seconds=round(total_time, 1),
        completed_at=attempt.completed_at,
        questions=q_results
    )

def _build_public_completed_response(db: Session, invitation: AssessmentInvitation, attempt: AssessmentAttempt) -> PublicAnswerSubmitResponse:
    res = _build_public_result_payload(invitation, attempt)
    attempt.total_score = res.total_score
    db.commit()

    return PublicAnswerSubmitResponse(
        question_id=0,
        is_completed=True,
        result=res
    )
