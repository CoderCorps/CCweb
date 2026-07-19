from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any
import asyncio

from app.deps import get_db, get_current_user, get_current_user_unverified
from app.models.user import User
from app.models.project import Project, ProjectMember
from app.models.sprint import Sprint, Task
from app.models.submission import Submission
from app.core.config import settings

router = APIRouter()

from app.models.notification import Notification
import datetime

@router.post("/me/notify-admin")
async def notify_admin(db: Session = Depends(get_db), current_user: User = Depends(get_current_user_unverified)):
    if current_user.role != "mentor" or current_user.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only pending mentors can notify admins."
        )

    now = datetime.datetime.now(datetime.timezone.utc)
    
    # created_at might be naive in sqlite but we use postgres, let's ensure UTC comparison
    created_at = current_user.created_at.replace(tzinfo=datetime.timezone.utc) if current_user.created_at.tzinfo is None else current_user.created_at
    
    cooldown = settings.MENTOR_APPROVAL_COOLDOWN_SECONDS

    if (now - created_at).total_seconds() < cooldown:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"You must wait {cooldown} seconds since signup to notify an admin."
        )

    if current_user.last_reminder_sent_at:
        last_rem = current_user.last_reminder_sent_at.replace(tzinfo=datetime.timezone.utc) if current_user.last_reminder_sent_at.tzinfo is None else current_user.last_reminder_sent_at
        if (now - last_rem).total_seconds() < cooldown:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"You can only send one reminder every {cooldown} seconds."
            )

    def _notify():
        admins = db.query(User).filter(User.role == "admin").all()
        for admin in admins:
            db.add(Notification(
                user_id=admin.id,
                type="mentor_reminder",
                message=f"Mentor {current_user.name} is waiting for approval.",
                link="/admin/mentors/pending"
            ))
        current_user.last_reminder_sent_at = now
        db.commit()
        return current_user.last_reminder_sent_at

    new_timestamp = await asyncio.to_thread(_notify)
    return {
        "status": "success", 
        "message": "Admin has been notified.",
        "last_reminder_sent_at": new_timestamp.isoformat()
    }

@router.get("/{id}/students", response_model=List[Dict[str, Any]])
async def get_mentor_students(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Role guard: only mentors/admins can call it
    if current_user.role not in ["mentor", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Only mentors and administrators can view student rosters."
        )
    
    # Optional: if they are a mentor, they can only view their own student roster unless they are an admin
    if current_user.role == "mentor" and current_user.id != id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Mentors can only view their own student rosters."
        )
    
    def _query():
        projects = db.query(Project).filter(Project.mentor_id == id).all()
        return projects

    projects = await asyncio.to_thread(_query)
    project_ids = [p.id for p in projects]
    
    if not project_ids:
        return []
    
    def _fetch_members():
        memberships = db.query(ProjectMember).filter(
            ProjectMember.project_id.in_(project_ids)
        ).all()
        student_ids = list(set([m.user_id for m in memberships]))
        students = db.query(User).filter(
            User.id.in_(student_ids),
            User.id != id
        ).all()
        return memberships, students

    _, students = await asyncio.to_thread(_fetch_members)
    
    def _build_result():
        result = []
        for student in students:
            student_project = None
            for p in projects:
                is_member = db.query(ProjectMember).filter(
                    ProjectMember.project_id == p.id,
                    ProjectMember.user_id == student.id
                ).first()
                if is_member:
                    student_project = p
                    break

            project_title = student_project.title if student_project else "None"
            project_id = student_project.id if student_project else None

            latest_sprint = None
            if project_id:
                latest_sprint = db.query(Sprint).filter(
                    Sprint.project_id == project_id
                ).order_by(Sprint.sprint_number.desc()).first()

            sprint_number = latest_sprint.sprint_number if latest_sprint else 1
            sprint_id = latest_sprint.id if latest_sprint else None

            tasks_in_progress = 0
            if sprint_id:
                tasks_in_progress = db.query(func.count(Task.id)).filter(
                    Task.sprint_id == sprint_id,
                    Task.assigned_to_id == student.id,
                    Task.status != "done"
                ).scalar() or 0

            last_submission = None
            if project_id:
                last_submission = db.query(Submission).filter(
                    Submission.project_id == project_id,
                    Submission.user_id == student.id
                ).order_by(Submission.created_at.desc()).first()

            last_activity_date = last_submission.created_at.isoformat() if last_submission else student.created_at.isoformat()
            slug = student.name.lower().replace(" ", "-")

            result.append({
                "id": student.id,
                "name": student.name,
                "email": student.email,
                "college": student.profile.college if student.profile else "",
                "avatar_url": student.avatar_url,
                "project_title": project_title,
                "sprint_number": sprint_number,
                "tasks_in_progress": tasks_in_progress,
                "last_activity_date": last_activity_date,
                "portfolio_slug": slug
            })
        return result

    return await asyncio.to_thread(_build_result)

