from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from app.db.session import get_db
from app.models.user import User, Profile
from app.models.sprint import TaskSubmission
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
def search_candidates(
    skill: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Returns public candidate profiles. If 'skill' is provided, filters the JSON unlocked_skills array.
    """
    query = db.query(User).join(Profile).filter(Profile.is_public == True, User.role == "student")
    
    if skill:
        # In a real app we'd use JSON operations depending on dialect. For SQLite/Postgres we can use simple string matching as a fallback for JSON lists.
        query = query.filter(User.unlocked_skills.cast(str).ilike(f"%{skill}%"))
        
    users = query.order_by(User.skill_points.desc()).limit(50).all()
    
    results = []
    for u in users:
        # Get their top 2 mentor-scored submissions
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
        
        profile_skills = u.profile.skills if u.profile and u.profile.skills else []
        
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
