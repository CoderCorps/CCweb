import os
import json
import logging
import urllib.request
import urllib.error
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional, Dict, Any
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

def get_frontend_url() -> str:
    url = os.getenv("FRONTEND_URL", "").strip("'\" ")
    if not url:
        url = "https://c-cweb-u67f.vercel.app"
    return url.rstrip("/")

def send_email(to_email: str, subject: str, html_body: str, plain_text_body: Optional[str] = None) -> Optional[str]:
    """
    Sends an HTML email via:
    1. SMTP (if SMTP_USER and SMTP_PASSWORD are set in env)
    2. Resend API (if RESEND_API_KEY is set in env)
    3. Mock logger fallback (if no credentials configured)
    """
    # 1. Try SMTP if configured
    smtp_user = os.getenv("SMTP_USER", "").strip("'\" ")
    smtp_password = os.getenv("SMTP_PASSWORD", "").strip("'\" ")
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com").strip("'\" ")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))

    if smtp_user and smtp_password:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = smtp_user
            msg["To"] = to_email
            msg["Reply-To"] = smtp_user

            # Plain text part for anti-spam rating
            fallback_text = plain_text_body if plain_text_body else "Please view this email in an HTML-compatible email client."
            msg.attach(MIMEText(fallback_text, "plain", "utf-8"))
            msg.attach(MIMEText(html_body, "html", "utf-8"))

            if smtp_port == 465:
                with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=10) as server:
                    server.login(smtp_user, smtp_password)
                    server.sendmail(smtp_user, [to_email], msg.as_string())
            else:
                with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
                    server.starttls()
                    server.login(smtp_user, smtp_password)
                    server.sendmail(smtp_user, [to_email], msg.as_string())

            msg_id = f"smtp-{os.urandom(4).hex()}"
            logger.info(f"Successfully sent email to {to_email} via SMTP ({smtp_host}).")
            return msg_id
        except Exception as e:
            logger.warning(f"SMTP email dispatch failed to {to_email}: {e}")

    # 2. Try Resend API if configured
    resend_key = os.getenv("RESEND_API_KEY", "").strip()
    if resend_key and resend_key != "YOUR_RESEND_API_KEY_HERE":
        url = "https://api.resend.com/emails"
        headers = {
            "Authorization": f"Bearer {resend_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "from": f"CoderCorps <{smtp_user or 'admissions@codercorps.com'}>",
            "to": [to_email],
            "subject": subject,
            "html": html_body
        }

        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers=headers,
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=10) as response:
                if response.status in (200, 201):
                    res_body = json.loads(response.read().decode("utf-8"))
                    msg_id = res_body.get("id")
                    logger.info(f"Successfully sent email to {to_email} via Resend. Message ID: {msg_id}")
                    return msg_id
        except Exception as e:
            logger.warning(f"Resend API email send failed to {to_email}: {e}")

    # 3. Fallback logging mode
    logger.info(
        f"[MOCK EMAIL SERVICE] To: {to_email} | Subject: '{subject}' | HTML snippet: {html_body[:120]}..."
    )
    return "mock-email-id-" + os.urandom(4).hex()


def send_invitation_email(to_email: str, candidate_name: str, raw_token: str, expires_at_str: str) -> Optional[str]:
    frontend_base = get_frontend_url()
    assessment_link = f"{frontend_base}/assessment/candidate/{raw_token}"
    subject = "You're Invited: CoderCorps Python Technical Assessment"
    
    plain_text = f"Hello {candidate_name},\n\nThank you for applying to CoderCorps! Complete your screening assessment here:\n{assessment_link}\n\nValid for 24 hours."

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #090d16; color: #f8fafc; margin: 0; padding: 24px; }}
        .card {{ max-width: 560px; margin: 0 auto; background: #131b2e; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); }}
        .logo {{ font-size: 20px; font-weight: 800; color: #6366f1; margin-bottom: 24px; text-transform: uppercase; letter-spacing: 1px; }}
        h2 {{ font-size: 22px; color: #ffffff; margin-top: 0; }}
        p {{ font-size: 14px; line-height: 1.6; color: #94a3b8; }}
        .btn-container {{ text-align: center; margin: 28px 0; }}
        .btn {{ display: inline-block; padding: 14px 28px; background-color: #6366f1; color: #ffffff !important; text-decoration: none; font-weight: 700; border-radius: 10px; font-size: 14px; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4); }}
        .info-box {{ background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.2); padding: 16px; border-radius: 10px; font-size: 12px; color: #cbd5e1; margin-top: 24px; }}
        .footer {{ text-align: center; margin-top: 24px; font-size: 11px; color: #64748b; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">CoderCorps Screening</div>
        <h2>Hello {candidate_name},</h2>
        <p>Thank you for submitting your application to CoderCorps! You have been invited to complete your 1-time Python technical screening test.</p>
        <p>This screening consists of 10 timed questions. Correct answers and detailed logic explanations will be revealed right after submission.</p>
        
        <div class="btn-container">
          <a href="{assessment_link}" class="btn">Start Your Assessment Now &rarr;</a>
        </div>

        <div class="info-box">
          <strong>Important Details:</strong><br>
          • <strong>Link Expiration:</strong> {expires_at_str}<br>
          • <strong>Single Attempt:</strong> Once started, timer cannot be paused.<br>
          • <strong>Link:</strong> <a href="{assessment_link}" style="color: #818cf8; word-break: break-all;">{assessment_link}</a>
        </div>
      </div>
      <div class="footer">
        &copy; CoderCorps Platform • Automatic Admissions System
      </div>
    </body>
    </html>
    """
    return send_email(to_email, subject, html, plain_text)


def send_reminder_email(to_email: str, candidate_name: str, raw_token: str, reminder_number: int, expires_at_str: str) -> Optional[str]:
    frontend_base = get_frontend_url()
    assessment_link = f"{frontend_base}/assessment/candidate/{raw_token}"
    
    if reminder_number == 1:
        subject = "Reminder: Your CoderCorps Technical Assessment is Ready (+6h)"
        urgency_text = "Friendly reminder to complete your Python technical screening test."
    elif reminder_number == 2:
        subject = "Follow-up: Complete your CoderCorps Assessment (+12h)"
        urgency_text = "You are halfway through your 24-hour assessment window."
    else:
        subject = "URGENT: CoderCorps Assessment Link Expires in 6 Hours (+18h)"
        urgency_text = "Your assessment link will expire soon! Please complete your test before expiry."

    plain_text = f"Hello {candidate_name},\n\n{urgency_text}\n\nComplete test here:\n{assessment_link}"

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #090d16; color: #f8fafc; margin: 0; padding: 24px; }}
        .card {{ max-width: 560px; margin: 0 auto; background: #131b2e; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); }}
        .logo {{ font-size: 20px; font-weight: 800; color: #f59e0b; margin-bottom: 24px; text-transform: uppercase; letter-spacing: 1px; }}
        h2 {{ font-size: 22px; color: #ffffff; margin-top: 0; }}
        p {{ font-size: 14px; line-height: 1.6; color: #94a3b8; }}
        .btn-container {{ text-align: center; margin: 28px 0; }}
        .btn {{ display: inline-block; padding: 14px 28px; background-color: #f59e0b; color: #000000 !important; text-decoration: none; font-weight: 800; border-radius: 10px; font-size: 14px; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4); }}
        .info-box {{ background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.2); padding: 16px; border-radius: 10px; font-size: 12px; color: #cbd5e1; margin-top: 24px; }}
        .footer {{ text-align: center; margin-top: 24px; font-size: 11px; color: #64748b; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">Assessment Reminder #{reminder_number}</div>
        <h2>Hello {candidate_name},</h2>
        <p>{urgency_text}</p>
        
        <div class="btn-container">
          <a href="{assessment_link}" class="btn">Complete Assessment Now &rarr;</a>
        </div>

        <div class="info-box">
          <strong>Link Expiration Window:</strong> {expires_at_str}<br>
          <strong>Assessment Link:</strong> <a href="{assessment_link}" style="color: #fbbf24; word-break: break-all;">{assessment_link}</a>
        </div>
      </div>
      <div class="footer">
        &copy; CoderCorps Platform • Automated Reminders
      </div>
    </body>
    </html>
    """
    return send_email(to_email, subject, html, plain_text)
