import os
import uuid
import json
import base64
import urllib.request
import urllib.parse
from typing import Optional
from app.core.config import settings

def upload_screenshot_to_cloud(file_bytes: bytes, content_type: str = "image/png", filename: Optional[str] = None, target_bucket: Optional[str] = None) -> Optional[str]:
    """
    Uploads an image file to Supabase Storage (or cloud storage fallback)
    and returns a 100% accessible public HTTPS URL.
    """
    supabase_url = (os.getenv("SUPABASE_URL") or settings.SUPABASE_URL or "").strip("'\" ").rstrip("/")
    supabase_key = (os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY") or settings.SUPABASE_KEY or "").strip("'\" ")
    bucket = (target_bucket or os.getenv("SUPABASE_BUCKET") or settings.SUPABASE_BUCKET or "issue-screenshots").strip("'\" ")

    ext = os.path.splitext(filename or "shot.png")[1]
    if not ext or ext.lower() not in [".png", ".jpg", ".jpeg", ".webp", ".gif"]:
        ext = ".png"
    unique_filename = f"{uuid.uuid4().hex}{ext}"

    # 1. ATTEMPT SUPABASE STORAGE BUCKET UPLOAD
    if supabase_url and supabase_key:
        upload_endpoint = f"{supabase_url}/storage/v1/object/{bucket}/{unique_filename}"
        headers = {
            "Authorization": f"Bearer {supabase_key}",
            "apiKey": supabase_key,
            "Content-Type": content_type or "image/png",
            "x-upsert": "true"
        }

        try:
            req = urllib.request.Request(upload_endpoint, data=file_bytes, headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=12) as response:
                if response.status in (200, 201):
                    public_url = f"{supabase_url}/storage/v1/object/public/{bucket}/{unique_filename}"
                    print(f"[SUPABASE STORAGE SUCCESS]: Public image URL generated -> {public_url}")
                    return public_url
        except Exception as e:
            print(f"[SUPABASE STORAGE NOTICE]: Direct bucket upload to '{bucket}' failed: {e}")

    # 2. ATTEMPT IMGBB FREE CLOUD HOSTING FALLBACK
    imgbb_key = (os.getenv("IMGBB_API_KEY") or settings.IMGBB_API_KEY or "").strip("'\" ")
    if imgbb_key:
        try:
            b64_data = base64.b64encode(file_bytes).decode("utf-8")
            post_data = urllib.parse.urlencode({"key": imgbb_key, "image": b64_data}).encode("utf-8")
            req = urllib.request.Request("https://api.imgbb.com/1/upload", data=post_data, method="POST")
            with urllib.request.urlopen(req, timeout=12) as response:
                res_data = json.loads(response.read().decode("utf-8"))
                if res_data.get("success") and res_data.get("data", {}).get("url"):
                    public_url = res_data["data"]["url"]
                    print(f"[IMGBB CLOUD SUCCESS]: Public image URL generated -> {public_url}")
                    return public_url
        except Exception as e:
            print(f"[CLOUD UPLOAD NOTICE]: ImgBB upload failed: {e}")

    return None
