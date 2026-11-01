from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import datetime
from pydantic import BaseModel

from app.deps import get_db, get_current_user
from app.models.user import User
from app.models.sprint import PeerReviewRequest, Task
from app.schemas.interaction import PeerReviewResponse, PeerReviewUpdate

router = APIRouter()

@router.get("", response_model=List[PeerReviewResponse])
@router.get("/incoming", response_model=List[PeerReviewResponse])
def get_incoming_peer_reviews(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns peer review requests where the current user is the reviewer.
    """
    requests = db.query(PeerReviewRequest).filter(
        PeerReviewRequest.reviewer_id == current_user.id
    ).order_by(PeerReviewRequest.created_at.desc()).all()
    
    return requests

@router.get("/outgoing", response_model=List[PeerReviewResponse])
def get_outgoing_peer_reviews(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns peer review requests sent by the current user.
    """
    requests = db.query(PeerReviewRequest).filter(
        PeerReviewRequest.requester_id == current_user.id
    ).order_by(PeerReviewRequest.created_at.desc()).all()
    
    return requests

class PeerReviewSubmitPayload(BaseModel):
    feedback: str
    score: Optional[int] = 90
    badge_nomination: Optional[str] = None

@router.post("/{id}/submit", response_model=PeerReviewResponse)
@router.patch("/{id}", response_model=PeerReviewResponse)
def submit_or_update_peer_review(
    id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Submits feedback and score for a peer review request, awarding karma points.
    """
    review_request = db.query(PeerReviewRequest).filter(PeerReviewRequest.id == id).first()
    if not review_request:
        raise HTTPException(status_code=404, detail="Peer review request not found")
        
    if review_request.reviewer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to review this request")
        
    review_request.status = "reviewed"
    review_request.reviewed_at = datetime.datetime.utcnow()
    
    note_content = payload.get("feedback") or payload.get("review_note") or ""
    score = payload.get("score")
    if score is not None:
        note_content = f"Score: {score}/100. {note_content}"
        
    review_request.review_note = note_content
    
    # Award reviewer karma / skill points
    current_user.skill_points = (current_user.skill_points or 0) + 50
    
    db.commit()
    db.refresh(review_request)
    return review_request
