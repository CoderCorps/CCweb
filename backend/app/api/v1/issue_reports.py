import os
import uuid
import asyncio
from datetime import datetime, timedelta, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.deps import get_db, get_current_mentor, oauth2_scheme
from app.core.security import decode_token
from app.models.user import User
from app.models.issue_report import IssueReport
from app.schemas.issue_report import (
    IssueReportCreate,
    IssueReportResponse,
    IssueReportUpdate,
    IssueReportListResponse
)
from app.services.email_service import (
    send_issue_report_notification_email,
    send_issue_report_confirmation_email
)

router = APIRouter()

def _utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)

# --------------------------------------------------------------------------
# IP RATE LIMITING CACHE (In-Memory Sliding Window)
# Max 5 submissions per 10 minutes per IP address
# --------------------------------------------------------------------------
IP_SUBMISSION_CACHE = {} # ip -> list of timestamps

def _check_ip_rate_limit(ip: str):
    now = _utcnow()
    window_start = now - timedelta(minutes=10)
    timestamps = IP_SUBMISSION_CACHE.get(ip, [])
    # Prune old timestamps
    valid_timestamps = [t for t in timestamps if t > window_start]
    if len(valid_timestamps) >= 5:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many issue reports submitted from your IP address. Please wait a few minutes before trying again."
        )
    valid_timestamps.append(now)
    IP_SUBMISSION_CACHE[ip] = valid_timestamps

def _clear_rate_limits():
    """Helper for reset in tests."""
    IP_SUBMISSION_CACHE.clear()

# --------------------------------------------------------------------------
# OPTIONAL AUTH CONTEXT HELPER
# Decodes token if present in headers, returns User or None without throwing 401
# --------------------------------------------------------------------------
async def get_optional_current_user(
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme)
) -> Optional[User]:
    if not token:
        return None
    try:
        payload = await asyncio.to_thread(decode_token, token)
        if not payload or payload.get("type") != "access":
            return None
        user_id = int(payload.get("sub"))
        user = await asyncio.to_thread(
            lambda: db.query(User).filter(User.id == user_id).first()
        )
        return user
    except Exception:
        return None

# Allowed categories
ALLOWED_CATEGORIES = {
    "website_bug",
    "assessment_email_issue",
    "account_login",
    "feature_request",
    "other"
}

# --------------------------------------------------------------------------
# 1. PUBLIC ISSUE REPORT SUBMISSION
# --------------------------------------------------------------------------
@router.post("", response_model=IssueReportResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=IssueReportResponse, status_code=status.HTTP_201_CREATED)
async def submit_issue_report(
    report_in: IssueReportCreate,
    request: Request,
    db: Session = Depends(get_db),
    optional_user: Optional[User] = Depends(get_optional_current_user)
):
    # 1. Honeypot Anti-Spam Check
    if report_in.honeypot and report_in.honeypot.strip():
        # Silently reject bots without revealing anti-spam mechanism
        dummy_now = _utcnow()
        return IssueReportResponse(
            id=999999,
            reporter_name=report_in.reporter_name,
            reporter_email=report_in.reporter_email,
            reporter_role=report_in.reporter_role,
            reporter_role_detail=report_in.reporter_role_detail,
            reported_by_user_id=None,
            category=report_in.category,
            page_url=report_in.page_url,
            description=report_in.description,
            assessment_email_used=report_in.assessment_email_used,
            assessment_link_received=report_in.assessment_link_received,
            assessment_link_worked=report_in.assessment_link_worked,
            screenshot_url=report_in.screenshot_url,
            status="open",
            admin_notes=None,
            submitted_at=dummy_now,
            resolved_at=None,
            resolved_by=None
        )

    # 2. Rate Limiting Check
    client_ip = request.client.host if request.client else "127.0.0.1"
    _check_ip_rate_limit(client_ip)

    # 3. Category Validation
    if report_in.category not in ALLOWED_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid category specified. Must be one of: {', '.join(ALLOWED_CATEGORIES)}"
        )

    # 4. Anti-Spoofing & User Binding
    if optional_user:
        # User is logged in — bind to authenticated account details
        reported_by_user_id = optional_user.id
        reporter_email = optional_user.email
        reporter_role = optional_user.role
    else:
        # Visitor is logged out — use form input
        reported_by_user_id = None
        reporter_email = str(report_in.reporter_email).strip().lower()
        reporter_role = report_in.reporter_role.strip().lower() if report_in.reporter_role else "other"

    # 5. Database Row Insertion
    def _create():
        now = _utcnow()
        report = IssueReport(
            reporter_name=report_in.reporter_name.strip(),
            reporter_email=reporter_email,
            reporter_role=reporter_role,
            reporter_role_detail=report_in.reporter_role_detail.strip() if report_in.reporter_role_detail else None,
            reported_by_user_id=reported_by_user_id,
            category=report_in.category,
            page_url=report_in.page_url.strip() if report_in.page_url else None,
            description=report_in.description.strip(),
            assessment_email_used=report_in.assessment_email_used.strip() if report_in.assessment_email_used else None,
            assessment_link_received=report_in.assessment_link_received,
            assessment_link_worked=report_in.assessment_link_worked,
            screenshot_url=report_in.screenshot_url.strip() if report_in.screenshot_url else None,
            status="open",
            submitted_at=now
        )
        db.add(report)
        db.commit()
        db.refresh(report)
        return report

    report = await asyncio.to_thread(_create)

    # 6. Safe Async Email Sending (wrapped in try/except so DB creation never fails)
    try:
        send_issue_report_notification_email(
            report_id=report.id,
            reporter_name=report.reporter_name,
            reporter_email=report.reporter_email,
            reporter_role=report.reporter_role,
            category=report.category,
            description=report.description,
            page_url=report.page_url,
            assessment_email_used=report.assessment_email_used,
            assessment_link_received=report.assessment_link_received,
            assessment_link_worked=report.assessment_link_worked,
            screenshot_url=report.screenshot_url
        )
    except Exception as e:
        print(f"[ISSUE REPORT EMAIL WARNING]: Admin notification send failed for report #{report.id}: {e}")

    try:
        send_issue_report_confirmation_email(
            to_email=report.reporter_email,
            reporter_name=report.reporter_name,
            report_id=report.id,
            category=report.category
        )
    except Exception as e:
        print(f"[ISSUE REPORT EMAIL WARNING]: Reporter receipt confirmation send failed for report #{report.id}: {e}")

    return report

# --------------------------------------------------------------------------
# 2. SCREENSHOT UPLOAD HANDLER
# --------------------------------------------------------------------------
@router.post("/upload-screenshot")
async def upload_screenshot(request: Request, file: UploadFile = File(...)):
    # Validate mime type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only image file formats (JPEG, PNG, WebP, GIF) are allowed for screenshot upload."
        )

    # Read and validate size (≤ 5MB)
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Screenshot file size exceeds maximum limit of 5MB."
        )

    # Save file locally to static upload directory
    upload_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "static", "uploads", "screenshots")
    os.makedirs(upload_dir, exist_ok=True)

    ext = os.path.splitext(file.filename or "shot.png")[1]
    if not ext:
        ext = ".png"
    filename = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(upload_dir, filename)

    with open(file_path, "wb") as f:
        f.write(content)

    base = str(request.base_url).rstrip("/")
    public_url = f"{base}/static/uploads/screenshots/{filename}"
    return {"status": "ok", "screenshot_url": public_url}


# --------------------------------------------------------------------------
# 3. ADMIN / MENTOR: GET REPORTED ISSUES (LIST & TRIAGE)
# --------------------------------------------------------------------------
@router.get("/admin/issue-reports", response_model=IssueReportListResponse)
@router.get("/admin", response_model=IssueReportListResponse)
async def get_admin_issue_reports(
    status: Optional[str] = None,
    category: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_mentor)
):
    def _fetch():
        now = _utcnow()
        twenty_four_hours_ago = now - timedelta(hours=24)

        # Count assessment email issues in last 24h (spike indicator)
        spike_count = db.query(func.count(IssueReport.id)).filter(
            IssueReport.category == "assessment_email_issue",
            IssueReport.submitted_at >= twenty_four_hours_ago
        ).scalar() or 0

        query = db.query(IssueReport)
        if status:
            query = query.filter(IssueReport.status == status)
        if category:
            query = query.filter(IssueReport.category == category)
        if date_from:
            query = query.filter(IssueReport.submitted_at >= date_from)
        if date_to:
            query = query.filter(IssueReport.submitted_at <= date_to)

        total = query.count()
        offset = (max(1, page) - 1) * max(1, limit)
        items = query.order_by(IssueReport.submitted_at.desc()).offset(offset).limit(limit).all()

        return items, total, spike_count

    items, total, spike_count = await asyncio.to_thread(_fetch)
    return IssueReportListResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        assessment_issues_last_24h=spike_count
    )

# --------------------------------------------------------------------------
# 4. ADMIN / MENTOR: UPDATE ISSUE STATUS & NOTES
# --------------------------------------------------------------------------
@router.patch("/admin/issue-reports/{id}", response_model=IssueReportResponse)
@router.patch("/admin/{id}", response_model=IssueReportResponse)
async def update_admin_issue_report(
    id: int,
    update_in: IssueReportUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_mentor)
):
    def _update():
        report = db.query(IssueReport).filter(IssueReport.id == id).first()
        if not report:
            return None

        if update_in.status:
            if update_in.status not in ["open", "in_progress", "resolved"]:
                raise HTTPException(status_code=400, detail="Invalid status specified")
            report.status = update_in.status
            if update_in.status == "resolved":
                report.resolved_at = _utcnow()
                report.resolved_by = current_user.id

        if update_in.admin_notes is not None:
            report.admin_notes = update_in.admin_notes

        db.commit()
        db.refresh(report)
        return report

    report = await asyncio.to_thread(_update)
    if not report:
        raise HTTPException(status_code=404, detail="Issue report not found")
    return report
