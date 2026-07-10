from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict
from typing import Any, Dict, Optional
import datetime

from app.deps import get_db
from app.models.submission import Certificate
from app.models.user import User

router = APIRouter()

class CertificatePublicResponse(BaseModel):
    id: int
    holder_name: str
    project_title: Optional[str] = None
    issued_at: datetime.datetime
    criteria_met: Dict[str, Any]
    mentor_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

@router.get("/{cert_id}", response_model=CertificatePublicResponse)
def get_certificate(cert_id: int, db: Session = Depends(get_db)):
    """
    Public, unauthenticated route.
    Returns verifiable certificate data — holder name, project title, mentor name,
    issued date, and criteria JSON. No private user data (email, etc.) is exposed.
    """
    cert = db.query(Certificate).filter(Certificate.id == cert_id).first()
    if not cert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificate not found"
        )

    holder = db.query(User).filter(User.id == cert.user_id).first()
    mentor_name = cert.criteria_met.get("mentor_name") if cert.criteria_met else None

    return CertificatePublicResponse(
        id=cert.id,
        holder_name=holder.name if holder else "Unknown",
        project_title=cert.project.title if cert.project else cert.criteria_met.get("project_title"),
        issued_at=cert.issued_at,
        criteria_met=cert.criteria_met or {},
        mentor_name=mentor_name
    )
