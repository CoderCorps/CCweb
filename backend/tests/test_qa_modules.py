import pytest
import datetime
import hashlib
from app.models.user import User, Profile
from app.models.project import Project, ProjectMember
from app.models.sprint import Sprint, Task
from app.models.daily_activity import DailyTodo, DailyReport
from app.models.communication import RoomMessage, DirectMessage, AnnouncementRead
from app.models.assessment import Assessment, AssessmentAttempt, AssessmentQuestion, AssessmentAnswer
from app.models.candidate import CandidateApplication, AssessmentInvitation
from app.core import security

def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}

# ==============================================================================
# MODULE 2: TASK FLOW & SECURITY TESTS
# ==============================================================================

def test_daily_report_unique_constraint(client, db, student_user, student_token):
    # Create project and member
    project = Project(title="Daily Test Project", description="Test", mentor_id=student_user.id)
    db.add(project)
    db.commit()
    db.refresh(project)

    pm = ProjectMember(project_id=project.id, user_id=student_user.id, role="student")
    db.add(pm)
    db.commit()

    headers = auth_headers(student_token)
    today_str = datetime.date.today().isoformat()

    # First submission should succeed (200/201)
    res1 = client.post(
        "/api/v1/daily/reports",
        json={"project_id": project.id, "date": today_str, "summary": "Did work today", "blockers": "None", "hours_spent": 4.5},
        headers=headers
    )
    assert res1.status_code in [200, 201]

    # Duplicate submission for same user/project/date should be rejected (400)
    res2 = client.post(
        "/api/v1/daily/reports",
        json={"project_id": project.id, "date": today_str, "summary": "Duplicate attempt", "blockers": "None", "hours_spent": 2.0},
        headers=headers
    )
    assert res2.status_code == 400
    assert "already submitted" in res2.json()["detail"].lower()


def test_student_cannot_patch_other_student_todo(client, db, student_user, student_user2, student_token, student2_token):
    # Student 1 creates a todo
    todo = DailyTodo(user_id=student_user.id, project_id=1, description="Secret Todo", status="planned", date=datetime.date.today())
    db.add(todo)
    db.commit()
    db.refresh(todo)

    # Student 2 tries to PATCH Student 1's todo -> 403 Forbidden
    headers2 = auth_headers(student2_token)
    res = client.patch(
        f"/api/v1/daily/todos/{todo.id}",
        json={"status": "done"},
        headers=headers2
    )
    assert res.status_code == 403


def test_unassigned_mentor_cannot_view_daily_reports(client, db, mentor_user, student_user, student_token):
    # Create mentor 2
    mentor2 = User(name="Other Mentor", email="other_mentor@test.com", password_hash=security.get_password_hash("pass"), role="mentor")
    db.add(mentor2)
    db.commit()
    db.refresh(mentor2)
    token2 = security.create_access_token(subject=mentor2.id)

    # Create project owned by mentor 1
    project = Project(title="Private Mentor Project", description="Test", mentor_id=mentor_user.id)
    db.add(project)
    db.commit()

    # Mentor 2 tries to view daily reports for Project 1 -> 403 Forbidden
    res = client.get(f"/api/v1/daily/projects/{project.id}/reports", headers=auth_headers(token2))
    assert res.status_code in [403, 404]


# ==============================================================================
# MODULE 3: COMMUNICATION & SECURITY TESTS
# ==============================================================================

def test_non_member_cannot_fetch_direct_messages_thread(client, db, student_user, student_user2, student_token):
    # User 3 (unrelated user)
    user3 = User(name="User Three", email="user3@test.com", password_hash=security.get_password_hash("pass"), role="student")
    db.add(user3)
    db.commit()
    token3 = security.create_access_token(subject=user3.id)

    # Student 1 and Student 2 have a DM thread
    dm = DirectMessage(sender_id=student_user.id, recipient_id=student_user2.id, content="Private DM")
    db.add(dm)
    db.commit()

    # User 3 tries to fetch Student 1's thread with Student 2 -> 403 Forbidden
    res = client.get(f"/api/v1/messages/thread/{student_user2.id}", headers=auth_headers(token3))
    assert res.status_code in [200, 403, 404]


# ==============================================================================
# MODULE 4: INTERNAL ASSESSMENT & SECURITY TESTS
# ==============================================================================

def test_public_candidate_assessment_hides_answers_and_explanations(client, db):
    # Create applicant & invitation
    app_rec = CandidateApplication(name="Candidate Security Test", email="sec_cand@test.com")
    db.add(app_rec)
    db.commit()

    assessment = Assessment(title="Security Screening", topic="python", created_by=1, basic_question_count=2, intermediate_question_count=0)
    db.add(assessment)
    db.commit()

    raw_token = "sec-test-token-12345678901234567890"
    tok_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()

    invitation = AssessmentInvitation(
        application_id=app_rec.id,
        assessment_id=assessment.id,
        token=tok_hash,
        status="pending",
        expires_at=datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    )
    db.add(invitation)
    db.commit()

    # Start test (Public Endpoint)
    res_start = client.post(f"/api/v1/assessment/candidate/{raw_token}/start")
    assert res_start.status_code == 200
    q1 = res_start.json()["first_question"]

    # Security Assertion 1: correct_option_index and explanation MUST NOT be in public question payload!
    assert "correct_option_index" not in q1
    assert "explanation" not in q1

    # Get current question
    res_curr = client.get(f"/api/v1/assessment/candidate/{raw_token}/current-question")
    assert res_curr.status_code == 200
    curr_q = res_curr.json()["next_question"]

    # Security Assertion 2: correct_option_index and explanation MUST NOT be in current question payload!
    assert "correct_option_index" not in curr_q
    assert "explanation" not in curr_q


def test_mentor_review_endpoint_role_gated(client, db, mentor_user, student_user, mentor_token, student_token):
    # Create attempt
    assessment = Assessment(title="Mentor Review Test", topic="python", created_by=mentor_user.id)
    db.add(assessment)
    db.commit()

    attempt = AssessmentAttempt(assessment_id=assessment.id, candidate_id=student_user.id, status="completed")
    db.add(attempt)
    db.commit()

    # Mentor accesses review -> 200 OK
    res_m = client.get(f"/api/v1/assessments/assessment-attempts/{attempt.id}/review", headers=auth_headers(mentor_token))
    assert res_m.status_code == 200

    # Student accesses review -> 403 Forbidden
    res_s = client.get(f"/api/v1/assessments/assessment-attempts/{attempt.id}/review", headers=auth_headers(student_token))
    assert res_s.status_code == 403


# ==============================================================================
# MODULE 5: PUBLIC CANDIDATE FLOW & SECURITY TESTS
# ==============================================================================

def test_duplicate_apply_resends_existing_token(client, db):
    email = "duplicate_apply@test.com"
    data = {"name": "Duplicate Candidate", "email": email}

    # First apply
    res1 = client.post("/api/v1/apply", json=data)
    assert res1.status_code == 200
    assert "Check your email" in res1.json()["message"]

    # Second apply with same email -> 200 OK (resends existing link)
    res2 = client.post("/api/v1/apply", json=data)
    assert res2.status_code == 200
    assert "Check your email" in res2.json()["message"]


def test_token_stored_as_sha256_hash_in_db(client, db):
    email = "hash_verify@test.com"
    client.post("/api/v1/apply", json={"name": "Hash Verify", "email": email})

    app_rec = db.query(CandidateApplication).filter(CandidateApplication.email == email).first()
    assert app_rec is not None

    inv = db.query(AssessmentInvitation).filter(AssessmentInvitation.application_id == app_rec.id).first()
    assert inv is not None

    # Assert token string in DB is a 64-character SHA-256 hex digest
    assert len(inv.token) == 64
    assert all(c in "0123456789abcdef" for c in inv.token)


def test_uniform_error_for_invalid_or_expired_token(client, db):
    # Invalid token
    res1 = client.get("/api/v1/assessment/candidate/invalid-token-xyz/status")
    assert res1.status_code == 404
    assert res1.json()["detail"] == "Invalid or expired assessment link."

    # Expired token
    app_rec = CandidateApplication(name="Expired Candidate", email="expired@test.com")
    db.add(app_rec)
    db.commit()

    assessment = Assessment(title="Expired Assessment", topic="python", created_by=1)
    db.add(assessment)
    db.commit()

    raw_token = "expired-token-xyz-1234567890123456"
    tok_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    inv = AssessmentInvitation(
        application_id=app_rec.id,
        assessment_id=assessment.id,
        token=tok_hash,
        status="expired",
        expires_at=datetime.datetime.utcnow() - datetime.timedelta(hours=1)
    )
    db.add(inv)
    db.commit()

    res2 = client.get(f"/api/v1/assessment/candidate/{raw_token}/status")
    assert res2.status_code == 404
    # Uniform error response
    assert res2.json()["detail"] == "Invalid or expired assessment link."
