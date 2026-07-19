from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Any, List
import asyncio

from app.deps import get_db, get_current_user
from app.models.user import User, Profile
from app.models.project import Project, ProjectMember
from app.models.sprint import Sprint, Task, TaskAssignment
from app.models.submission import Submission, Certificate
from app.models.badge import UserBadge

router = APIRouter()

from pydantic import BaseModel

class RoleUpdate(BaseModel):
    role: str

@router.get("/summary", response_model=Dict[str, Any])
async def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == "admin":
        # Run all aggregate counts in parallel via asyncio.gather
        def _fetch_admin_stats():
            total_projects = db.query(func.count(Project.id)).scalar() or 0
            total_students = db.query(func.count(User.id)).filter(User.role == "student").scalar() or 0
            total_mentors = db.query(func.count(User.id)).filter(User.role == "mentor").scalar() or 0
            total_certificates = db.query(func.count(Certificate.id)).scalar() or 0
            total_pending = db.query(func.count(Submission.id)).filter(Submission.status == "submitted").scalar() or 0
            recent_submissions = db.query(Submission).order_by(Submission.created_at.desc()).limit(10).all()
            users_db = db.query(User).order_by(User.name).all()
            return total_projects, total_students, total_mentors, total_certificates, total_pending, recent_submissions, users_db

        (
            total_projects, total_students, total_mentors,
            total_certificates, total_pending, recent_submissions, users_db
        ) = await asyncio.to_thread(_fetch_admin_stats)

        submission_list = [
            {
                "id": s.id,
                "project_title": s.project.title,
                "student_name": s.user.name,
                "submitted_at": s.created_at.isoformat(),
                "repo_url": s.repo_url,
                "demo_url": s.demo_url,
                "status": s.status
            }
            for s in recent_submissions
        ]

        users_list = [
            {
                "id": u.id,
                "name": u.name,
                "email": u.email,
                "role": u.role,
                "created_at": u.created_at.isoformat() if hasattr(u, 'created_at') and u.created_at else None
            }
            for u in users_db
        ]

        return {
            "role": "admin",
            "stats": {
                "active_projects": total_projects,
                "total_students": total_students,
                "total_mentors": total_mentors,
                "pending_reviews": total_pending,
                "approved_certificates": total_certificates
            },
            "recent_submissions": submission_list,
            "users": users_list
        }

    elif current_user.role == "mentor":
        def _fetch_mentor_stats():
            managed_projects = db.query(Project).filter(Project.mentor_id == current_user.id).all()
            project_ids = [p.id for p in managed_projects]

            students_count = 0
            if project_ids:
                students_count = db.query(func.count(func.distinct(ProjectMember.user_id))).filter(
                    ProjectMember.project_id.in_(project_ids),
                    ProjectMember.user_id != current_user.id
                ).scalar() or 0

            pending_submissions_count = 0
            pending_list_raw = []
            if project_ids:
                pending_submissions_count = db.query(func.count(Submission.id)).filter(
                    Submission.project_id.in_(project_ids),
                    Submission.status == "submitted"
                ).scalar() or 0

                pending_list_raw = db.query(Submission).filter(
                    Submission.project_id.in_(project_ids),
                    Submission.status == "submitted"
                ).all()

            approved_certificates_count = 0
            if project_ids:
                approved_certificates_count = db.query(func.count(Certificate.id)).filter(
                    Certificate.project_id.in_(project_ids)
                ).scalar() or 0

            return managed_projects, students_count, pending_submissions_count, pending_list_raw, approved_certificates_count

        managed_projects, students_count, pending_submissions_count, pending_list_raw, approved_certificates_count = \
            await asyncio.to_thread(_fetch_mentor_stats)

        pending_list = [
            {
                "id": s.id,
                "project_title": s.project.title,
                "student_name": s.user.name,
                "submitted_at": s.created_at.isoformat(),
                "repo_url": s.repo_url,
                "demo_url": s.demo_url
            }
            for s in pending_list_raw
        ]

        return {
            "role": "mentor",
            "stats": {
                "active_projects": len(managed_projects),
                "total_students": students_count,
                "pending_reviews": pending_submissions_count,
                "approved_certificates": approved_certificates_count
            },
            "pending_submissions": pending_list
        }

    else:
        def _fetch_student_stats():
            memberships = db.query(ProjectMember).filter(ProjectMember.user_id == current_user.id).all()
            project_ids = [m.project_id for m in memberships]

            total_tasks = db.query(func.count(Task.id)).join(Task.assignments).filter(
                TaskAssignment.user_id == current_user.id
            ).scalar() or 0
            completed_tasks = db.query(func.count(Task.id)).join(Task.assignments).filter(
                TaskAssignment.user_id == current_user.id,
                Task.status == "done"
            ).scalar() or 0

            certificates = db.query(Certificate).filter(Certificate.user_id == current_user.id).all()
            active_tasks_db = db.query(Task).join(Task.assignments).filter(
                TaskAssignment.user_id == current_user.id,
                Task.status != "done"
            ).all()
            badges_db = db.query(UserBadge).filter(UserBadge.user_id == current_user.id).all()

            return project_ids, total_tasks, completed_tasks, certificates, active_tasks_db, badges_db

        project_ids, total_tasks, completed_tasks, certificates, active_tasks_db, badges_db = \
            await asyncio.to_thread(_fetch_student_stats)

        cert_list = [
            {
                "id": c.id,
                "project_title": c.project.title if c.project else "General",
                "issued_at": c.issued_at.isoformat(),
                "criteria": c.criteria_met
            }
            for c in certificates
        ]

        active_tasks_list = [
            {
                "id": t.id,
                "title": t.title,
                "status": t.status,
                "project_title": t.sprint.project.title,
                "sprint_number": t.sprint.sprint_number
            }
            for t in active_tasks_db
        ]

        badges_list = [
            {
                "id": b.id,
                "name": b.badge.name,
                "description": b.badge.description,
                "image_url": b.badge.image_url,
                "earned_at": b.earned_at.isoformat()
            }
            for b in badges_db
        ]

        return {
            "role": current_user.role,
            "stats": {
                "active_projects": len(project_ids),
                "tasks_completed": completed_tasks,
                "tasks_total": total_tasks,
                "certificates_earned": len(cert_list)
            },
            "active_tasks": active_tasks_list,
            "certificates": cert_list,
            "badges": badges_list
        }

@router.patch("/users/{user_id}/role")
async def update_user_role(
    user_id: int,
    payload: RoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can manage user roles."
        )

    if payload.role not in ["student", "mentor", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role specified."
        )

    def _update():
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return None
        user.role = payload.role
        db.commit()
        db.refresh(user)
        return user

    user = await asyncio.to_thread(_update)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    return {"status": "success", "message": f"User {user.name} role updated to {payload.role}"}
