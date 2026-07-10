from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import datetime
from pydantic import BaseModel

from app.deps import get_db, get_current_user
from app.models.user import User
from app.models.project import Project, ProjectMember
from app.models.daily_activity import DailyTodo, DailyReport
from app.models.notification import Notification
from app.schemas.daily import (
    DailyTodoResponse, 
    DailyReportResponse, 
    StartDayPayload, 
    TodoStatusUpdate, 
    DailyReportCreate, 
    FeedbackPayload
)

router = APIRouter()

@router.get("/todos", response_model=List[DailyTodoResponse])
def get_daily_todos(
    date: datetime.date, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    todos = db.query(DailyTodo).filter(
        DailyTodo.user_id == current_user.id, 
        DailyTodo.date == date
    ).all()
    return todos

@router.post("/start-day", response_model=List[DailyTodoResponse])
def start_day(
    payload: StartDayPayload, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    # Verify project membership
    member = db.query(ProjectMember).filter(
        ProjectMember.project_id == payload.project_id, 
        ProjectMember.user_id == current_user.id
    ).first()
    if not member and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: You are not a member of this project")
        
    now = datetime.datetime.now(datetime.timezone.utc)
    created_todos = []
    for t in payload.todos:
        todo = DailyTodo(
            user_id=current_user.id,
            project_id=payload.project_id,
            task_id=t.task_id,
            date=payload.date,
            description=t.description,
            status="planned",
            source="assigned" if t.task_id else "self",
            started_at=now,
            created_at=now
        )
        db.add(todo)
        created_todos.append(todo)
        
    db.commit()
    for ct in created_todos:
        db.refresh(ct)
    return created_todos

@router.patch("/todos/{id}", response_model=DailyTodoResponse)
def update_daily_todo(
    id: int, 
    payload: TodoStatusUpdate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    todo = db.query(DailyTodo).filter(DailyTodo.id == id).first()
    if not todo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Daily todo not found")
        
    if todo.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        
    if payload.status not in ["planned", "in_progress", "done", "carried_over"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")
        
    todo.status = payload.status
    db.commit()
    db.refresh(todo)
    return todo

@router.post("/reports")
def create_daily_report(
    payload: DailyReportCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == payload.project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
        
    member = db.query(ProjectMember).filter(
        ProjectMember.project_id == payload.project_id, 
        ProjectMember.user_id == current_user.id
    ).first()
    if not member and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        
    existing = db.query(DailyReport).filter(
        DailyReport.user_id == current_user.id,
        DailyReport.project_id == payload.project_id,
        DailyReport.date == payload.date
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Report already submitted for this date")
        
    mentor_id = project.mentor_id
    now = datetime.datetime.now(datetime.timezone.utc)
    
    report = DailyReport(
        user_id=current_user.id,
        project_id=payload.project_id,
        date=payload.date,
        summary=payload.summary,
        blockers=payload.blockers,
        links=payload.links,
        hours_spent=payload.hours_spent,
        mentor_id=mentor_id,
        submitted_at=now
    )
    db.add(report)
    
    # Trigger notification to mentor
    if mentor_id:
        notif = Notification(
            user_id=mentor_id,
            type="report_submitted",
            message=f"Student {current_user.name} submitted a daily standup report.",
            link=f"/mentor/reports"
        )
        db.add(notif)
        
    db.commit()
    db.refresh(report)
    return report

@router.get("/reports", response_model=List[DailyReportResponse])
def get_daily_reports(
    project_id: Optional[int] = None,
    date_from: Optional[datetime.date] = None,
    date_to: Optional[datetime.date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(DailyReport)
    
    if current_user.role == "admin":
        pass
    elif current_user.role == "mentor":
        query = query.filter(DailyReport.mentor_id == current_user.id)
    else:
        query = query.filter(DailyReport.user_id == current_user.id)
        
    if project_id:
        query = query.filter(DailyReport.project_id == project_id)
    if date_from:
        query = query.filter(DailyReport.date >= date_from)
    if date_to:
        query = query.filter(DailyReport.date <= date_to)
        
    reports = query.order_by(DailyReport.date.desc()).all()
    
    # Mark read if mentor retrieves
    if current_user.role == "mentor":
        now = datetime.datetime.now(datetime.timezone.utc)
        for r in reports:
            if r.mentor_id == current_user.id and r.mentor_read_at is None:
                r.mentor_read_at = now
        db.commit()
        
    res = []
    for r in reports:
        todos = db.query(DailyTodo).filter(
            DailyTodo.user_id == r.user_id,
            DailyTodo.project_id == r.project_id,
            DailyTodo.date == r.date
        ).all()
        res.append({
            "id": r.id,
            "user_id": r.user_id,
            "user_name": r.user.name,
            "project_id": r.project_id,
            "date": r.date,
            "summary": r.summary,
            "blockers": r.blockers,
            "links": r.links,
            "hours_spent": r.hours_spent,
            "mentor_id": r.mentor_id,
            "submitted_at": r.submitted_at,
            "mentor_feedback": r.mentor_feedback,
            "mentor_read_at": r.mentor_read_at,
            "todos": [
                {"id": t.id, "description": t.description, "status": t.status, "source": t.source}
                for t in todos
            ]
        })
    return res

@router.patch("/reports/{id}/feedback")
def add_report_feedback(
    id: int, 
    payload: FeedbackPayload, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    report = db.query(DailyReport).filter(DailyReport.id == id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
        
    if current_user.role != "admin" and (current_user.role != "mentor" or report.mentor_id != current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        
    now = datetime.datetime.now(datetime.timezone.utc)
    report.mentor_feedback = payload.feedback
    if report.mentor_read_at is None:
        report.mentor_read_at = now
        
    # Trigger notification to student
    notif = Notification(
        user_id=report.user_id,
        type="feedback_added",
        message=f"Mentor left feedback on your daily report for {report.date.isoformat()}.",
        link=f"/today"
    )
    db.add(notif)
        
    db.commit()
    db.refresh(report)
    return report

@router.get("/reports/missing")
def get_missing_reports(
    project_id: int, 
    date: datetime.date, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
        
    if current_user.role != "admin" and (current_user.role != "mentor" or project.mentor_id != current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        
    # Get contributor student IDs
    members = db.query(ProjectMember).filter(ProjectMember.project_id == project_id, ProjectMember.role == "contributor").all()
    student_ids = [m.user_id for m in members]
    
    # Get students who submitted reports
    submitted_student_ids = db.query(DailyReport.user_id).filter(
        DailyReport.project_id == project_id,
        DailyReport.date == date
    ).all()
    submitted_ids = [s[0] for s in submitted_student_ids]
    
    missing_ids = [sid for sid in student_ids if sid not in submitted_ids]
    missing_users = db.query(User).filter(User.id.in_(missing_ids)).all()
    
    return [
        {"id": u.id, "name": u.name, "email": u.email, "avatar_url": u.avatar_url}
        for u in missing_users
    ]
