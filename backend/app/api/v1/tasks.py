from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import datetime
import asyncio
from pydantic import BaseModel

from app.deps import get_db, get_current_user
from app.models.user import User
from app.models.project import Project, ProjectMember
from app.models.sprint import Sprint, Task, TaskAssignment, TaskSubmission
from app.models.notification import Notification
from app.services.badge_evaluator import evaluate_blocker_crusher, evaluate_system_architect
from app.schemas.sprint import (
    TaskAssignmentResponse,
    TaskSubmissionResponse,
    TaskResponse
)

router = APIRouter()

# --- Schemas for payloads ---

class AssignPayload(BaseModel):
    user_ids: List[int]
    mode: str  # 'individual' | 'competitive'

class AssignmentStatusUpdate(BaseModel):
    status: str  # 'assigned' | 'in_progress' | 'submitted' | 'reviewed'

class TaskSubmissionCreate(BaseModel):
    repo_url: Optional[str] = None
    demo_url: Optional[str] = None
    approach_notes: Optional[str] = None

class TaskReviewPayload(BaseModel):
    mentor_score: Optional[int] = None
    mentor_feedback: Optional[str] = None
    needs_improvement: bool = False

class GoogleFormSubmissionPayload(BaseModel):
    task_id: int
    email: str
    repo_url: Optional[str] = None
    demo_url: Optional[str] = None
    approach_notes: Optional[str] = None
    secret_key: str

# --- Endpoints ---

@router.post("/external/google-form-submission", status_code=status.HTTP_201_CREATED)
async def external_google_form_submission(
    payload: GoogleFormSubmissionPayload,
    db: Session = Depends(get_db)
):
    """Endpoint for Google Apps Script to push submissions."""
    if payload.secret_key != "CODERCORPS_SECRET_INTEGRATION_KEY":
        raise HTTPException(status_code=403, detail="Unauthorized external source")

    def _submit():
        user = db.query(User).filter(User.email == payload.email).first()
        if not user:
            return None, "user_not_found"
        task = db.query(Task).filter(Task.id == payload.task_id).first()
        if not task:
            return None, "task_not_found"
        assign = db.query(TaskAssignment).filter(
            TaskAssignment.task_id == task.id, TaskAssignment.user_id == user.id
        ).first()
        if not assign:
            return None, "not_assigned"
        now = datetime.datetime.now(datetime.timezone.utc)
        sub = TaskSubmission(
            task_id=task.id, user_id=user.id,
            repo_url=payload.repo_url, demo_url=payload.demo_url,
            approach_notes=payload.approach_notes,
            submitted_at=now, submission_source="google_form"
        )
        db.add(sub)
        assign.status = "submitted"
        db.commit()
        return sub, "ok"

    sub, result = await asyncio.to_thread(_submit)
    if result == "user_not_found":
        raise HTTPException(status_code=404, detail=f"User with email {payload.email} not found")
    if result == "task_not_found":
        raise HTTPException(status_code=404, detail="Task not found")
    if result == "not_assigned":
        raise HTTPException(status_code=403, detail="User is not assigned to this task")
    return {"status": "success", "submission_id": sub.id}

@router.post("/tasks/{id}/assign")
async def assign_task(
    id: int,
    payload: AssignPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    def _assign():
        task = db.query(Task).filter(Task.id == id).first()
        if not task:
            return None, "task_not_found"
        project = task.sprint.project
        if current_user.role != "admin" and (current_user.role != "mentor" or project.mentor_id != current_user.id):
            return None, "forbidden"
        if payload.mode not in ["individual", "competitive"]:
            return None, "invalid_mode"
        task.task_mode = payload.mode
        db.query(TaskAssignment).filter(TaskAssignment.task_id == id).delete()
        now = datetime.datetime.now(datetime.timezone.utc)
        for uid in payload.user_ids:
            member = db.query(ProjectMember).filter(
                ProjectMember.project_id == project.id, ProjectMember.user_id == uid
            ).first()
            if not member:
                return None, f"user_{uid}_not_member"
            assign = TaskAssignment(
                task_id=id, user_id=uid, assigned_by_id=current_user.id,
                assigned_at=now, status="assigned"
            )
            db.add(assign)
            db.add(Notification(
                user_id=uid, type="task_assigned",
                message=f"You have been assigned a new task: {task.title}",
                link=f"/projects/{project.id}"
            ))
        db.commit()
        return task, "ok"

    task, result = await asyncio.to_thread(_assign)
    if result == "task_not_found":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    if result == "forbidden":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    if result == "invalid_mode":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid mode")
    if result and result.startswith("user_") and result.endswith("_not_member"):
        uid = result.split("_")[1]
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"User {uid} is not a member of this project")
    return {"status": "success", "message": f"Successfully assigned task {id} to users."}

@router.get("/tasks/{id}/assignments", response_model=List[TaskAssignmentResponse])
async def get_task_assignments(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    def _query():
        task = db.query(Task).filter(Task.id == id).first()
        if not task:
            return None, None, None, []
        project = task.sprint.project
        is_member = db.query(ProjectMember).filter(
            ProjectMember.project_id == project.id, ProjectMember.user_id == current_user.id
        ).first() is not None
        assignments = db.query(TaskAssignment).filter(TaskAssignment.task_id == id).all()
        return task, project, is_member, assignments

    task, project, is_member, assignments = await asyncio.to_thread(_query)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    if current_user.role != "admin" and project.mentor_id != current_user.id and not is_member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return assignments

@router.patch("/task-assignments/{id}", response_model=TaskAssignmentResponse)
async def update_task_assignment(
    id: int,
    payload: AssignmentStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if payload.status not in ["assigned", "in_progress", "submitted", "reviewed"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")

    def _update():
        assign = db.query(TaskAssignment).filter(TaskAssignment.id == id).first()
        if not assign:
            return None, "not_found"
        project = assign.task.sprint.project
        is_assigned_student = assign.user_id == current_user.id
        is_mentor = project.mentor_id == current_user.id
        is_admin = current_user.role == "admin"
        if not (is_assigned_student or is_mentor or is_admin):
            return None, "forbidden"
        assign.status = payload.status
        db.commit()
        db.refresh(assign)
        return assign, "ok"

    assign, result = await asyncio.to_thread(_update)
    if result == "not_found":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task assignment not found")
    if result == "forbidden":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return assign

@router.post("/tasks/{id}/submissions", response_model=TaskSubmissionResponse, status_code=status.HTTP_201_CREATED)
async def submit_task(
    id: int,
    payload: TaskSubmissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    def _submit():
        task = db.query(Task).filter(Task.id == id).first()
        if not task:
            return None, "task_not_found"
        assign = db.query(TaskAssignment).filter(
            TaskAssignment.task_id == id, TaskAssignment.user_id == current_user.id
        ).first()
        if not assign:
            return None, "not_assigned"
        now = datetime.datetime.now(datetime.timezone.utc)
        sub = TaskSubmission(
            task_id=id, user_id=current_user.id,
            repo_url=payload.repo_url, demo_url=payload.demo_url,
            approach_notes=payload.approach_notes, submitted_at=now
        )
        db.add(sub)
        assign.status = "submitted"
        db.commit()
        db.refresh(sub)
        return sub, "ok"

    sub, result = await asyncio.to_thread(_submit)
    if result == "task_not_found":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    if result == "not_assigned":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: You are not assigned to this task")
    return sub

@router.get("/tasks/{id}/submissions")
async def get_task_submissions(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    def _query():
        task = db.query(Task).filter(Task.id == id).first()
        if not task:
            return None, None, None, None, []
        project = task.sprint.project
        is_mentor = project.mentor_id == current_user.id
        is_admin = current_user.role == "admin"
        submissions = db.query(TaskSubmission).filter(TaskSubmission.task_id == id).all()
        assign = db.query(TaskAssignment).filter(
            TaskAssignment.task_id == id, TaskAssignment.user_id == current_user.id
        ).first()
        return task, project, is_mentor, is_admin, submissions, assign

    task, project, is_mentor, is_admin, submissions, assign = await asyncio.to_thread(_query)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    def _fmt(s, show_all=True):
        return {
            "id": s.id, "task_id": s.task_id, "user_id": s.user_id,
            "user_name": s.user.name, "repo_url": s.repo_url, "demo_url": s.demo_url,
            "approach_notes": s.approach_notes, "submitted_at": s.submitted_at,
            "mentor_score": s.mentor_score if show_all else None,
            "mentor_feedback": s.mentor_feedback if show_all else None,
            "reviewed_at": s.reviewed_at, "ai_score": s.ai_score,
            "ai_feedback_json": s.ai_feedback_json
        }

    if is_mentor or is_admin:
        return [_fmt(s) for s in submissions]

    if not assign:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    all_reviewed = len(submissions) > 0 and all(s.mentor_score is not None for s in submissions)
    if not all_reviewed:
        return [_fmt(s) for s in submissions if s.user_id == current_user.id]

    return [
        {**_fmt(s, show_all=False),
         "mentor_score": s.mentor_score if s.user_id == current_user.id else None,
         "mentor_feedback": s.mentor_feedback if s.user_id == current_user.id else None}
        for s in submissions
    ]

@router.patch("/task-submissions/{id}/review", response_model=TaskSubmissionResponse)
async def review_submission(
    id: int,
    payload: TaskReviewPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if payload.mentor_score is not None and not (0 <= payload.mentor_score <= 100):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Score must be between 0 and 100")

    def _review():
        sub = db.query(TaskSubmission).filter(TaskSubmission.id == id).first()
        if not sub:
            return None, "not_found", None
        project = sub.task.sprint.project
        if current_user.role != "admin" and (current_user.role != "mentor" or project.mentor_id != current_user.id):
            return None, "forbidden", None
        now = datetime.datetime.now(datetime.timezone.utc)
        sub.mentor_score = payload.mentor_score
        sub.mentor_feedback = payload.mentor_feedback
        sub.reviewed_at = now
        assign = db.query(TaskAssignment).filter(
            TaskAssignment.task_id == sub.task_id, TaskAssignment.user_id == sub.user_id
        ).first()
        if assign:
            assign.status = "needs_improvement" if payload.needs_improvement else "reviewed"
            
        notification_type = "submission_needs_improvement" if payload.needs_improvement else "submission_reviewed"
        notification_msg = f"Mentor requested changes on your submission for '{sub.task.title}'." if payload.needs_improvement else f"Your submission for task '{sub.task.title}' has been graded."
        
        db.add(Notification(
            user_id=sub.user_id, type=notification_type,
            message=notification_msg,
            link=f"/projects/{project.id}/leaderboard"
        ))
        db.commit()
        db.refresh(sub)
        return sub, "ok", sub.user_id

    sub, result, user_id = await asyncio.to_thread(_review)
    if result == "not_found":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
    if result == "forbidden":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    # Badge evaluation runs in thread too (sync DB calls)
    await asyncio.to_thread(evaluate_blocker_crusher, db, user_id)
    await asyncio.to_thread(evaluate_system_architect, db, user_id)
    return sub

@router.post("/task-submissions/{id}/ai-review", response_model=TaskSubmissionResponse)
async def trigger_ai_review(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.services.ai_reviewer import run_ai_pre_review
    
    # 1. Fetch data synchronously
    sub = db.query(TaskSubmission).filter(TaskSubmission.id == id).first()
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
        
    project = sub.task.sprint.project
    if current_user.role != "admin" and (current_user.role != "mentor" or project.mentor_id != current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    # 2. Call AI Service asynchronously
    ai_feedback = await run_ai_pre_review(
        task_title=sub.task.title,
        task_desc=sub.task.description or "",
        repo_url=sub.repo_url or "",
        approach_notes=sub.approach_notes or ""
    )

    # 3. Update DB synchronously
    sub.ai_score = ai_feedback.get("syntax_score", 0) # Fallback mapping if schema isn't exact
    if "overall_summary" not in ai_feedback:
        sub.ai_score = ai_feedback.get("syntax_score", 85)
        
    sub.ai_feedback_json = ai_feedback
    db.commit()
    db.refresh(sub)
    return sub

# --- Phase 2: Task-Level Interactions ---

from app.models.sprint import TaskComment, StuckFlag, PeerReviewRequest
from app.schemas.interaction import (
    TaskCommentCreate, TaskCommentResponse,
    StuckFlagCreate, StuckFlagResponse,
    PeerReviewCreate, PeerReviewResponse
)

@router.get("/tasks/{id}/comments", response_model=List[TaskCommentResponse])
async def get_task_comments(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    def _query():
        task = db.query(Task).filter(Task.id == id).first()
        if not task:
            return None, []
        comments = db.query(TaskComment).filter(
            TaskComment.task_id == id
        ).order_by(TaskComment.created_at.asc()).all()
        return task, comments

    task, comments = await asyncio.to_thread(_query)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return comments

@router.post("/tasks/{id}/comments", response_model=TaskCommentResponse, status_code=status.HTTP_201_CREATED)
async def create_task_comment(
    id: int,
    payload: TaskCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    def _create():
        task = db.query(Task).filter(Task.id == id).first()
        if not task:
            return None, "not_found"
        new_comment = TaskComment(
            task_id=id, user_id=current_user.id,
            content=payload.content, parent_comment_id=payload.parent_comment_id
        )
        db.add(new_comment)
        db.commit()
        db.refresh(new_comment)
        return new_comment, "ok"

    comment, result = await asyncio.to_thread(_create)
    if result == "not_found":
        raise HTTPException(status_code=404, detail="Task not found")
    return comment

@router.post("/tasks/{id}/stuck", response_model=StuckFlagResponse, status_code=status.HTTP_201_CREATED)
async def create_stuck_flag(
    id: int,
    payload: StuckFlagCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    def _create():
        task = db.query(Task).filter(Task.id == id).first()
        if not task:
            return None, "not_found"
        new_flag = StuckFlag(task_id=id, user_id=current_user.id, note=payload.note)
        db.add(new_flag)
        mentor_id = task.sprint.project.mentor_id
        if mentor_id:
            db.add(Notification(
                user_id=mentor_id, type="student_stuck",
                message=f"{current_user.name} is stuck on task '{task.title}'",
                link=f"/projects/{task.sprint.project_id}/tasks/{task.id}"
            ))
        db.commit()
        db.refresh(new_flag)
        return new_flag, "ok"

    flag, result = await asyncio.to_thread(_create)
    if result == "not_found":
        raise HTTPException(status_code=404, detail="Task not found")
    return flag

@router.post("/tasks/{id}/peer-review", response_model=PeerReviewResponse, status_code=status.HTTP_201_CREATED)
async def create_peer_review_request(
    id: int,
    payload: PeerReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if payload.reviewer_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot request peer review from yourself")

    def _create():
        task = db.query(Task).filter(Task.id == id).first()
        if not task:
            return None, "not_found"
        new_request = PeerReviewRequest(
            task_id=id, requester_id=current_user.id, reviewer_id=payload.reviewer_id
        )
        db.add(new_request)
        db.add(Notification(
            user_id=payload.reviewer_id, type="peer_review_requested",
            message=f"{current_user.name} requested your review on task '{task.title}'",
            link="/peer-reviews"
        ))
        db.commit()
        db.refresh(new_request)
        return new_request, "ok"

    request, result = await asyncio.to_thread(_create)
    if result == "not_found":
        raise HTTPException(status_code=404, detail="Task not found")
    return request
