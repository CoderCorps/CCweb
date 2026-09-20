from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.deps import get_db, get_current_mentor
from app.models.certificate_template import EmailTemplate
from app.schemas.certificate_template import EmailTemplateCreate, EmailTemplateUpdate, EmailTemplateResponse
from typing import List

router = APIRouter()

@router.post("", response_model=EmailTemplateResponse)
def create_email_template(template: EmailTemplateCreate, db: Session = Depends(get_db), current_user = Depends(get_current_mentor)):
    db_template = EmailTemplate(
        name=template.name,
        subject=template.subject,
        body_html=template.body_html,
        type=template.type,
        created_by=current_user.id
    )
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template

@router.get("", response_model=List[EmailTemplateResponse])
def get_email_templates(db: Session = Depends(get_db), current_user = Depends(get_current_mentor)):
    return db.query(EmailTemplate).all()

@router.get("/{id}", response_model=EmailTemplateResponse)
def get_email_template(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_mentor)):
    template = db.query(EmailTemplate).filter(EmailTemplate.id == id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template

@router.patch("/{id}", response_model=EmailTemplateResponse)
def update_email_template(id: int, update_data: EmailTemplateUpdate, db: Session = Depends(get_db), current_user = Depends(get_current_mentor)):
    template = db.query(EmailTemplate).filter(EmailTemplate.id == id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
        
    if update_data.name is not None:
        template.name = update_data.name
    if update_data.subject is not None:
        template.subject = update_data.subject
    if update_data.body_html is not None:
        template.body_html = update_data.body_html
        
    db.commit()
    db.refresh(template)
    return template

