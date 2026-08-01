import pytest
import datetime

def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}

# ---------------------------------------------------------------------------
# AUTH tests
# ---------------------------------------------------------------------------
def test_signup_mentor_success(client):
    response = client.post(
        "/api/v1/auth/signup",
        json={"email": "newmentor@test.com", "password": "password123", "name": "New Mentor", "role": "mentor"}
    )
    assert response.status_code == 201

def test_signup_student_without_assessment_blocked(client):
    response = client.post(
        "/api/v1/auth/signup",
        json={"email": "newstudent@test.com", "password": "password123", "name": "New Student", "role": "student"}
    )
    assert response.status_code == 403

def test_signup_duplicate_email(client, db):
    response = client.post(
        "/api/v1/auth/signup",
        json={"email": "dupe@test.com", "password": "password123", "name": "Dupe Mentor", "role": "mentor"}
    )
    assert response.status_code == 201
    
    response2 = client.post(
        "/api/v1/auth/signup",
        json={"email": "dupe@test.com", "password": "password123", "name": "Dupe Mentor 2", "role": "mentor"}
    )
    assert response2.status_code == 400

def test_login_success(client, mentor_user):
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "mentor@test.com", "password": "testpassword"}
    )
    assert response.status_code == 200
    assert "access_token" in response.json()

def test_login_wrong_password(client, mentor_user):
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "mentor@test.com", "password": "wrongpassword"}
    )
    assert response.status_code == 400

def test_get_me(client, mentor_token):
    response = client.get("/api/v1/auth/me", headers=auth_headers(mentor_token))
    assert response.status_code == 200
    assert response.json()["email"] == "mentor@test.com"

def test_get_me_no_auth(client):
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401

def test_logout(client):
    response = client.post("/api/v1/auth/logout")
    assert response.status_code == 200

def test_update_account(client, mentor_token):
    response = client.patch(
        "/api/v1/auth/account",
        headers=auth_headers(mentor_token),
        json={"name": "Updated Name"}
    )
    assert response.status_code == 200

def test_forgot_password(client, mentor_user):
    response = client.post(
        "/api/v1/auth/forgot-password",
        json={"email": mentor_user.email}
    )
    assert response.status_code == 200

# ---------------------------------------------------------------------------
# ADMIN tests
# ---------------------------------------------------------------------------
def test_admin_get_pending_mentors(client, admin_token):
    response = client.get("/api/v1/admin/mentors/pending", headers=auth_headers(admin_token))
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_admin_get_pending_mentors_forbidden_student(client, student_token):
    response = client.get("/api/v1/admin/mentors/pending", headers=auth_headers(student_token))
    assert response.status_code == 403

def test_admin_approve_user(client, admin_token, db):
    from app.models.user import User
    user = User(email="pending1@test.com", name="Pending", password_hash="123", role="mentor", status="pending")
    db.add(user)
    db.commit()
    db.refresh(user)

    response = client.post(f"/api/v1/admin/users/{user.id}/approve", headers=auth_headers(admin_token))
    assert response.status_code == 200

def test_admin_reject_mentor(client, admin_token, db):
    from app.models.user import User
    user = User(email="pending2@test.com", name="Pending 2", password_hash="123", role="mentor", status="pending")
    db.add(user)
    db.commit()
    db.refresh(user)

    response = client.post(
        f"/api/v1/admin/mentors/{user.id}/reject",
        headers=auth_headers(admin_token),
        json={"reason": "Insufficient credentials"}
    )
    assert response.status_code == 200

def test_admin_get_pending_projects(client, admin_token):
    response = client.get("/api/v1/admin/projects/pending", headers=auth_headers(admin_token))
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_admin_candidate_applications_list(client, admin_token):
    response = client.get("/api/v1/admin/candidate-applications", headers=auth_headers(admin_token))
    assert response.status_code == 200

def test_admin_candidate_applications_forbidden(client, student_token):
    response = client.get("/api/v1/admin/candidate-applications", headers=auth_headers(student_token))
    assert response.status_code == 403

# ---------------------------------------------------------------------------
# CONTACT tests
# ---------------------------------------------------------------------------
def test_contact_submit(client):
    response = client.post(
        "/api/v1/contact/",
        json={"name": "Test", "email": "test@test.com", "subject": "Hello", "message": "World"}
    )
    assert response.status_code == 200

def test_contact_missing_fields(client):
    response = client.post(
        "/api/v1/contact/",
        json={"name": "Test", "email": "test@test.com", "subject": "Hello"}
    )
    assert response.status_code == 422

# ---------------------------------------------------------------------------
# DAILY tests
# ---------------------------------------------------------------------------
def test_daily_start_day(client, student_token, db, student_user):
    from app.models.project import Project, ProjectMember
    project = Project(title="Daily Project", description="Desc")
    db.add(project)
    db.commit()
    db.refresh(project)
    db.add(ProjectMember(project_id=project.id, user_id=student_user.id, role="contributor"))
    db.commit()

    today_str = datetime.date.today().isoformat()
    response = client.post(
        "/api/v1/daily/start-day",
        headers=auth_headers(student_token),
        json={"project_id": project.id, "date": today_str, "todos": [{"description": "Write tests"}]}
    )
    assert response.status_code == 200
    assert len(response.json()) == 1

def test_daily_get_todos(client, student_token):
    today_str = datetime.date.today().isoformat()
    response = client.get(f"/api/v1/daily/todos?date={today_str}", headers=auth_headers(student_token))
    assert response.status_code == 200

def test_daily_update_todo(client, student_token, db, student_user):
    from app.models.project import Project
    from app.models.daily_activity import DailyTodo
    project = Project(title="P Daily", description="D")
    db.add(project)
    db.commit()
    db.refresh(project)

    todo = DailyTodo(
        user_id=student_user.id,
        project_id=project.id,
        date=datetime.date.today(),
        description="Test Todo",
        status="planned"
    )
    db.add(todo)
    db.commit()
    db.refresh(todo)

    response = client.patch(
        f"/api/v1/daily/todos/{todo.id}",
        headers=auth_headers(student_token),
        json={"status": "done"}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "done"

def test_daily_submit_report_success(client, student_token, db, student_user, mentor_user):
    from app.models.project import Project, ProjectMember
    project = Project(title="Report Proj", description="D", mentor_id=mentor_user.id)
    db.add(project)
    db.commit()
    db.refresh(project)
    db.add(ProjectMember(project_id=project.id, user_id=student_user.id, role="contributor"))
    db.commit()

    today_str = datetime.date.today().isoformat()
    response = client.post(
        "/api/v1/daily/reports",
        headers=auth_headers(student_token),
        json={
            "project_id": project.id,
            "date": today_str,
            "summary": "Completed core module tests",
            "blockers": "None",
            "links": ["https://github.com/codercorps/repo/pull/1"],
            "hours_spent": 4.5
        }
    )
    assert response.status_code == 200

def test_daily_get_reports_mentor(client, mentor_token):
    response = client.get("/api/v1/daily/reports?project_id=1", headers=auth_headers(mentor_token))
    assert response.status_code == 200

def test_daily_feedback_mentor(client, mentor_token, db, student_user, mentor_user):
    from app.models.project import Project
    from app.models.daily_activity import DailyReport
    project = Project(title="Report Proj 2", description="D", mentor_id=mentor_user.id)
    db.add(project)
    db.commit()
    db.refresh(project)

    report = DailyReport(
        user_id=student_user.id,
        project_id=project.id,
        mentor_id=mentor_user.id,
        date=datetime.date.today(),
        summary="Work done",
        hours_spent=3.0
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    response = client.patch(
        f"/api/v1/daily/reports/{report.id}/feedback",
        headers=auth_headers(mentor_token),
        json={"feedback": "Good job"}
    )
    assert response.status_code == 200

def test_daily_feedback_student_forbidden(client, student_token, db, student_user, mentor_user):
    from app.models.project import Project
    from app.models.daily_activity import DailyReport
    project = Project(title="Report Proj 3", description="D", mentor_id=mentor_user.id)
    db.add(project)
    db.commit()
    db.refresh(project)

    report = DailyReport(
        user_id=student_user.id,
        project_id=project.id,
        mentor_id=mentor_user.id,
        date=datetime.date.today(),
        summary="Work done",
        hours_spent=3.0
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    response = client.patch(
        f"/api/v1/daily/reports/{report.id}/feedback",
        headers=auth_headers(student_token),
        json={"feedback": "Self feedback"}
    )
    assert response.status_code == 403

# ---------------------------------------------------------------------------
# NOTIFICATIONS tests
# ---------------------------------------------------------------------------
def test_get_notifications(client, mentor_token):
    response = client.get("/api/v1/notifications/", headers=auth_headers(mentor_token))
    assert response.status_code == 200

def test_read_all_notifications(client, mentor_token):
    response = client.patch("/api/v1/notifications/read-all", headers=auth_headers(mentor_token))
    assert response.status_code == 200

# ---------------------------------------------------------------------------
# PROJECTS tests
# ---------------------------------------------------------------------------
def test_list_projects(client, mentor_token):
    response = client.get("/api/v1/projects/", headers=auth_headers(mentor_token))
    assert response.status_code == 200

def test_create_project_mentor(client, mentor_token):
    response = client.post(
        "/api/v1/projects/",
        headers=auth_headers(mentor_token),
        json={"title": "New Project", "description": "Desc"}
    )
    assert response.status_code == 201

def test_create_project_student_forbidden(client, student_token):
    response = client.post(
        "/api/v1/projects/",
        headers=auth_headers(student_token),
        json={"title": "New Project", "description": "Desc"}
    )
    assert response.status_code == 403

def test_get_project(client, mentor_token, db, mentor_user):
    from app.models.project import Project
    project = Project(title="P1", description="D1", mentor_id=mentor_user.id)
    db.add(project)
    db.commit()
    db.refresh(project)

    response = client.get(f"/api/v1/projects/{project.id}", headers=auth_headers(mentor_token))
    assert response.status_code == 200

def test_project_members_list(client, mentor_token, db, mentor_user):
    from app.models.project import Project
    project = Project(title="P1", description="D1", mentor_id=mentor_user.id)
    db.add(project)
    db.commit()
    db.refresh(project)

    response = client.get(f"/api/v1/projects/{project.id}/members", headers=auth_headers(mentor_token))
    assert response.status_code == 200

def test_add_remove_member(client, mentor_token, db, mentor_user, student_user):
    from app.models.project import Project
    project = Project(title="P1", description="D1", mentor_id=mentor_user.id)
    db.add(project)
    db.commit()
    db.refresh(project)

    response = client.post(
        f"/api/v1/projects/{project.id}/members",
        headers=auth_headers(mentor_token),
        json={"student_id": student_user.id}
    )
    assert response.status_code == 200

    response = client.delete(
        f"/api/v1/projects/{project.id}/members/{student_user.id}",
        headers=auth_headers(mentor_token)
    )
    assert response.status_code == 200

# ---------------------------------------------------------------------------
# PORTFOLIO tests
# ---------------------------------------------------------------------------
def test_portfolio_list(client):
    response = client.get("/api/v1/portfolio")
    assert response.status_code == 200

def test_portfolio_nonexistent(client):
    response = client.get("/api/v1/portfolio/nonexistentuser999")
    assert response.status_code == 404

def test_portfolio_update_me(client, mentor_token):
    response = client.patch(
        "/api/v1/portfolio/me",
        headers=auth_headers(mentor_token),
        json={"bio": "test bio"}
    )
    assert response.status_code == 200

# ---------------------------------------------------------------------------
# DASHBOARD tests
# ---------------------------------------------------------------------------
def test_dashboard_summary(client, mentor_token):
    response = client.get("/api/v1/dashboard/summary", headers=auth_headers(mentor_token))
    assert response.status_code == 200

def test_dashboard_summary_no_auth(client):
    response = client.get("/api/v1/dashboard/summary")
    assert response.status_code == 401

# ---------------------------------------------------------------------------
# MESSAGES tests
# ---------------------------------------------------------------------------
def test_list_message_threads(client, mentor_token):
    response = client.get("/api/v1/messages/threads", headers=auth_headers(mentor_token))
    assert response.status_code == 200

def test_send_message(client, mentor_token, student_user):
    response = client.post(
        "/api/v1/messages",
        headers=auth_headers(mentor_token),
        json={"recipient_id": student_user.id, "content": "Hello"}
    )
    assert response.status_code == 201

def test_get_thread(client, mentor_token, student_user):
    response = client.get(f"/api/v1/messages/thread/{student_user.id}", headers=auth_headers(mentor_token))
    assert response.status_code == 200

# ---------------------------------------------------------------------------
# BADGES tests
# ---------------------------------------------------------------------------
def test_list_badges(client, mentor_token):
    response = client.get("/api/v1/badges/", headers=auth_headers(mentor_token))
    assert response.status_code == 200

def test_my_badges(client, mentor_token):
    response = client.get("/api/v1/badges/my", headers=auth_headers(mentor_token))
    assert response.status_code == 200

def test_create_badge_admin(client, admin_token):
    response = client.post(
        "/api/v1/badges/",
        headers=auth_headers(admin_token),
        json={
            "name": "Test Badge",
            "description": "Test badge description",
            "image_url": "https://example.com/badge.png",
            "criteria_type": "submissions",
            "criteria_value": 5
        }
    )
    assert response.status_code == 201

def test_create_badge_student_forbidden(client, student_token):
    response = client.post(
        "/api/v1/badges/",
        headers=auth_headers(student_token),
        json={
            "name": "Test Badge",
            "description": "Test badge description",
            "image_url": "https://example.com/badge.png",
            "criteria_type": "submissions",
            "criteria_value": 5
        }
    )
    assert response.status_code == 403

# ---------------------------------------------------------------------------
# SUBMISSIONS tests
# ---------------------------------------------------------------------------
def test_create_submission(client, student_token, db, mentor_user):
    from app.models.project import Project
    project = Project(title="Sub Project", description="D1", mentor_id=mentor_user.id)
    db.add(project)
    db.commit()
    db.refresh(project)

    response = client.post(
        "/api/v1/submissions/",
        headers=auth_headers(student_token),
        json={"project_id": project.id, "repo_url": "https://github.com/test/repo"}
    )
    assert response.status_code == 201

def test_get_submission(client, student_token, db, mentor_user, student_user):
    from app.models.project import Project
    from app.models.submission import Submission
    project = Project(title="Sub Project 2", description="D1", mentor_id=mentor_user.id)
    db.add(project)
    db.commit()
    db.refresh(project)

    sub = Submission(project_id=project.id, user_id=student_user.id, repo_url="https://github.com/test/repo", status="submitted")
    db.add(sub)
    db.commit()
    db.refresh(sub)

    response = client.get(f"/api/v1/submissions/{sub.id}", headers=auth_headers(student_token))
    assert response.status_code == 200

def test_review_submission_mentor(client, mentor_token, db, mentor_user, student_user):
    from app.models.project import Project
    from app.models.submission import Submission
    project = Project(title="Sub Project 3", description="D1", mentor_id=mentor_user.id)
    db.add(project)
    db.commit()
    db.refresh(project)

    sub = Submission(project_id=project.id, user_id=student_user.id, repo_url="https://github.com/test/repo", status="submitted")
    db.add(sub)
    db.commit()
    db.refresh(sub)

    response = client.patch(
        f"/api/v1/submissions/{sub.id}/review",
        headers=auth_headers(mentor_token),
        json={"status": "approved", "feedback": "Looks good"}
    )
    assert response.status_code == 200

def test_review_submission_student_forbidden(client, student_token, db, mentor_user, student_user):
    from app.models.project import Project
    from app.models.submission import Submission
    project = Project(title="Sub Project 4", description="D1", mentor_id=mentor_user.id)
    db.add(project)
    db.commit()
    db.refresh(project)

    sub = Submission(project_id=project.id, user_id=student_user.id, repo_url="https://github.com/test/repo", status="submitted")
    db.add(sub)
    db.commit()
    db.refresh(sub)

    response = client.patch(
        f"/api/v1/submissions/{sub.id}/review",
        headers=auth_headers(student_token),
        json={"status": "approved", "feedback": "Looks good"}
    )
    assert response.status_code == 403

# ---------------------------------------------------------------------------
# ACTIVITY tests
# ---------------------------------------------------------------------------
def test_recent_activity(client, mentor_token):
    response = client.get("/api/v1/activity/recent", headers=auth_headers(mentor_token))
    assert response.status_code == 200

# ---------------------------------------------------------------------------
# PUBLIC APPLY tests
# ---------------------------------------------------------------------------
def test_public_apply_success(client):
    response = client.post(
        "/api/v1/apply",
        json={"name": "Candidate", "email": "candidate@test.com", "why_join": "Passionate about coding"}
    )
    assert response.status_code == 200

def test_public_apply_missing_name(client):
    response = client.post(
        "/api/v1/apply",
        json={"email": "candidate@test.com", "why_join": "Passionate about coding"}
    )
    assert response.status_code == 422

def test_get_assessment_status_invalid_token(client):
    response = client.get("/api/v1/assessment/candidate/invalidtoken/status")
    assert response.status_code == 404

# ---------------------------------------------------------------------------
# ROOMS tests
# ---------------------------------------------------------------------------
def test_room_messages_no_auth(client):
    response = client.get("/api/v1/rooms/1/messages")
    assert response.status_code == 401

# ---------------------------------------------------------------------------
# RECRUITERS tests
# ---------------------------------------------------------------------------
def test_recruiter_candidates_list(client, admin_token):
    response = client.get("/api/v1/recruiters/candidates", headers=auth_headers(admin_token))
    assert response.status_code == 200

# ---------------------------------------------------------------------------
# PEER REVIEW tests
# ---------------------------------------------------------------------------
def test_peer_review_incoming(client, mentor_token):
    response = client.get("/api/v1/peer-review/incoming", headers=auth_headers(mentor_token))
    assert response.status_code == 200

def test_peer_review_outgoing(client, mentor_token):
    response = client.get("/api/v1/peer-review/outgoing", headers=auth_headers(mentor_token))
    assert response.status_code == 200
