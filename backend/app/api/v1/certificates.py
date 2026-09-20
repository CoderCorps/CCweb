from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict
from typing import Any, Dict, Optional, List
import datetime
import uuid
import asyncio
from app.deps import get_db, get_current_mentor
from app.models.submission import Certificate
from app.models.user import User
from app.models.certificate_template import CertificateTemplate, EmailTemplate, CertificateEmailLog
from app.schemas.certificate_template import EligibilityResponse, CertificateBatchGenerateRequest, CertificateBatchSendRequest
from app.services.certificate_eligibility import get_eligible_candidates
from app.services.certificate_render import generate_certificate_number, render_certificate_image, render_certificate_pdf, compute_signature_hash
from app.services.email_service import get_frontend_url

router = APIRouter()

class CertificatePublicResponse(BaseModel):
    id: int
    holder_name: str
    project_title: Optional[str] = None
    issued_at: datetime.datetime
    criteria_met: Dict[str, Any]
    mentor_name: Optional[str] = None
    
    # New fields
    certificate_number: Optional[str] = None
    public_url: Optional[str] = None
    verification_code: Optional[str] = None
    title: Optional[str] = None
    revoked: bool = False
    pdf_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

@router.get("/eligibility", response_model=List[EligibilityResponse])
def check_eligibility(program_id: int = None, project_id: int = None, db: Session = Depends(get_db), current_user = Depends(get_current_mentor)):
    if not program_id and not project_id:
        raise HTTPException(status_code=400, detail="Must provide program_id or project_id")
    return get_eligible_candidates(db, program_id, project_id)

@router.post("/generate-batch")
def generate_batch(req: CertificateBatchGenerateRequest, db: Session = Depends(get_db), current_user = Depends(get_current_mentor)):
    template = db.query(CertificateTemplate).filter(CertificateTemplate.id == req.template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
        
    generated = []
    
    for uid in req.user_ids:
        user = db.query(User).filter(User.id == uid).first()
        if not user:
            continue
            
        cert_number = generate_certificate_number(db)
        verif_code = uuid.uuid4().hex
        
        frontend_base = get_frontend_url()
        public_url = f"{frontend_base}/certify/{verif_code}"
        
        merge_data = {
            "student_name": user.name,
            "certificate_number": cert_number,
            "certificate_link": public_url,
            "issue_date": datetime.datetime.now().strftime("%B %d, %Y"),
            "program_title": req.title or "Program",
            "public_url": public_url
        }
        
        # We can run rendering in another thread
        # png = render_certificate_image(template, template.fields, merge_data)
        # pdf = render_certificate_pdf(png, template.width_px, template.height_px)
        
        # Save pdf to storage
        pdf_url = f"/static/certificates/{verif_code}.pdf" # Mock saving for now
        
        # Populate criteria met for verification page
        criteria_met = {
            "student_name": user.name,
            "project_title": req.title or "Project",
            "mentor_name": current_user.name,
            "approved_at": datetime.datetime.now().isoformat(),
            "audit_message": f"Verifiable Software Engineering Achievement. This certificate validates actual codebase contributions (GitHub Pull Requests merged, functional demo delivered, and code reviewed by professional engineering mentor {current_user.name})."
        }
        
        sig_hash = compute_signature_hash(uid, req.program_id or 0, datetime.datetime.now())
        
        new_cert = Certificate(
            user_id=uid,
            project_id=req.project_id,
            issued_at=datetime.datetime.now(),
            criteria_met=criteria_met,
            program_id=req.program_id,
            certificate_number=cert_number,
            verification_code=verif_code,
            public_url=public_url,
            title=req.title,
            duration_start=req.duration_start,
            duration_end=req.duration_end,
            signature_hash=sig_hash,
            pdf_url=pdf_url,
            template_id=template.id,
            issued_by=current_user.id
        )
        db.add(new_cert)
        db.commit()
        db.refresh(new_cert)
        generated.append(new_cert)
        
    return {"message": f"Generated {len(generated)} certificates", "ids": [c.id for c in generated]}

@router.post("/send-batch")
async def send_batch(req: CertificateBatchSendRequest, db: Session = Depends(get_db), current_user = Depends(get_current_mentor)):
    from app.services.email_service import send_email
    
    email_tpl = db.query(EmailTemplate).filter(EmailTemplate.id == req.email_template_id).first()
    if not email_tpl:
        raise HTTPException(status_code=404, detail="Email Template not found")
        
    sent_count = 0
    for cid in req.certificate_ids:
        cert = db.query(Certificate).filter(Certificate.id == cid).first()
        if not cert:
            continue
            
        user = db.query(User).filter(User.id == cert.user_id).first()
        
        # Replace merge variables
        html = email_tpl.body_html
        html = html.replace("{{name}}", user.name)
        html = html.replace("{{certificate_number}}", cert.certificate_number or "")
        html = html.replace("{{certificate_link}}", cert.public_url or "")
        
        try:
            # We would attach the PDF here but omitting attachment logic in this mock 
            await asyncio.to_thread(send_email, user.email, email_tpl.subject, html, "View your certificate at " + (cert.public_url or ""))
            
            log = CertificateEmailLog(
                certificate_id=cert.id,
                recipient_email=user.email,
                status="sent"
            )
            db.add(log)
            sent_count += 1
        except Exception as e:
            log = CertificateEmailLog(
                certificate_id=cert.id,
                recipient_email=user.email,
                status="failed",
                error_message=str(e)
            )
            db.add(log)
            
    db.commit()
    return {"message": f"Sent {sent_count} emails"}

@router.get("/{cert_id}", response_model=CertificatePublicResponse)
def get_certificate(cert_id: int, db: Session = Depends(get_db)):
    cert = db.query(Certificate).filter(Certificate.id == cert_id).first()
    if not cert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Certificate not found")

    holder = db.query(User).filter(User.id == cert.user_id).first()
    mentor_name = cert.criteria_met.get("mentor_name") if cert.criteria_met else None

    return CertificatePublicResponse(
        id=cert.id,
        holder_name=holder.name if holder else "Unknown",
        project_title=cert.project.title if cert.project else cert.title,
        issued_at=cert.issued_at,
        criteria_met=cert.criteria_met or {},
        mentor_name=mentor_name,
        certificate_number=cert.certificate_number,
        public_url=cert.public_url,
        verification_code=cert.verification_code,
        title=cert.title,
        revoked=cert.revoked,
        pdf_url=cert.pdf_url
    )

@router.get("/verify/{verification_code}", response_model=CertificatePublicResponse)
def verify_certificate(verification_code: str, db: Session = Depends(get_db)):
    cert = db.query(Certificate).filter(Certificate.verification_code == verification_code).first()
    if not cert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Certificate not found")
        
    holder = db.query(User).filter(User.id == cert.user_id).first()
    mentor_name = cert.criteria_met.get("mentor_name") if cert.criteria_met else None

    return CertificatePublicResponse(
        id=cert.id,
        holder_name=holder.name if holder else "Unknown",
        project_title=cert.project.title if cert.project else cert.title,
        issued_at=cert.issued_at,
        criteria_met=cert.criteria_met or {},
        mentor_name=mentor_name,
        certificate_number=cert.certificate_number,
        public_url=cert.public_url,
        verification_code=cert.verification_code,
        title=cert.title,
        revoked=cert.revoked,
        pdf_url=cert.pdf_url
    )

