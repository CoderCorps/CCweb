from pydantic import BaseModel
from typing import List, Optional
import datetime

class CertificateTemplateFieldBase(BaseModel):
    field_key: str
    x_percent: float
    y_percent: float
    font_family: Optional[str] = None
    font_size: Optional[int] = None
    font_weight: Optional[str] = None
    color: Optional[str] = None
    text_align: str = "left"

class CertificateTemplateFieldCreate(CertificateTemplateFieldBase):
    pass

class CertificateTemplateFieldResponse(CertificateTemplateFieldBase):
    id: int
    template_id: int

    class Config:
        from_attributes = True

class CertificateTemplateBase(BaseModel):
    name: str
    background_image_url: str
    width_px: int = 2000
    height_px: int = 1414
    program_id: Optional[int] = None

class CertificateTemplateCreate(CertificateTemplateBase):
    pass

class CertificateTemplateResponse(CertificateTemplateBase):
    id: int
    created_by: Optional[int]
    created_at: datetime.datetime
    fields: List[CertificateTemplateFieldResponse] = []

    class Config:
        from_attributes = True

class EmailTemplateBase(BaseModel):
    name: str
    subject: str
    body_html: str
    type: str = "certificate_issued"

class EmailTemplateCreate(EmailTemplateBase):
    pass

class EmailTemplateUpdate(BaseModel):
    name: Optional[str] = None
    subject: Optional[str] = None
    body_html: Optional[str] = None

class EmailTemplateResponse(EmailTemplateBase):
    id: int
    created_by: Optional[int]
    updated_at: datetime.datetime

    class Config:
        from_attributes = True

class CertificateEmailLogResponse(BaseModel):
    id: int
    certificate_id: int
    recipient_email: str
    status: str
    sent_at: datetime.datetime
    error_message: Optional[str] = None

    class Config:
        from_attributes = True

class CertificateBatchGenerateRequest(BaseModel):
    template_id: int
    user_ids: List[int]
    program_id: Optional[int] = None
    project_id: Optional[int] = None
    title: Optional[str] = None
    duration_start: Optional[datetime.date] = None
    duration_end: Optional[datetime.date] = None

class CertificateBatchSendRequest(BaseModel):
    certificate_ids: List[int]
    email_template_id: int

class EligibilityResponse(BaseModel):
    user_id: int
    user_name: str
    eligible: bool
    missing_criteria: List[str]

