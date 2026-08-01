import pytest
from app.models.issue_report import IssueReport
from app.api.v1.issue_reports import _clear_rate_limits

def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(autouse=True)
def reset_rate_limit_cache():
    _clear_rate_limits()

def test_public_issue_report_anonymous(client, db):
    payload = {
        "reporter_name": "Jane Visitor",
        "reporter_email": "jane@visitor.com",
        "reporter_role": "candidate",
        "category": "website_bug",
        "page_url": "https://codercorps.com/apply",
        "description": "The apply form submit button was unresponsive on iOS Safari."
    }

    response = client.post("/api/v1/issue-reports/", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["reporter_name"] == "Jane Visitor"
    assert data["reporter_email"] == "jane@visitor.com"
    assert data["reported_by_user_id"] is None
    assert data["status"] == "open"

    # Verify DB row
    report = db.query(IssueReport).filter(IssueReport.id == data["id"]).first()
    assert report is not None
    assert report.description == payload["description"]


def test_public_issue_report_logged_in_anti_spoofing(client, db, student_user, student_token):
    payload = {
        "reporter_name": "Student Name",
        "reporter_email": "spoofed_email@evil.com", # Spoofed email in body
        "reporter_role": "mentor", # Spoofed role in body
        "category": "account_login",
        "description": "I cannot view my assigned sprint tasks."
    }

    response = client.post(
        "/api/v1/issue-reports/",
        headers=auth_headers(student_token),
        json=payload
    )
    assert response.status_code == 201
    data = response.json()

    # Bound to authenticated user account - spoofed body values ignored!
    assert data["reported_by_user_id"] == student_user.id
    assert data["reporter_email"] == student_user.email
    assert data["reporter_role"] == "student"

    report = db.query(IssueReport).filter(IssueReport.id == data["id"]).first()
    assert report.reported_by_user_id == student_user.id
    assert report.reporter_email == student_user.email


def test_assessment_email_issue_extra_fields(client, db):
    payload = {
        "reporter_name": "Candidate Sam",
        "reporter_email": "sam@candidate.com",
        "reporter_role": "candidate",
        "category": "assessment_email_issue",
        "description": "My assessment token link expired before I could start.",
        "assessment_email_used": "sam_application@candidate.com",
        "assessment_link_received": True,
        "assessment_link_worked": False
    }

    response = client.post("/api/v1/issue-reports/", json=payload)
    assert response.status_code == 201
    data = response.json()

    assert data["category"] == "assessment_email_issue"
    assert data["assessment_email_used"] == "sam_application@candidate.com"
    assert data["assessment_link_received"] is True
    assert data["assessment_link_worked"] is False

    report = db.query(IssueReport).filter(IssueReport.id == data["id"]).first()
    assert report.assessment_email_used == "sam_application@candidate.com"
    assert report.assessment_link_received is True
    assert report.assessment_link_worked is False


def test_honeypot_rejection(client, db):
    payload = {
        "reporter_name": "Spam Bot",
        "reporter_email": "bot@spam.com",
        "reporter_role": "other",
        "category": "website_bug",
        "description": "Buy cheap products now",
        "honeypot": "I am a bot" # Bot filled hidden field
    }

    initial_count = db.query(IssueReport).count()
    response = client.post("/api/v1/issue-reports/", json=payload)
    
    # Returns 201 success to client without revealing anti-bot mechanism
    assert response.status_code == 201

    # But ZERO rows added to database!
    assert db.query(IssueReport).count() == initial_count


def test_rate_limiting(client):
    _clear_rate_limits()
    payload = {
        "reporter_name": "Repeater",
        "reporter_email": "repeater@test.com",
        "reporter_role": "other",
        "category": "website_bug",
        "description": "Repeated issue report submission"
    }

    # Send 5 requests (within limit)
    for _ in range(5):
        res = client.post("/api/v1/issue-reports/", json=payload)
        assert res.status_code == 201

    # 6th request from same IP should be blocked with 429
    res6 = client.post("/api/v1/issue-reports/", json=payload)
    assert res6.status_code == 429
    assert "Too many issue reports" in res6.json()["detail"]


def test_admin_list_and_patch_reports(client, db, mentor_user, mentor_token, student_token):
    # 1. Create a test report
    report = IssueReport(
        reporter_name="Report User",
        reporter_email="user@test.com",
        reporter_role="student",
        category="assessment_email_issue",
        description="Assessment link email issue test",
        status="open"
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    # 2. Student forbidden from admin triage list
    res_student = client.get("/api/v1/issue-reports/admin/issue-reports", headers=auth_headers(student_token))
    assert res_student.status_code == 403

    # 3. Mentor allowed to list reports
    res_mentor = client.get("/api/v1/issue-reports/admin/issue-reports", headers=auth_headers(mentor_token))
    assert res_mentor.status_code == 200
    data = res_mentor.json()
    assert data["total"] >= 1
    assert "assessment_issues_last_24h" in data

    # 4. Mentor resolves report & adds admin notes
    res_patch = client.patch(
        f"/api/v1/issue-reports/admin/issue-reports/{report.id}",
        headers=auth_headers(mentor_token),
        json={"status": "resolved", "admin_notes": "Sent candidate a fresh token via email."}
    )
    assert res_patch.status_code == 200
    updated_data = res_patch.json()
    assert updated_data["status"] == "resolved"
    assert updated_data["admin_notes"] == "Sent candidate a fresh token via email."
    assert updated_data["resolved_by"] == mentor_user.id
    assert updated_data["resolved_at"] is not None
