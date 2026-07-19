from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import datetime
import asyncio

from app.deps import get_db, get_current_user, get_current_mentor
from app.models.user import User
from app.models.project import Project
from app.models.submission import Submission, Certificate
from app.models.activity import ActivityEvent
from app.schemas.submission import SubmissionCreate, SubmissionResponse, SubmissionReview, CertificateResponse

router = APIRouter()

@router.post("/", response_model=SubmissionResponse, status_code=status.HTTP_201_CREATED)
async def create_submission(
    submission_in: SubmissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    def _create():
        project = db.query(Project).filter(Project.id == submission_in.project_id).first()
        if not project:
            return None, "project_not_found"
        existing = db.query(Submission).filter(
            Submission.project_id == submission_in.project_id,
            Submission.user_id == current_user.id,
            Submission.status == "submitted"
        ).first()
        if existing:
            return None, "already_submitted"
        db_submission = Submission(
            project_id=submission_in.project_id,
            user_id=current_user.id,
            demo_url=str(submission_in.demo_url) if submission_in.demo_url else None,
            repo_url=str(submission_in.repo_url) if submission_in.repo_url else None,
            status="submitted"
        )
        db.add(db_submission)
        db.commit()
        db.refresh(db_submission)
        return db_submission, "ok"

    submission, result = await asyncio.to_thread(_create)
    if result == "project_not_found":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    if result == "already_submitted":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You already have a pending submission for this project.")
    return submission

@router.get("/{id}", response_model=SubmissionResponse)
async def get_submission(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    submission = await asyncio.to_thread(
        lambda: db.query(Submission).filter(Submission.id == id).first()
    )
    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
    if current_user.role not in ["mentor", "admin"] and submission.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view this submission")
    return submission

@router.patch("/{id}/review", response_model=SubmissionResponse)
async def review_submission(
    id: int,
    review_in: SubmissionReview,
    db: Session = Depends(get_db),
    current_mentor: User = Depends(get_current_mentor)
):
    def _review():
        submission = db.query(Submission).filter(Submission.id == id).first()
        if not submission:
            return None, "not_found"
        if submission.status != "submitted":
            return None, f"wrong_status:{submission.status}"
        submission.status = review_in.status
        submission.feedback = review_in.feedback
        submission.reviewed_by_id = current_mentor.id
        db.add(submission)
        db.commit()
        db.refresh(submission)

        db.add(ActivityEvent(
            event_type="submission_approved",
            actor_user_id=submission.user_id,
            project_id=submission.project_id,
            event_metadata={
                "project_title": submission.project.title if submission.project else "",
                "mentor_name": current_mentor.name
            }
        ))
        db.commit()

        if review_in.status == "approved":
            existing_cert = db.query(Certificate).filter(
                Certificate.user_id == submission.user_id,
                Certificate.project_id == submission.project_id
            ).first()
            if not existing_cert:
                student = submission.user
                project = submission.project
                criteria = {
                    "student_name": student.name,
                    "project_title": project.title,
                    "mentor_name": current_mentor.name,
                    "demo_url": submission.demo_url,
                    "repo_url": submission.repo_url,
                    "approved_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    "audit_message": "Verifiable Software Engineering Achievement. This certificate validates actual codebase contributions."
                }
                db_cert = Certificate(
                    user_id=submission.user_id,
                    project_id=submission.project_id,
                    criteria_met=criteria
                )
                db.add(db_cert)
                db.commit()
                db.refresh(db_cert)
                db.add(ActivityEvent(
                    event_type="certificate_issued",
                    actor_user_id=submission.user_id,
                    project_id=submission.project_id,
                    event_metadata={"project_title": project.title, "certificate_id": db_cert.id, "mentor_name": current_mentor.name}
                ))
                db.commit()

        return submission, "ok"

    submission, result = await asyncio.to_thread(_review)
    if result == "not_found":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
    if result and result.startswith("wrong_status:"):
        state = result.split(":")[1]
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot review a submission that is already in state: {state}")
    return submission
