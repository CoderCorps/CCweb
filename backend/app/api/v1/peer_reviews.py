from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import datetime

from app.deps import get_db, get_current_user
from app.models.user import User
from app.models.sprint import PeerReviewRequest
from app.schemas.interaction import PeerReviewResponse, PeerReviewUpdate

router = APIRouter()

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

@router.patch("/{id}", response_model=PeerReviewResponse)
def update_peer_review(
    id: int,
    payload: PeerReviewUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Marks a peer review request as reviewed with an optional review note.
    Only the assigned reviewer can perform this action.
    """
    review_request = db.query(PeerReviewRequest).filter(PeerReviewRequest.id == id).first()
    if not review_request:
        raise HTTPException(status_code=404, detail="Peer review request not found")
        
    if review_request.reviewer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this peer review request")
        
    if review_request.status != "reviewed":
        review_request.status = "reviewed"
        review_request.reviewed_at = datetime.datetime.utcnow()
        
    if payload.review_note is not None:
        review_request.review_note = payload.review_note
        
    db.commit()
    db.refresh(review_request)
    return review_request
