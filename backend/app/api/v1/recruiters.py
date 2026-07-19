from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
import asyncio
from pydantic import BaseModel, ConfigDict
from app.deps import get_db
from app.models.user import User, Profile
from app.models.sprint import TaskSubmission
from app.models.skill import SkillNode, UserSkill
from app.schemas.user import UserResponse

router = APIRouter()

class RecruiterCandidateResponse(BaseModel):
    user: UserResponse
    skills: List[str]
    skill_points: int
    bio: Optional[str]
    github_url: Optional[str]
    linkedin_url: Optional[str]
    top_submissions: List[dict]

    model_config = ConfigDict(from_attributes=True)

@router.get("/candidates", response_model=List[RecruiterCandidateResponse])
async def search_candidates(
    skill: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Returns public candidate profiles, optionally filtered by skill."""
    def _query():
        query = db.query(User).join(Profile).filter(Profile.is_public == True, User.role == "student")
        if skill:
            query = query.join(UserSkill).join(SkillNode).filter(SkillNode.name.ilike(f"%{skill}%"))
        users = query.order_by(User.skill_points.desc()).limit(50).all()

        results = []
        for u in users:
            subs = db.query(TaskSubmission).filter(
                TaskSubmission.user_id == u.id,
                TaskSubmission.mentor_score != None
            ).order_by(TaskSubmission.mentor_score.desc()).limit(2).all()

            top_subs = [
                {
                    "task_title": s.task.title,
                    "repo_url": s.repo_url,
                    "score": s.mentor_score,
                    "ai_score": s.ai_score
                } for s in subs
            ]

            profile_skills = [us.skill.name for us in u.skills if us.skill] if u.skills else []

            results.append({
                "user": u,
                "skills": profile_skills,
                "skill_points": u.skill_points,
                "bio": u.profile.bio if u.profile else None,
                "github_url": u.profile.github_url if u.profile else None,
                "linkedin_url": u.profile.linkedin_url if u.profile else None,
                "top_submissions": top_subs
            })
        return results

    return await asyncio.to_thread(_query)

@router.get("/candidates/{user_id}/portfolio")
async def get_candidate_portfolio(user_id: int, db: Session = Depends(get_db)):
    """Returns aggregated proof-of-work (completed tasks, PRs, CI results, AI scores)."""
    def _query():
        user = db.query(User).filter(User.id == user_id, User.role == "student").first()
        if not user:
            return None, []
        submissions = db.query(TaskSubmission).filter(TaskSubmission.user_id == user_id).all()
        return user, submissions

    user, submissions = await asyncio.to_thread(_query)
    if not user:
        raise HTTPException(status_code=404, detail="Candidate not found")

    portfolio = [
        {
            "task_id": s.task_id,
            "task_title": s.task.title,
            "repo_url": s.repo_url,
            "demo_url": s.demo_url,
            "ci_status": s.task.ci_status,
            "test_coverage": s.task.test_coverage,
            "mentor_score": s.mentor_score,
            "ai_score": s.ai_score,
            "ai_feedback": s.ai_feedback_json,
            "submitted_at": s.submitted_at
        }
        for s in submissions
    ]

    profile_skills = [{"name": us.skill.name, "level": us.proficiency_level} for us in user.skills if us.skill]

    return {
        "candidate_name": user.name,
        "github_url": user.profile.github_url if user.profile else None,
        "skills": profile_skills,
        "portfolio": portfolio
    }
