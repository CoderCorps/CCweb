import io
import hashlib
import qrcode
from PIL import Image, ImageDraw, ImageFont
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.submission import Certificate

def render_certificate_image(template, fields, merge_data) -> bytes:
    # We download or open the image. Since it might be a remote URL, we will mock it if it is missing
    # but let's assume it is a local path or we just create a blank image for safety in this mock
    
    img = Image.new("RGB", (template.width_px, template.height_px), color="white")
    draw = ImageDraw.Draw(img)
    
    try:
        # try loading default font
        font = ImageFont.truetype("arial.ttf", 60)
    except IOError:
        font = ImageFont.load_default()
        
    for field in fields:
        x = (field.x_percent / 100.0) * template.width_px
        y = (field.y_percent / 100.0) * template.height_px
        
        if field.field_key == "qr_code":
            if "public_url" in merge_data:
                qr = qrcode.make(merge_data["public_url"])
                qr = qr.resize((300, 300))
                img.paste(qr, (int(x), int(y)))
        else:
            text = str(merge_data.get(field.field_key, f"{{{field.field_key}}}"))
            draw.text((x, y), text, fill=(0, 0, 0), font=font)
            
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format="PNG")
    return img_byte_arr.getvalue()

def render_certificate_pdf(png_bytes: bytes, width: int, height: int) -> bytes:
    pdf_buffer = io.BytesIO()
    c = canvas.Canvas(pdf_buffer, pagesize=(width, height))
    img_reader = ImageReader(io.BytesIO(png_bytes))
    c.drawImage(img_reader, 0, 0, width, height)
    c.showPage()
    c.save()
    return pdf_buffer.getvalue()

def generate_certificate_number(db: Session) -> str:
    from datetime import datetime
    year = datetime.now().year
    
    # query the max id
    max_id = db.query(func.max(Certificate.id)).scalar() or 0
    seq = max_id + 1
    return f"CC-{year}-{seq:05d}"

def compute_signature_hash(user_id: int, program_id: int, issued_at, secret="codercorps_secret") -> str:
    data = f"{user_id}-{program_id}-{issued_at}-{secret}"
    return hashlib.sha256(data.encode("utf-8")).hexdigest()

