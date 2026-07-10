from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Any, List

from app.deps import get_db, get_current_user
from app.models.user import User, Profile
from app.models.project import Project, ProjectMember
from app.models.sprint import Sprint, Task
from app.models.submission import Submission, Certificate

router = APIRouter()

@router.get("/summary", response_model=Dict[str, Any])
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role in ["mentor", "admin"]:
        # --- Mentor Dashboard Statistics ---
        # 1. Projects managed by the mentor
        managed_projects = db.query(Project).filter(Project.mentor_id == current_user.id).all()
        project_ids = [p.id for p in managed_projects]
        
        # 2. Total students under mentorship (in managed projects)
        students_count = 0
        if project_ids:
            students_count = db.query(func.count(func.distinct(ProjectMember.user_id))).filter(
                ProjectMember.project_id.in_(project_ids),
                ProjectMember.user_id != current_user.id # exclude the mentor themselves
            ).scalar() or 0

        # 3. Pending submissions awaiting review in mentor's projects
        pending_submissions_count = 0
        pending_list = []
        if project_ids:
            pending_submissions_count = db.query(func.count(Submission.id)).filter(
                Submission.project_id.in_(project_ids),
                Submission.status == "submitted"
            ).scalar() or 0
            
            pending_db = db.query(Submission).filter(
                Submission.project_id.in_(project_ids),
                Submission.status == "submitted"
            ).all()
            pending_list = [
                {
                    "id": s.id,
                    "project_title": s.project.title,
                    "student_name": s.user.name,
                    "submitted_at": s.created_at.isoformat(),
                    "repo_url": s.repo_url,
                    "demo_url": s.demo_url
                }
                for s in pending_db
            ]

        # 4. Total certificate issuances approved by this mentor
        approved_certificates_count = 0
        if project_ids:
            approved_certificates_count = db.query(func.count(Certificate.id)).filter(
                Certificate.project_id.in_(project_ids)
            ).scalar() or 0

        return {
            "role": current_user.role,
            "stats": {
                "active_projects": len(managed_projects),
                "total_students": students_count,
                "pending_reviews": pending_submissions_count,
                "approved_certificates": approved_certificates_count
            },
            "pending_submissions": pending_list
        }
    else:
        # --- Student Dashboard Statistics ---
        # 1. Projects joined
        memberships = db.query(ProjectMember).filter(ProjectMember.user_id == current_user.id).all()
        project_ids = [m.project_id for m in memberships]
        
        # 2. Tasks completed vs total assigned to the student
        total_tasks = db.query(func.count(Task.id)).filter(Task.assigned_to_id == current_user.id).scalar() or 0
        completed_tasks = db.query(func.count(Task.id)).filter(
            Task.assigned_to_id == current_user.id,
            Task.status == "done"
        ).scalar() or 0

        # 3. Earned certificates
        certificates = db.query(Certificate).filter(Certificate.user_id == current_user.id).all()
        cert_list = [
            {
                "id": c.id,
                "project_title": c.project.title if c.project else "General",
                "issued_at": c.issued_at.isoformat(),
                "criteria": c.criteria_met
            }
            for c in certificates
        ]

        # 4. Active tasks list
        active_tasks_db = db.query(Task).filter(
            Task.assigned_to_id == current_user.id,
            Task.status != "done"
        ).all()
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

        return {
            "role": current_user.role,
            "stats": {
                "active_projects": len(project_ids),
                "tasks_completed": completed_tasks,
                "tasks_total": total_tasks,
                "certificates_earned": len(cert_list)
            },
            "active_tasks": active_tasks_list,
            "certificates": cert_list
        }
