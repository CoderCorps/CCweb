import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, selectinload
import asyncio
from typing import Optional, List

from app.deps import get_db, get_current_mentor
from app.models.user import User
from app.models.candidate import CandidateApplication, AssessmentInvitation, ReminderLog
from app.models.assessment import AssessmentAttempt, AssessmentQuestion, AssessmentAnswer
from app.schemas.candidate import (
    AdminCandidateSummary,
    AdminCandidateDetail,
    ReminderLogSchema,
    PublicCandidateResult,
    PublicQuestionResult
)
from app.services.email_service import send_invitation_email
from app.api.v1.public_apply import _hash_token, RAW_TOKEN_CACHE, _build_public_result_payload

router = APIRouter()

def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)

# --------------------------------------------------------------------------
# 1. LIST CANDIDATE APPLICATIONS (Mentor / Admin)
# --------------------------------------------------------------------------
@router.get("/candidate-applications", response_model=List[AdminCandidateSummary])
async def list_candidate_applications(
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_mentor: User = Depends(get_current_mentor)
):
    def _query():
        q = db.query(CandidateApplication).options(
            selectinload(CandidateApplication.invitations).selectinload(AssessmentInvitation.attempt),
            selectinload(CandidateApplication.invitations).selectinload(AssessmentInvitation.reminder_logs)
        )

        if search:
            term = f"%{search.strip()}%"
            q = q.filter(
                (CandidateApplication.name.ilike(term)) |
                (CandidateApplication.email.ilike(term)) |
                (CandidateApplication.college.ilike(term))
            )

        apps = q.order_by(CandidateApplication.id.desc()).all()

        summaries = []
        for app_rec in apps:
            inv = app_rec.invitations[0] if app_rec.invitations else None
            inv_status = inv.status if inv else "pending"
            exp_at = inv.expires_at if inv else app_rec.applied_at + timedelta(hours=24)
            score = inv.attempt.total_score if (inv and inv.attempt) else None
            rem_count = len(inv.reminder_logs) if inv else 0

            if status_filter and status_filter.strip().lower() != inv_status.lower():
                continue

            summaries.append(
                AdminCandidateSummary(
                    id=app_rec.id,
                    name=app_rec.name,
                    email=app_rec.email,
                    phone=app_rec.phone,
                    college=app_rec.college,
                    applied_at=app_rec.applied_at,
                    invitation_status=inv_status,
                    expires_at=exp_at,
                    total_score=score,
                    reminders_count=rem_count
                )
            )

        return summaries

    return await asyncio.to_thread(_query)

# --------------------------------------------------------------------------
# 2. GET CANDIDATE APPLICATION DETAIL (Mentor / Admin)
# --------------------------------------------------------------------------
@router.get("/candidate-applications/{id}", response_model=AdminCandidateDetail)
async def get_candidate_application_detail(
    id: int,
    db: Session = Depends(get_db),
    current_mentor: User = Depends(get_current_mentor)
):
    def _detail():
        app_rec = db.query(CandidateApplication).filter(CandidateApplication.id == id).options(
            selectinload(CandidateApplication.invitations).selectinload(AssessmentInvitation.assessment),
            selectinload(CandidateApplication.invitations).selectinload(AssessmentInvitation.reminder_logs),
            selectinload(CandidateApplication.invitations).selectinload(AssessmentInvitation.attempt).selectinload(AssessmentAttempt.questions).selectinload(AssessmentQuestion.answer)
        ).first()

        if not app_rec:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate application not found.")

        inv = app_rec.invitations[0] if app_rec.invitations else None
        
        inv_info = None
        result_payload = None

        if inv:
            inv_info = {
                "invitation_id": inv.id,
                "token_hash": inv.token,
                "status": inv.status,
                "created_at": inv.created_at,
                "expires_at": inv.expires_at,
                "started_at": inv.started_at,
                "completed_at": inv.completed_at
            }

            if inv.attempt and inv.status == "completed":
                result_payload = _build_public_result_payload(inv, inv.attempt)

        logs = [
            ReminderLogSchema.model_validate(l) for l in (inv.reminder_logs if inv else [])
        ]

        return AdminCandidateDetail(
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
            source=app_rec.source,
            invitation=inv_info,
            reminder_logs=logs,
            result=result_payload
        )

    return await asyncio.to_thread(_detail)

# --------------------------------------------------------------------------
# 3. RESEND INVITATION (Mentor / Admin)
# --------------------------------------------------------------------------
@router.post("/candidate-applications/{id}/resend-invitation")
async def resend_candidate_invitation(
    id: int,
    db: Session = Depends(get_db),
    current_mentor: User = Depends(get_current_mentor)
):
    def _resend():
        app_rec = db.query(CandidateApplication).filter(CandidateApplication.id == id).options(
            selectinload(CandidateApplication.invitations)
        ).first()

        if not app_rec:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate application not found.")

        inv = app_rec.invitations[0] if app_rec.invitations else None
        if not inv:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No invitation record found.")

        if inv.status in ["in_progress", "completed"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot resend invitation for an assessment that is in progress or completed."
            )

        now = _utcnow()
        raw_token = secrets.token_urlsafe(32)
        inv.token = _hash_token(raw_token)
        inv.status = "pending"
        inv.created_at = now
        inv.expires_at = now + timedelta(hours=24)
        db.commit()

        RAW_TOKEN_CACHE[inv.id] = raw_token

        expires_str = inv.expires_at.strftime("%Y-%m-%d %H:%M UTC")
        send_invitation_email(app_rec.email, app_rec.name, raw_token, expires_str)

        return {"status": "ok", "message": f"Fresh invitation sent to {app_rec.email}."}

    return await asyncio.to_thread(_resend)
