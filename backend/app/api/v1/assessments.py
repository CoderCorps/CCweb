from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload
import asyncio
from datetime import datetime, timezone
from typing import List, Optional

from app.deps import get_db, get_current_user, get_current_mentor
from app.models.user import User
from app.models.assessment import Assessment, AssessmentAttempt, AssessmentQuestion, AssessmentAnswer
from app.schemas.assessment import (
    AssessmentCreate,
    AssessmentResponse,
    CandidateQuestionResponse,
    AnswerSubmit,
    AnswerSubmitResponse,
    StartAttemptResponse,
    AttemptResultResponse,
    MentorAttemptSummary,
    MentorAttemptReview,
    MentorQuestionReview,
    CandidateUserSchema
)
from app.services.question_generator import generate_full_assessment_questions

router = APIRouter()

def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)

# --------------------------------------------------------------------------
# 1. CREATE ASSESSMENT (Mentor / Admin)
# --------------------------------------------------------------------------
@router.post("/", response_model=AssessmentResponse, status_code=status.HTTP_201_CREATED)
async def create_assessment(
    assessment_in: AssessmentCreate,
    db: Session = Depends(get_db),
    current_mentor: User = Depends(get_current_mentor)
):
    def _create():
        db_assessment = Assessment(
            title=assessment_in.title,
            topic=assessment_in.topic,
            basic_question_count=assessment_in.basic_question_count,
            intermediate_question_count=assessment_in.intermediate_question_count,
            basic_time_seconds=assessment_in.basic_time_seconds,
            intermediate_time_seconds=assessment_in.intermediate_time_seconds,
            created_by=current_mentor.id,
            is_active=assessment_in.is_active
        )
        db.add(db_assessment)
        db.commit()
        db.refresh(db_assessment)
        return db_assessment

    return await asyncio.to_thread(_create)

# --------------------------------------------------------------------------
# 2. LIST ASSESSMENTS
# --------------------------------------------------------------------------
@router.get("/", response_model=List[AssessmentResponse])
async def list_assessments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    def _query():
        assessments = db.query(Assessment).filter(Assessment.is_active == True).all()
        # Fetch user's existing attempts to populate status
        attempts = db.query(AssessmentAttempt).filter(AssessmentAttempt.candidate_id == current_user.id).all()
        attempt_map = {att.assessment_id: att for att in attempts}

        result = []
        for a in assessments:
            att = attempt_map.get(a.id)
            item = AssessmentResponse.model_validate(a)
            if att:
                item.attempt_status = att.status
                item.attempt_id = att.id
            result.append(item)
        return result

    return await asyncio.to_thread(_query)

# --------------------------------------------------------------------------
# 3. START ASSESSMENT ATTEMPT (Candidate)
# --------------------------------------------------------------------------
@router.post("/{id}/start", response_model=StartAttemptResponse)
async def start_assessment(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    def _start():
        assessment = db.query(Assessment).filter(Assessment.id == id, Assessment.is_active == True).first()
        if not assessment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment not found or inactive")

        # Check existing attempt
        existing_attempt = db.query(AssessmentAttempt).filter(
            AssessmentAttempt.assessment_id == id,
            AssessmentAttempt.candidate_id == current_user.id
        ).options(selectinload(AssessmentAttempt.questions)).first()

        now = _utcnow()

        if existing_attempt:
            if existing_attempt.status == "completed":
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Assessment already completed")
            # If in_progress, find first unanswered question or return current
            unanswered = [q for q in existing_attempt.questions if not q.answer]
            if unanswered:
                unanswered.sort(key=lambda x: x.order_index)
                curr_q = unanswered[0]
                if not curr_q.served_at:
                    curr_q.served_at = now
                    db.commit()
                
                return StartAttemptResponse(
                    attempt_id=existing_attempt.id,
                    first_question=CandidateQuestionResponse(
                        id=curr_q.id,
                        question_text=curr_q.question_text,
                        options=curr_q.options,
                        difficulty=curr_q.difficulty,
                        order_index=curr_q.order_index,
                        time_limit_seconds=curr_q.time_limit_seconds,
                        served_at=curr_q.served_at,
                        total_questions=len(existing_attempt.questions)
                    )
                )

        # Generate fresh questions server-side
        raw_questions = generate_full_assessment_questions(
            topic=assessment.topic,
            basic_count=assessment.basic_question_count,
            intermediate_count=assessment.intermediate_question_count,
            deep_count=assessment.deep_question_count,
            db=db
        )

        # Create attempt
        attempt = AssessmentAttempt(
            assessment_id=id,
            candidate_id=current_user.id,
            status="in_progress",
            started_at=now
        )
        db.add(attempt)
        db.flush()

        question_objs = []
        for q_data in raw_questions:
            q_tier = q_data.get("tier", "intermediate")
            t_limit = (
                assessment.basic_time_seconds if q_tier == "basic"
                else assessment.deep_time_seconds if q_tier == "deep"
                else assessment.intermediate_time_seconds
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
                explanation=q_data.get("explanation", ""),
                order_index=q_data["order_index"],
                time_limit_seconds=t_limit,
                served_at=now if q_data["order_index"] == 1 else None
            )
            db.add(q_obj)
            question_objs.append(q_obj)

        db.commit()

        first_q = question_objs[0]

        return StartAttemptResponse(
            attempt_id=attempt.id,
            first_question=CandidateQuestionResponse(
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
# 4. GET CURRENT QUESTION (Page refresh recovery / timeout auto-advance)
# --------------------------------------------------------------------------
@router.get("/assessment-attempts/{id}/current-question", response_model=AnswerSubmitResponse)
async def get_current_question(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    def _get_current():
        attempt = db.query(AssessmentAttempt).filter(
            AssessmentAttempt.id == id,
            AssessmentAttempt.candidate_id == current_user.id
        ).options(
            selectinload(AssessmentAttempt.questions).selectinload(AssessmentQuestion.answer)
        ).first()

        if not attempt:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment attempt not found")

        if attempt.status == "completed":
            return _build_completed_response(db, attempt)

        now = _utcnow()
        questions = sorted(attempt.questions, key=lambda x: x.order_index)

        # Loop through unanswered questions and check for timeouts
        for q in questions:
            if not q.answer:
                if q.served_at:
                    elapsed = (now - q.served_at).total_seconds()
                    # Check if timer expired (with 3-second grace)
                    if elapsed > (q.time_limit_seconds + 3.0):
                        # Timeout! Auto-record null answer
                        timeout_ans = AssessmentAnswer(
                            question_id=q.id,
                            selected_option_index=None,
                            is_correct=False,
                            time_taken_seconds=float(q.time_limit_seconds),
                            submitted_at=now,
                            was_timeout=True
                        )
                        db.add(timeout_ans)
                        q.answer = timeout_ans
                        db.commit()
                        continue  # Move to next question

                # Found active unanswered question
                if not q.served_at:
                    q.served_at = now
                    db.commit()

                return AnswerSubmitResponse(
                    question_id=q.id,
                    is_completed=False,
                    next_question=CandidateQuestionResponse(
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

        # All questions have been answered or timed out! Mark completed
        attempt.status = "completed"
        attempt.completed_at = now
        db.commit()
        return _build_completed_response(db, attempt)

    return await asyncio.to_thread(_get_current)

# --------------------------------------------------------------------------
# 5. SUBMIT ANSWER (Candidate)
# --------------------------------------------------------------------------
@router.post("/assessment-attempts/{id}/answer", response_model=AnswerSubmitResponse)
async def submit_answer(
    id: int,
    answer_in: AnswerSubmit,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    def _answer():
        attempt = db.query(AssessmentAttempt).filter(
            AssessmentAttempt.id == id,
            AssessmentAttempt.candidate_id == current_user.id
        ).options(
            selectinload(AssessmentAttempt.questions).selectinload(AssessmentQuestion.answer)
        ).first()

        if not attempt:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found")

        if attempt.status == "completed":
            return _build_completed_response(db, attempt)

        question = db.query(AssessmentQuestion).filter(
            AssessmentQuestion.id == answer_in.question_id,
            AssessmentQuestion.assessment_attempt_id == id
        ).first()

        if not question:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found for this attempt")

        if question.answer:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Question already answered")

        now = _utcnow()
        if not question.served_at:
            question.served_at = now

        elapsed = (now - question.served_at).total_seconds()
        
        # Server-authoritative time enforcement
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

        # Find next unanswered question
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

            return AnswerSubmitResponse(
                question_id=question.id,
                is_completed=False,
                next_question=CandidateQuestionResponse(
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
            # Last question answered!
            attempt.status = "completed"
            attempt.completed_at = now
            db.commit()
            return _build_completed_response(db, attempt)

    return await asyncio.to_thread(_answer)

# --------------------------------------------------------------------------
# 6. GET CANDIDATE RESULT (Candidate's aggregate result view - no leaks!)
# --------------------------------------------------------------------------
@router.get("/assessment-attempts/{id}/result", response_model=AttemptResultResponse)
async def get_attempt_result(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    def _result():
        attempt = db.query(AssessmentAttempt).filter(
            AssessmentAttempt.id == id,
            AssessmentAttempt.candidate_id == current_user.id
        ).options(
            selectinload(AssessmentAttempt.questions).selectinload(AssessmentQuestion.answer)
        ).first()

        if not attempt:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found")

        if attempt.status != "completed":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Attempt is not yet completed")

        res_payload = _compute_attempt_stats(attempt)
        return res_payload

    return await asyncio.to_thread(_result)

# --------------------------------------------------------------------------
# 7. TAB SWITCH / ANTI-CHEAT FLAG (Candidate)
# --------------------------------------------------------------------------
@router.post("/assessment-attempts/{id}/flag")
async def flag_tab_switch(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    def _flag():
        from app.models.assessment import TabSwitchLog
        attempt = db.query(AssessmentAttempt).filter(
            AssessmentAttempt.id == id,
            AssessmentAttempt.candidate_id == current_user.id
        ).options(selectinload(AssessmentAttempt.questions)).first()

        if attempt and attempt.status == "in_progress":
            attempt.tab_switch_count += 1
            curr_order = None
            for q in sorted(attempt.questions, key=lambda x: x.order_index):
                if not q.answer:
                    curr_order = q.order_index
                    break

            log_entry = TabSwitchLog(
                attempt_id=attempt.id,
                question_order_index=curr_order,
                switched_at=_utcnow()
            )
            db.add(log_entry)
            db.commit()
        return {"status": "ok", "tab_switch_count": attempt.tab_switch_count if attempt else 0}

    return await asyncio.to_thread(_flag)

def _build_candidate_schema(attempt: AssessmentAttempt, db: Session) -> CandidateUserSchema:
    email = None
    if attempt.candidate:
        email = attempt.candidate.email
        res = CandidateUserSchema(
            id=attempt.candidate.id,
            name=attempt.candidate.name,
            email=attempt.candidate.email,
            is_public_candidate=False,
            user_id=attempt.candidate.id,
            user_status=attempt.candidate.status
        )
    elif attempt.invitation and attempt.invitation.application:
        app_rec = attempt.invitation.application
        email = app_rec.email
        res = CandidateUserSchema(
            id=app_rec.id,
            name=app_rec.name,
            email=app_rec.email,
            phone=app_rec.phone,
            college=app_rec.college,
            why_join=app_rec.why_join,
            linkedin_url=app_rec.linkedin_url,
            github_url=app_rec.github_url,
            resume_url=app_rec.resume_url,
            instagram_url=app_rec.instagram_url,
            applied_at=app_rec.applied_at,
            is_public_candidate=True,
            invitation_token=attempt.invitation.token
        )
    else:
        res = CandidateUserSchema(
            id=0,
            name="Anonymous Applicant",
            email="candidate@applicant.com",
            is_public_candidate=True
        )

    if email:
        user_rec = db.query(User).filter(User.email == email.strip().lower()).first()
        if user_rec:
            res.user_id = user_rec.id
            res.user_status = user_rec.status
        else:
            res.user_status = "not_registered"
    return res

# --------------------------------------------------------------------------
# 8. MENTOR LIST ATTEMPTS FOR ASSESSMENT (Mentor / Admin)
# --------------------------------------------------------------------------
@router.get("/{id}/attempts", response_model=List[MentorAttemptSummary])
async def list_assessment_attempts(
    id: int,
    tier_classification_filter: Optional[str] = Query(None, alias="tier_classification"),
    db: Session = Depends(get_db),
    current_mentor: User = Depends(get_current_mentor)
):
    def _query():
        from app.models.candidate import AssessmentInvitation
        attempts = db.query(AssessmentAttempt).filter(
            AssessmentAttempt.assessment_id == id
        ).options(
            selectinload(AssessmentAttempt.candidate),
            selectinload(AssessmentAttempt.invitation).selectinload(AssessmentInvitation.application)
        ).order_by(AssessmentAttempt.id.desc()).all()

        results = []
        for att in attempts:
            if tier_classification_filter and att.tier_classification:
                if tier_classification_filter.strip().lower() not in att.tier_classification.lower():
                    continue
            results.append(
                MentorAttemptSummary(
                    id=att.id,
                    assessment_id=att.assessment_id,
                    candidate=_build_candidate_schema(att, db),
                    status=att.status,
                    started_at=att.started_at,
                    completed_at=att.completed_at,
                    total_score=att.total_score,
                    overall_weighted_score=att.overall_weighted_score,
                    intermediate_tier_accuracy=att.intermediate_tier_accuracy,
                    deep_tier_accuracy=att.deep_tier_accuracy,
                    tier_classification=att.tier_classification,
                    tab_switch_count=att.tab_switch_count
                )
            )
        return results

    return await asyncio.to_thread(_query)

# --------------------------------------------------------------------------
# 9. MENTOR DETAILED ATTEMPT REVIEW (Mentor / Admin)
# --------------------------------------------------------------------------
@router.get("/assessment-attempts/{id}/review", response_model=MentorAttemptReview)
async def review_assessment_attempt(
    id: int,
    db: Session = Depends(get_db),
    current_mentor: User = Depends(get_current_mentor)
):
    def _review():
        from app.models.candidate import AssessmentInvitation
        attempt = db.query(AssessmentAttempt).filter(
            AssessmentAttempt.id == id
        ).options(
            selectinload(AssessmentAttempt.assessment),
            selectinload(AssessmentAttempt.candidate),
            selectinload(AssessmentAttempt.invitation).selectinload(AssessmentInvitation.application),
            selectinload(AssessmentAttempt.questions).selectinload(AssessmentQuestion.answer),
            selectinload(AssessmentAttempt.tab_switch_logs)
        ).first()

        if not attempt:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found")

        from app.schemas.assessment import TabSwitchLogSchema
        t_logs = [TabSwitchLogSchema.model_validate(log) for log in attempt.tab_switch_logs]

        q_reviews = []
        for q in sorted(attempt.questions, key=lambda x: x.order_index):
            ans = q.answer
            q_reviews.append(
                MentorQuestionReview(
                    question_id=q.id,
                    order_index=q.order_index,
                    question_text=q.question_text,
                    options=q.options,
                    correct_option_index=q.correct_option_index,
                    selected_option_index=ans.selected_option_index if ans else None,
                    is_correct=ans.is_correct if ans else False,
                    difficulty=q.difficulty,
                    explanation=q.explanation,
                    time_limit_seconds=q.time_limit_seconds,
                    time_taken_seconds=ans.time_taken_seconds if ans else None,
                    served_at=q.served_at,
                    submitted_at=ans.submitted_at if ans else None,
                    was_timeout=ans.was_timeout if ans else False
                )
            )

        return MentorAttemptReview(
            attempt_id=attempt.id,
            assessment_title=attempt.assessment.title,
            candidate=_build_candidate_schema(attempt, db),
            status=attempt.status,
            started_at=attempt.started_at,
            completed_at=attempt.completed_at,
            total_score=attempt.total_score,
            overall_weighted_score=attempt.overall_weighted_score,
            intermediate_tier_accuracy=attempt.intermediate_tier_accuracy,
            deep_tier_accuracy=attempt.deep_tier_accuracy,
            tier_classification=attempt.tier_classification,
            tab_switch_count=attempt.tab_switch_count,
            tab_switch_logs=t_logs,
            questions=q_reviews
        )

    return await asyncio.to_thread(_review)

# --------------------------------------------------------------------------
# 10. MENTOR RESET ATTEMPT (Mentor / Admin)
# --------------------------------------------------------------------------
@router.post("/assessment-attempts/{id}/reset")
async def reset_assessment_attempt(
    id: int,
    db: Session = Depends(get_db),
    current_mentor: User = Depends(get_current_mentor)
):
    def _reset():
        attempt = db.query(AssessmentAttempt).filter(AssessmentAttempt.id == id).first()
        if not attempt:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attempt not found")

        db.delete(attempt)
        db.commit()
        return {"status": "reset_successful"}

    return await asyncio.to_thread(_reset)


# --- Helper Methods ---

def _compute_attempt_stats(attempt: AssessmentAttempt) -> AttemptResultResponse:
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

    return AttemptResultResponse(
        attempt_id=attempt.id,
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
        status=attempt.status,
        completed_at=attempt.completed_at
    )

def _build_completed_response(db: Session, attempt: AssessmentAttempt) -> AnswerSubmitResponse:
    stats = _compute_attempt_stats(attempt)
    attempt.total_score = stats.total_score
    db.commit()
    return AnswerSubmitResponse(
        question_id=0,
        is_completed=True,
        result=stats
    )
