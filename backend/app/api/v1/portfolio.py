from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
import asyncio
import datetime

from typing import List, Optional
from pydantic import BaseModel
from app.deps import get_db, get_current_user
from app.models.user import User, Profile
from app.models.project import Project, ProjectMember
from app.models.sprint import Task, TaskAssignment, TaskSubmission
from app.models.submission import Certificate
from app.schemas.user import UserResponse, PortfolioUpdate
from app.schemas.badge import UserBadge
from app.schemas.submission import CertificateResponse

class ProjectContribution(BaseModel):
    project_id: int
    project_title: str
    project_description: Optional[str] = None
    role: str = "contributor"
    status: str = "active"

class PullRequestContribution(BaseModel):
    id: int
    task_id: int
    task_title: str
    project_id: int
    project_title: str
    github_pr_url: Optional[str] = None
    status: str = "open" # 'merged' | 'review' | 'open'
    difficulty: Optional[str] = None
    submitted_at: Optional[datetime.datetime] = None
    mentor_score: Optional[int] = None

class PRStats(BaseModel):
    total_raised: int = 0
    merged_count: int = 0
    in_review_count: int = 0
    open_count: int = 0
    merge_rate: int = 0

class PortfolioResponse(UserResponse):
    badges: List[UserBadge] = []
    certificates: List[CertificateResponse] = []
    projects: List[ProjectContribution] = []
    pull_requests: List[PullRequestContribution] = []
    pr_stats: Optional[PRStats] = None

router = APIRouter()

@router.get("", response_model=List[str])
async def list_public_portfolios(db: Session = Depends(get_db)):
    users = await asyncio.to_thread(
        lambda: db.query(User).join(User.profile).filter(Profile.is_public == True).all()
    )
    return [u.name.lower().replace(" ", "-") for u in users]


@router.get("/{username}", response_model=PortfolioResponse)
async def get_public_portfolio(username: str, db: Session = Depends(get_db)):
    def _query():
        user = db.query(User).filter(
            func.lower(func.replace(User.name, " ", "-")) == username.lower()
        ).first()
        if not user:
            try:
                user_id = int(username)
                user = db.query(User).filter(User.id == user_id).first()
            except ValueError:
                pass

        if not user or not user.profile or not user.profile.is_public:
            return None

        # Build Project contributions
        memberships = db.query(ProjectMember).filter(ProjectMember.user_id == user.id).all()
        projects_list = []
        for m in memberships:
            proj = m.project
            if proj:
                projects_list.append(ProjectContribution(
                    project_id=proj.id,
                    project_title=proj.title,
                    project_description=proj.description,
                    role=m.role or "contributor",
                    status=proj.status or "active"
                ))

        # Build PR / Task Contributions
        assignments = db.query(TaskAssignment).filter(TaskAssignment.user_id == user.id).all()
        prs_list = []
        for a in assignments:
            task = a.task
            if not task:
                continue

            pr_status = "open"
            if task.status == "done":
                pr_status = "merged"
            elif task.status == "review" or a.status in ("submitted", "reviewed"):
                pr_status = "review"

            # Check for latest task submission
            sub = db.query(TaskSubmission).filter(
                TaskSubmission.task_id == task.id,
                TaskSubmission.user_id == user.id
            ).order_by(TaskSubmission.submitted_at.desc()).first()

            pr_url = task.github_pr_url or (sub.repo_url if sub else None)
            proj_title = task.sprint.project.title if (task.sprint and task.sprint.project) else "Project"
            proj_id = task.sprint.project_id if task.sprint else 1

            prs_list.append(PullRequestContribution(
                id=a.id,
                task_id=task.id,
                task_title=task.title,
                project_id=proj_id,
                project_title=proj_title,
                github_pr_url=pr_url,
                status=pr_status,
                difficulty=task.difficulty,
                submitted_at=sub.submitted_at if sub else a.assigned_at,
                mentor_score=sub.mentor_score if sub else None
            ))

        total_raised = len(prs_list)
        merged_count = sum(1 for p in prs_list if p.status == "merged")
        in_review_count = sum(1 for p in prs_list if p.status == "review")
        open_count = sum(1 for p in prs_list if p.status == "open")
        merge_rate = round((merged_count / total_raised * 100)) if total_raised > 0 else 0

        stats = PRStats(
            total_raised=total_raised,
            merged_count=merged_count,
            in_review_count=in_review_count,
            open_count=open_count,
            merge_rate=merge_rate
        )

        # Build Certificates list with project title
        certs_list = []
        for c in (user.certificates or []):
            if c.revoked:
                continue
            p_title = c.project.title if c.project else (c.criteria_met.get("project_title") if isinstance(c.criteria_met, dict) else "Engineering Capstone")
            certs_list.append(CertificateResponse(
                id=c.id,
                user_id=c.user_id,
                project_id=c.project_id,
                project_title=p_title,
                issued_at=c.issued_at,
                criteria_met=c.criteria_met or {},
                certificate_number=c.certificate_number,
                verification_code=c.verification_code,
                public_url=c.public_url,
                title=c.title or f"Certificate of Completion - {p_title}",
                pdf_url=c.pdf_url,
                revoked=c.revoked
            ))

        return user, projects_list, prs_list, stats, certs_list

    result = await asyncio.to_thread(_query)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Portfolio not found or private")

    user, projects_list, prs_list, stats, certs_list = result

    # Construct complete PortfolioResponse
    return PortfolioResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        avatar_url=user.avatar_url,
        created_at=user.created_at,
        status=user.status,
        rejection_reason=user.rejection_reason,
        last_reminder_sent_at=user.last_reminder_sent_at,
        unlocked_skills=user.unlocked_skills or [],
        skill_points=user.skill_points or 0,
        profile=user.profile,
        badges=user.badges or [],
        certificates=certs_list,
        projects=projects_list,
        pull_requests=prs_list,
        pr_stats=stats
    )

@router.patch("/me", response_model=UserResponse)
async def update_my_portfolio(
    payload: PortfolioUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    def _update():
        if payload.name is not None:
            current_user.name = payload.name
        if payload.email is not None:
            existing = db.query(User).filter(User.email == payload.email, User.id != current_user.id).first()
            if existing:
                return None, "email_taken"
            current_user.email = payload.email
        if payload.avatar_url is not None:
            current_user.avatar_url = payload.avatar_url

        profile = current_user.profile
        if not profile:
            profile = Profile(user_id=current_user.id)
            db.add(profile)
            db.commit()
            db.refresh(profile)

        if payload.bio is not None:
            profile.bio = payload.bio
        if payload.college is not None:
            profile.college = payload.college
        if payload.skills is not None:
            profile.skills = payload.skills
        if payload.github_url is not None:
            profile.github_url = payload.github_url
        if payload.linkedin_url is not None:
            profile.linkedin_url = payload.linkedin_url
        if payload.resume_url is not None:
            profile.resume_url = payload.resume_url
        if payload.is_public is not None:
            profile.is_public = payload.is_public
        if payload.availability is not None:
            profile.availability = payload.availability

        db.commit()
        db.refresh(current_user)
        return current_user, "ok"

    result, status_str = await asyncio.to_thread(_update)
    if status_str == "email_taken":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered by another user")
    return result
