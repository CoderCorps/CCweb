import io
import hashlib
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.submission import Certificate

def render_certificate_image(template, fields, merge_data) -> bytes:
    from PIL import Image, ImageDraw, ImageFont
    
    img = Image.new("RGB", (template.width_px, template.height_px), color="white")
    draw = ImageDraw.Draw(img)
    
    try:
        font = ImageFont.truetype("arial.ttf", 60)
    except IOError:
        font = ImageFont.load_default()
        
    for field in fields:
        x = (field.x_percent / 100.0) * template.width_px
        y = (field.y_percent / 100.0) * template.height_px
        
        if field.field_key == "qr_code":
            if "public_url" in merge_data:
                try:
                    import qrcode
                    qr = qrcode.make(merge_data["public_url"])
                    qr = qr.resize((300, 300))
                    img.paste(qr, (int(x), int(y)))
                except Exception:
                    pass
        else:
            text = str(merge_data.get(field.field_key, f"{{{field.field_key}}}"))
            draw.text((x, y), text, fill=(0, 0, 0), font=font)
            
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format="PNG")
    return img_byte_arr.getvalue()

def render_certificate_pdf(png_bytes: bytes, width: int, height: int) -> bytes:
    from PIL import Image
    image = Image.open(io.BytesIO(png_bytes))
    if image.mode != "RGB":
        image = image.convert("RGB")
    pdf_buffer = io.BytesIO()
    image.save(pdf_buffer, format="PDF")
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

