from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.deps import get_db, get_current_mentor, get_current_admin
from app.models.certificate_template import CertificateTemplate, CertificateTemplateField
from app.schemas.certificate_template import CertificateTemplateCreate, CertificateTemplateResponse, CertificateTemplateFieldCreate, CertificateTemplateFieldResponse
from app.services.supabase_storage import upload_screenshot_to_cloud
from typing import List

router = APIRouter()

@router.post("/upload-background")
async def upload_template_background(file: UploadFile = File(...), current_user = Depends(get_current_mentor)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files (PNG, JPG, WEBP) are allowed")
    
    file_bytes = await file.read()
    
    # Compress/optimize large high-res certificate templates if needed
    content_type = file.content_type
    ext = ".png"
    try:
        import io
        from PIL import Image
        img = Image.open(io.BytesIO(file_bytes))
        max_dim = 2400
        if img.width > max_dim or img.height > max_dim:
            img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
        
        out_buf = io.BytesIO()
        if img.mode in ("RGBA", "P"):
            img.save(out_buf, format="PNG", optimize=True)
            content_type = "image/png"
            ext = ".png"
        else:
            img.save(out_buf, format="JPEG", quality=92, optimize=True)
            content_type = "image/jpeg"
            ext = ".jpg"
        file_bytes = out_buf.getvalue()
    except Exception:
        pass

    public_url = upload_screenshot_to_cloud(
        file_bytes,
        content_type=content_type,
        filename=f"template_{file.filename or 'cert'}{ext}",
        target_bucket="certificate-templates"
    )
    if not public_url:
        public_url = upload_screenshot_to_cloud(
            file_bytes,
            content_type=content_type,
            filename=f"template_{file.filename or 'cert'}{ext}",
            target_bucket="issue-screenshots"
        )
        
    if not public_url:
        raise HTTPException(status_code=500, detail="Failed to upload image to Supabase cloud storage")
        
    return {"url": public_url}

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

