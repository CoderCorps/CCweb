from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import datetime
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
    mode: str # 'individual' | 'competitive'

class AssignmentStatusUpdate(BaseModel):
    status: str # 'assigned' | 'in_progress' | 'submitted' | 'reviewed'

class TaskSubmissionCreate(BaseModel):
    repo_url: Optional[str] = None
    demo_url: Optional[str] = None
    approach_notes: Optional[str] = None

class TaskReviewPayload(BaseModel):
    mentor_score: int
    mentor_feedback: Optional[str] = None

# --- Endpoints ---

@router.post("/tasks/{id}/assign")
def assign_task(
    id: int, 
    payload: AssignPayload, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    task = db.query(Task).filter(Task.id == id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    
    project = task.sprint.project
    if current_user.role != "admin" and (current_user.role != "mentor" or project.mentor_id != current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: You do not manage this project")
    
    if payload.mode not in ["individual", "competitive"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid mode")
    
    # Update task mode
    task.task_mode = payload.mode
    
    # Clear existing assignments
    db.query(TaskAssignment).filter(TaskAssignment.task_id == id).delete()
    
    now = datetime.datetime.now(datetime.timezone.utc)
    for uid in payload.user_ids:
        # Verify student exists and is member of the project
        member = db.query(ProjectMember).filter(ProjectMember.project_id == project.id, ProjectMember.user_id == uid).first()
        if not member:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"User {uid} is not a member of this project")
        
        assign = TaskAssignment(
            task_id=id,
            user_id=uid,
            assigned_by_id=current_user.id,
            assigned_at=now,
            status="assigned"
        )
        db.add(assign)
        
        # Trigger notification to student
        notif = Notification(
            user_id=uid,
            type="task_assigned",
            message=f"You have been assigned a new task: {task.title}",
            link=f"/projects/{project.id}"
        )
        db.add(notif)
        
    db.commit()
    return {"status": "success", "message": f"Successfully assigned task {id} to users."}

@router.get("/tasks/{id}/assignments", response_model=List[TaskAssignmentResponse])
def get_task_assignments(
    id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    task = db.query(Task).filter(Task.id == id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    
    project = task.sprint.project
    is_member = db.query(ProjectMember).filter(ProjectMember.project_id == project.id, ProjectMember.user_id == current_user.id).first() is not None
    if current_user.role != "admin" and project.mentor_id != current_user.id and not is_member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        
    return db.query(TaskAssignment).filter(TaskAssignment.task_id == id).all()

@router.patch("/task-assignments/{id}", response_model=TaskAssignmentResponse)
def update_task_assignment(
    id: int, 
    payload: AssignmentStatusUpdate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    assign = db.query(TaskAssignment).filter(TaskAssignment.id == id).first()
    if not assign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task assignment not found")
        
    project = assign.task.sprint.project
    is_assigned_student = assign.user_id == current_user.id
    is_mentor = project.mentor_id == current_user.id
    is_admin = current_user.role == "admin"
    
    if not (is_assigned_student or is_mentor or is_admin):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: Cannot update this task assignment")
        
    if payload.status not in ["assigned", "in_progress", "submitted", "reviewed"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")
        
    assign.status = payload.status
    db.commit()
    db.refresh(assign)
    return assign

@router.post("/tasks/{id}/submissions", response_model=TaskSubmissionResponse, status_code=status.HTTP_201_CREATED)
def submit_task(
    id: int, 
    payload: TaskSubmissionCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    task = db.query(Task).filter(Task.id == id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
        
    # Check if student is assigned
    assign = db.query(TaskAssignment).filter(TaskAssignment.task_id == id, TaskAssignment.user_id == current_user.id).first()
    if not assign:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: You are not assigned to this task")
        
    now = datetime.datetime.now(datetime.timezone.utc)
    sub = TaskSubmission(
        task_id=id,
        user_id=current_user.id,
        repo_url=payload.repo_url,
        demo_url=payload.demo_url,
        approach_notes=payload.approach_notes,
        submitted_at=now
    )
    db.add(sub)
    
    # Auto-update status to 'submitted'
    assign.status = "submitted"
    db.commit()
    db.refresh(sub)
    return sub

@router.get("/tasks/{id}/submissions")
def get_task_submissions(
    id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    task = db.query(Task).filter(Task.id == id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
        
    project = task.sprint.project
    is_mentor = project.mentor_id == current_user.id
    is_admin = current_user.role == "admin"
    
    submissions = db.query(TaskSubmission).filter(TaskSubmission.task_id == id).all()
    
    if is_mentor or is_admin:
        return [
            {
                "id": s.id,
                "task_id": s.task_id,
                "user_id": s.user_id,
                "user_name": s.user.name,
                "repo_url": s.repo_url,
                "demo_url": s.demo_url,
                "approach_notes": s.approach_notes,
                "submitted_at": s.submitted_at,
                "mentor_score": s.mentor_score,
                "mentor_feedback": s.mentor_feedback,
                "reviewed_at": s.reviewed_at
            }
            for s in submissions
        ]
        
    # Check if student is assigned
    assign = db.query(TaskAssignment).filter(TaskAssignment.task_id == id, TaskAssignment.user_id == current_user.id).first()
    if not assign:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        
    # Check if all submissions have been reviewed (to allow seeing approach notes)
    all_reviewed = len(submissions) > 0 and all(s.mentor_score is not None for s in submissions)
    
    if not all_reviewed:
        # Student can only see their own
        student_subs = [s for s in submissions if s.user_id == current_user.id]
        return [
            {
                "id": s.id,
                "task_id": s.task_id,
                "user_id": s.user_id,
                "user_name": s.user.name,
                "repo_url": s.repo_url,
                "demo_url": s.demo_url,
                "approach_notes": s.approach_notes,
                "submitted_at": s.submitted_at,
                "mentor_score": s.mentor_score,
                "mentor_feedback": s.mentor_feedback,
                "reviewed_at": s.reviewed_at
            }
            for s in student_subs
        ]
        
    # If reviewed, show everyone's approach notes, but hide scores for others
    return [
        {
            "id": s.id,
            "task_id": s.task_id,
            "user_id": s.user_id,
            "user_name": s.user.name,
            "repo_url": s.repo_url,
            "demo_url": s.demo_url,
            "approach_notes": s.approach_notes,
            "submitted_at": s.submitted_at,
            "mentor_score": s.mentor_score if s.user_id == current_user.id else None,
            "mentor_feedback": s.mentor_feedback if s.user_id == current_user.id else None,
            "reviewed_at": s.reviewed_at
        }
        for s in submissions
    ]

@router.patch("/submissions/{id}/review", response_model=TaskSubmissionResponse)
def review_submission(
    id: int, 
    payload: TaskReviewPayload, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    sub = db.query(TaskSubmission).filter(TaskSubmission.id == id).first()
    if not sub:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
        
    project = sub.task.sprint.project
    if current_user.role != "admin" and (current_user.role != "mentor" or project.mentor_id != current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: You do not manage this project")
        
    if not (0 <= payload.mentor_score <= 100):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Score must be between 0 and 100")
        
    now = datetime.datetime.now(datetime.timezone.utc)
    sub.mentor_score = payload.mentor_score
    sub.mentor_feedback = payload.mentor_feedback
    sub.reviewed_at = now
    
    # Auto-update corresponding assignment status to 'reviewed'
    assign = db.query(TaskAssignment).filter(TaskAssignment.task_id == sub.task_id, TaskAssignment.user_id == sub.user_id).first()
    if assign:
        assign.status = "reviewed"
        
    # Trigger notification to student
    notif = Notification(
        user_id=sub.user_id,
        type="submission_reviewed",
        message=f"Your submission for task '{sub.task.title}' has been reviewed.",
        link=f"/projects/{project.id}/leaderboard"
    )
    db.add(notif)
        
    db.commit()
    db.refresh(sub)
    
    # Check for badges
    evaluate_blocker_crusher(db, sub.user_id)
    evaluate_system_architect(db, sub.user_id)
    
    return sub
    
# --- Phase 2: Task-Level Interactions ---

from app.models.sprint import TaskComment, StuckFlag, PeerReviewRequest
from app.schemas.interaction import (
    TaskCommentCreate, TaskCommentResponse, 
    StuckFlagCreate, StuckFlagResponse,
    PeerReviewCreate, PeerReviewResponse
)

@router.get("/tasks/{id}/comments", response_model=List[TaskCommentResponse])
def get_task_comments(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(Task).filter(Task.id == id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    comments = db.query(TaskComment).filter(TaskComment.task_id == id).order_by(TaskComment.created_at.asc()).all()
    return comments

@router.post("/tasks/{id}/comments", response_model=TaskCommentResponse, status_code=status.HTTP_201_CREATED)
def create_task_comment(
    id: int,
    payload: TaskCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(Task).filter(Task.id == id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    new_comment = TaskComment(
        task_id=id,
        user_id=current_user.id,
        content=payload.content,
        parent_comment_id=payload.parent_comment_id
    )
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)
    return new_comment

@router.post("/tasks/{id}/stuck", response_model=StuckFlagResponse, status_code=status.HTTP_201_CREATED)
def create_stuck_flag(
    id: int,
    payload: StuckFlagCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(Task).filter(Task.id == id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    new_flag = StuckFlag(
        task_id=id,
        user_id=current_user.id,
        note=payload.note
    )
    db.add(new_flag)
    
    # Notify mentor
    mentor_id = task.sprint.project.mentor_id
    if mentor_id:
        notif = Notification(
            user_id=mentor_id,
            type="student_stuck",
            message=f"{current_user.name} is stuck on task '{task.title}'",
            link=f"/projects/{task.sprint.project_id}/tasks/{task.id}"
        )
        db.add(notif)
        
    db.commit()
    db.refresh(new_flag)
    return new_flag

@router.post("/tasks/{id}/peer-review", response_model=PeerReviewResponse, status_code=status.HTTP_201_CREATED)
def create_peer_review_request(
    id: int,
    payload: PeerReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(Task).filter(Task.id == id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    if payload.reviewer_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot request peer review from yourself")
        
    new_request = PeerReviewRequest(
        task_id=id,
        requester_id=current_user.id,
        reviewer_id=payload.reviewer_id
    )
    db.add(new_request)
    
    notif = Notification(
        user_id=payload.reviewer_id,
        type="peer_review_requested",
        message=f"{current_user.name} requested your review on task '{task.title}'",
        link=f"/peer-reviews"
    )
    db.add(notif)
    
    db.commit()
    db.refresh(new_request)
    return new_request
