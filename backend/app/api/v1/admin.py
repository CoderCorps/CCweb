from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any
from pydantic import BaseModel
import asyncio

from app.deps import get_db, get_current_admin, get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.communication import ProjectApprovalMessage
from app.schemas.user import UserResponse
from app.schemas.project import ProjectResponse

from app.models.notification import Notification

router = APIRouter()

class RejectPayload(BaseModel):
    reason: str

# --- MENTORS ---

@router.get("/mentors/pending", response_model=List[UserResponse])
async def get_pending_mentors(db: Session = Depends(get_db), current_admin: User = Depends(get_current_admin)):
    def _query():
        return db.query(User).filter(User.role == "mentor", User.status == "pending").all()
    return await asyncio.to_thread(_query)

@router.post("/mentors/{id}/approve")
async def approve_mentor(id: int, db: Session = Depends(get_db), current_admin: User = Depends(get_current_admin)):
    def _approve():
        user = db.query(User).filter(User.id == id, User.role == "mentor").first()
        if not user:
            return None
        user.status = "active"
        user.rejection_reason = None
        db.add(Notification(
            user_id=user.id,
            type="mentor_approved",
            message="Your mentor application has been approved! You now have full access.",
            link="/dashboard"
        ))
        db.commit()
        return user
    
    user = await asyncio.to_thread(_approve)
    if not user:
        raise HTTPException(status_code=404, detail="Mentor not found")
    return {"status": "success", "message": "Mentor approved"}

@router.post("/mentors/{id}/reject")
async def reject_mentor(id: int, payload: RejectPayload, db: Session = Depends(get_db), current_admin: User = Depends(get_current_admin)):
    def _reject():
        user = db.query(User).filter(User.id == id, User.role == "mentor").first()
        if not user:
            return None
        user.status = "rejected"
        user.rejection_reason = payload.reason
        db.add(Notification(
            user_id=user.id,
            type="mentor_rejected",
            message="Your mentor application was not approved. Please check your email or contact support.",
            link="/mentor/pending-approval"
        ))
        db.commit()
        return user
    
    user = await asyncio.to_thread(_reject)
    if not user:
        raise HTTPException(status_code=404, detail="Mentor not found")
    return {"status": "success", "message": "Mentor rejected"}


# --- PROJECTS ---

@router.get("/projects/pending", response_model=List[ProjectResponse])
async def get_pending_projects(db: Session = Depends(get_db), current_admin: User = Depends(get_current_admin)):
    def _query():
        return db.query(Project).filter(Project.status == "pending_approval").all()
    return await asyncio.to_thread(_query)

@router.post("/projects/{id}/approve")
async def approve_project(id: int, db: Session = Depends(get_db), current_admin: User = Depends(get_current_admin)):
    def _approve():
        project = db.query(Project).filter(Project.id == id).first()
        if not project:
            return None
        project.status = "active"
        project.rejection_reason = None
        if project.mentor_id:
            db.add(Notification(
                user_id=project.mentor_id,
                type="project_approved",
                message=f"Your project '{project.title}' has been approved and is now live!",
                link=f"/projects/{project.id}"
            ))
        db.commit()
        return project
    
    project = await asyncio.to_thread(_approve)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"status": "success", "message": "Project approved"}

@router.post("/projects/{id}/reject")
async def reject_project(id: int, payload: RejectPayload, db: Session = Depends(get_db), current_admin: User = Depends(get_current_admin)):
    def _reject():
        project = db.query(Project).filter(Project.id == id).first()
        if not project:
            return None
        project.status = "rejected"
        project.rejection_reason = payload.reason
        if project.mentor_id:
            db.add(Notification(
                user_id=project.mentor_id,
                type="project_rejected",
                message=f"Your project '{project.title}' requires changes before approval.",
                link=f"/projects/{project.id}/approval-thread"
            ))
        db.commit()
        return project
    
    project = await asyncio.to_thread(_reject)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"status": "success", "message": "Project rejected"}
