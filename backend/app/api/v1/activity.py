from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List

from app.deps import get_db
from app.models.activity import ActivityEvent
from app.schemas.activity import ActivityEventResponse

router = APIRouter()

@router.get("/recent", response_model=List[ActivityEventResponse])
def get_recent_activity(
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Public endpoint — returns the most recent N activity events.
    Used by the homepage activity feed.
    """
    events = (
        db.query(ActivityEvent)
        .order_by(ActivityEvent.created_at.desc())
        .limit(limit)
        .all()
    )

    result = []
    for ev in events:
        result.append(ActivityEventResponse(
            id=ev.id,
            event_type=ev.event_type,
            actor_name=ev.actor.name if ev.actor else "Unknown",
            actor_avatar_url=ev.actor.avatar_url if ev.actor else None,
            project_id=ev.project_id,
            project_title=ev.project.title if ev.project else (ev.event_metadata or {}).get("project_title"),
            created_at=ev.created_at,
            metadata=ev.event_metadata or {}
        ))

    return result
