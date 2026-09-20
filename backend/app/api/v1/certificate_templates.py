from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.deps import get_db, get_current_mentor, get_current_admin
from app.models.certificate_template import CertificateTemplate, CertificateTemplateField
from app.schemas.certificate_template import CertificateTemplateCreate, CertificateTemplateResponse, CertificateTemplateFieldCreate, CertificateTemplateFieldResponse
from typing import List

router = APIRouter()

@router.post("", response_model=CertificateTemplateResponse)
def create_template(template: CertificateTemplateCreate, db: Session = Depends(get_db), current_user = Depends(get_current_mentor)):
    db_template = CertificateTemplate(
        name=template.name,
        background_image_url=template.background_image_url,
        width_px=template.width_px,
        height_px=template.height_px,
        program_id=template.program_id,
        created_by=current_user.id
    )
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template

@router.get("", response_model=List[CertificateTemplateResponse])
def get_templates(db: Session = Depends(get_db), current_user = Depends(get_current_mentor)):
    return db.query(CertificateTemplate).all()

@router.patch("/{id}", response_model=CertificateTemplateResponse)
def update_template(id: int, template: CertificateTemplateCreate, db: Session = Depends(get_db), current_user = Depends(get_current_mentor)):
    db_template = db.query(CertificateTemplate).filter(CertificateTemplate.id == id).first()
    if not db_template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    db_template.name = template.name
    db_template.background_image_url = template.background_image_url
    db.commit()
    db.refresh(db_template)
    return db_template

@router.get("/{id}", response_model=CertificateTemplateResponse)
def get_template(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_mentor)):
    template = db.query(CertificateTemplate).filter(CertificateTemplate.id == id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template

@router.patch("/{id}/fields", response_model=List[CertificateTemplateFieldResponse])
def update_template_fields(id: int, fields: List[CertificateTemplateFieldCreate], db: Session = Depends(get_db), current_user = Depends(get_current_mentor)):
    template = db.query(CertificateTemplate).filter(CertificateTemplate.id == id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
        
    db.query(CertificateTemplateField).filter(CertificateTemplateField.template_id == id).delete()
    
    db_fields = []
    for f in fields:
        db_f = CertificateTemplateField(
            template_id=id,
            field_key=f.field_key,
            x_percent=f.x_percent,
            y_percent=f.y_percent,
            font_family=f.font_family,
            font_size=f.font_size,
            font_weight=f.font_weight,
            color=f.color,
            text_align=f.text_align
        )
        db.add(db_f)
        db_fields.append(db_f)
        
    db.commit()
    return db.query(CertificateTemplateField).filter(CertificateTemplateField.template_id == id).all()

@router.delete("/{id}")
def delete_template(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_admin)):
    template = db.query(CertificateTemplate).filter(CertificateTemplate.id == id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    db.delete(template)
    db.commit()
    return {"ok": True}

