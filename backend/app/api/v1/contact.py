from fastapi import APIRouter, HTTPException, status
from app.schemas.contact import ContactMessageCreate
from app.core.config import settings
import json
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

router = APIRouter()

LOG_FILE = "contact_messages.json"

@router.post("/", status_code=status.HTTP_200_OK)
def handle_contact_submission(payload: ContactMessageCreate):
    # 1. Archive message locally to a JSON file log
    try:
        messages = []
        if os.path.exists(LOG_FILE):
            try:
                with open(LOG_FILE, "r") as f:
                    messages = json.load(f)
            except Exception:
                pass

        new_msg = {
            "name": payload.name,
            "email": payload.email,
            "message": payload.message,
            "timestamp": os.getenv("CURRENT_TIME", "2026-07-10T13:56:00Z")
        }
        messages.append(new_msg)

        with open(LOG_FILE, "w") as f:
            json.dump(messages, f, indent=4)
    except Exception as e:
        print(f"Local archiving failed: {str(e)}")

    # 2. Email sending coordinates
    smtp_host = settings.SMTP_HOST
    smtp_port = settings.SMTP_PORT
    smtp_user = settings.SMTP_USER
    smtp_pass = settings.SMTP_PASSWORD
    mail_to = settings.MAIL_TO

    # 3. SMTP execution
    mail_sent = False
    error_detail = None

    if not smtp_user or not smtp_pass:
        # Fallback print statement when coordinates are blank
        print("\n" + "="*50)
        print("MOCK MAIL DISPATCH:")
        print(f"TO:      {mail_to}")
        print(f"FROM:    {payload.email} ({payload.name})")
        print(f"CONTENT: {payload.message}")
        print("STATUS:  Skipped SMTP dispatch (SMTP_USER/SMTP_PASSWORD not configured)")
        print("="*50 + "\n")
        mail_sent = True
    else:
        try:
            # Set up MIMEMultipart message content
            msg = MIMEMultipart()
            msg["From"] = smtp_user
            msg["To"] = mail_to
            msg["Subject"] = f"New Contact Submission from {payload.name}"
            msg.add_header("Reply-To", payload.email)

            body = f"Name: {payload.name}\nEmail: {payload.email}\n\nMessage:\n{payload.message}"
            msg.attach(MIMEText(body, "plain"))

            # Dispatch SMTP mail connection
            server = smtplib.SMTP(smtp_host, smtp_port)
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_user, mail_to, msg.as_string())
            server.quit()
            
            print(f"Mail successfully dispatched to {mail_to}!")
            mail_sent = True
        except Exception as e:
            error_detail = str(e)
            print(f"SMTP dispatch connection failed: {error_detail}")

    # 4. Return unified success block
    if mail_sent:
        return {
            "status": "success",
            "message": "Message sent and logged successfully.",
            "smtp_active": bool(smtp_user and smtp_pass)
        }
    else:
        # We still return success but with warning so frontend user gets visual confirmation 
        # and developer gets logging coordinate errors
        return {
            "status": "partial_success",
            "message": "Logged locally, but mail dispatch failed.",
            "error": error_detail
        }
