import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.deps import get_current_user
from app.models.user import User
from app.models.project import Project, ProjectMember
from app.models.sprint import Sprint, Task, TaskAssignment, TaskSubmission
from app.models.daily_activity import DailyTodo, DailyReport
from app.models.communication import Room, RoomMessage
from app.db.session import SessionLocal
import datetime

client = TestClient(app)

# Helper to override current user
def set_current_user_override(user: User):
    app.dependency_overrides[get_current_user] = lambda: user

def clear_user_override():
    app.dependency_overrides.pop(get_current_user, None)

@pytest.fixture(scope="module")
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture(scope="module")
def setup_test_data(db_session):
    # Retrieve or create test entities
    mentor = db_session.query(User).filter(User.role == "mentor").first()
    student1 = db_session.query(User).filter(User.role == "student").first()
    student2 = db_session.query(User).filter(User.role == "student").offset(1).first()
    
    if not mentor:
        mentor = User(name="Test Mentor", email="t_mentor@test.com", password_hash="hash", role="mentor")
        db_session.add(mentor)
        db_session.commit()
        db_session.refresh(mentor)
        
    if not student1:
        student1 = User(name="Test Student 1", email="t_stud1@test.com", password_hash="hash", role="student")
        db_session.add(student1)
        db_session.commit()
        db_session.refresh(student1)
        
    if not student2:
        student2 = User(name="Test Student 2", email="t_stud2@test.com", password_hash="hash", role="student")
        db_session.add(student2)
        db_session.commit()
        db_session.refresh(student2)

    project = db_session.query(Project).filter(Project.title == "Test Project API").first()
    if not project:
        project = Project(
            title="Test Project API",
            description="Testing phase 2 APIs",
            status="active",
            mentor_id=mentor.id,
            start_date=datetime.datetime.now(),
            end_date=datetime.datetime.now() + datetime.timedelta(days=30)
        )
        db_session.add(project)
        db_session.commit()
        db_session.refresh(project)
        
        # Add mentor as lead member
        db_session.add(ProjectMember(project_id=project.id, user_id=mentor.id, role="lead"))
        db_session.add(ProjectMember(project_id=project.id, user_id=student1.id, role="contributor"))
        db_session.commit()

    sprint = db_session.query(Sprint).filter(Sprint.project_id == project.id).first()
    if not sprint:
        sprint = Sprint(
            project_id=project.id,
            sprint_number=1,
            start_date=datetime.datetime.now(),
            end_date=datetime.datetime.now() + datetime.timedelta(days=14),
            goal="Test sprint"
        )
        db_session.add(sprint)
        db_session.commit()
        db_session.refresh(sprint)

    yield {
        "mentor": mentor,
        "student1": student1,
        "student2": student2,
        "project": project,
        "sprint": sprint
    }

def test_project_members_endpoints(setup_test_data, db_session):
    mentor = setup_test_data["mentor"]
    student2 = setup_test_data["student2"]
    project = setup_test_data["project"]

    # Clear membership for student2 to ensure clean starting state
    db_session.query(ProjectMember).filter(ProjectMember.project_id == project.id, ProjectMember.user_id == student2.id).delete()
    db_session.commit()

    # 1. Assign member (mentor role check)
    set_current_user_override(mentor)
    payload = {"student_id": student2.id}
    res = client.post(f"/api/v1/projects/{project.id}/members", json=payload)
    assert res.status_code == 200
    assert res.json()["status"] == "success"

    # 2. Get members
    res = client.get(f"/api/v1/projects/{project.id}/members")
    assert res.status_code == 200
    members_list = res.json()
    assert any(m["user_id"] == student2.id for m in members_list)

    # 3. Remove member
    res = client.delete(f"/api/v1/projects/{project.id}/members/{student2.id}")
    assert res.status_code == 200
    assert res.json()["status"] == "success"
    
    clear_user_override()

def test_daily_todos_endpoints(setup_test_data, db_session):
    student1 = setup_test_data["student1"]
    project = setup_test_data["project"]
    
    set_current_user_override(student1)
    
    # 1. Start Day
    today = datetime.date.today().isoformat()
    payload = {
        "project_id": project.id,
        "date": today,
        "todos": [
            {"task_id": None, "description": "Implement authentication endpoints"},
            {"task_id": None, "description": "Verify schemas and tests"}
        ]
    }
    res = client.post("/api/v1/daily/start-day", json=payload)
    assert res.status_code == 200
    todos = res.json()
    assert len(todos) == 2
    assert todos[0]["description"] == "Implement authentication endpoints"
    
    todo_id = todos[0]["id"]
    
    # 2. Get daily todos
    res = client.get(f"/api/v1/daily/todos?date={today}")
    assert res.status_code == 200
    assert len(res.json()) >= 2
    
    # 3. Update daily todo status
    res = client.patch(f"/api/v1/daily/todos/{todo_id}", json={"status": "in_progress"})
    assert res.status_code == 200
    assert res.json()["status"] == "in_progress"
    
    clear_user_override()

def test_daily_reports_endpoints(setup_test_data, db_session):
    student1 = setup_test_data["student1"]
    mentor = setup_test_data["mentor"]
    project = setup_test_data["project"]
    
    # 1. Submit Daily Report (student1)
    set_current_user_override(student1)
    today = datetime.date.today().isoformat()
    
    # Clear existing report to avoid duplicate key issues in repeat test runs
    db_session.query(DailyReport).filter(
        DailyReport.user_id == student1.id,
        DailyReport.project_id == project.id,
        DailyReport.date == datetime.date.today()
    ).delete()
    db_session.commit()

    payload = {
        "project_id": project.id,
        "date": today,
        "summary": "Completed DB mapping and unit tests.",
        "blockers": "None",
        "links": ["https://github.com/codercorps/ecommerce-api/pull/1"],
        "hours_spent": 4.5
    }
    res = client.post("/api/v1/daily/reports", json=payload)
    assert res.status_code == 200
    report = res.json()
    assert report["summary"] == "Completed DB mapping and unit tests."
    
    report_id = report["id"]
    
    # 2. Get Reports (mentor)
    set_current_user_override(mentor)
    res = client.get(f"/api/v1/daily/reports?project_id={project.id}")
    assert res.status_code == 200
    reports = res.json()
    assert len(reports) >= 1
    
    # 3. Add feedback (mentor only)
    res = client.patch(f"/api/v1/daily/reports/{report_id}/feedback", json={"feedback": "Excellent work!"})
    assert res.status_code == 200
    assert res.json()["mentor_feedback"] == "Excellent work!"
    
    # 4. Get missing reports (mentor only)
    # Add student2 as contributor for this project to test missing reports
    existing_member = db_session.query(ProjectMember).filter(ProjectMember.project_id == project.id, ProjectMember.user_id == setup_test_data["student2"].id).first()
    if not existing_member:
        db_session.add(ProjectMember(project_id=project.id, user_id=setup_test_data["student2"].id, role="contributor"))
        db_session.commit()

    res = client.get(f"/api/v1/daily/reports/missing?project_id={project.id}&date={today}")
    assert res.status_code == 200
    # student2 hasn't submitted a report yet
    assert any(u["id"] == setup_test_data["student2"].id for u in res.json())
    
    clear_user_override()

def test_communication_rooms(setup_test_data, db_session):
    student1 = setup_test_data["student1"]
    project = setup_test_data["project"]
    
    set_current_user_override(student1)
    
    # Get messages
    res = client.get(f"/api/v1/rooms/{project.id}/messages")
    assert res.status_code == 200
    assert isinstance(res.json(), list)
    
    clear_user_override()

def test_websocket_room(setup_test_data, db_session):
    student1 = setup_test_data["student1"]
    project = setup_test_data["project"]

    from app.core import security
    token = security.create_access_token(subject=str(student1.id))

    with client.websocket_connect(f"/ws/rooms/{project.id}?token={token}") as websocket:
        # Send message
        websocket.send_json({"content": "Hello from WebSocket test!"})
        # Receive broadcast
        data = websocket.receive_json()
        assert data["content"] == "Hello from WebSocket test!"
        assert data["user_name"] == student1.name

def test_notifications_triggers_and_endpoints(setup_test_data, db_session):
    student1 = setup_test_data["student1"]
    mentor = setup_test_data["mentor"]
    project = setup_test_data["project"]

    # 1. Clean existing notifications
    from app.models.notification import Notification
    db_session.query(Notification).filter(Notification.user_id.in_([student1.id, mentor.id])).delete()
    db_session.commit()

    # 2. Submit Daily Report (student1) -> Triggers notification to mentor
    set_current_user_override(student1)
    today = datetime.date.today().isoformat()
    # Clear existing report to avoid duplicate key issues
    db_session.query(DailyReport).filter(
        DailyReport.user_id == student1.id,
        DailyReport.project_id == project.id,
        DailyReport.date == datetime.date.today()
    ).delete()
    db_session.commit()

    payload = {
        "project_id": project.id,
        "date": today,
        "summary": "Working on notification system triggers.",
        "blockers": None,
        "links": [],
        "hours_spent": 2.0
    }
    res = client.post("/api/v1/daily/reports", json=payload)
    assert res.status_code == 200
    report_id = res.json()["id"]

    # 3. Verify Mentor received a notification
    set_current_user_override(mentor)
    res = client.get("/api/v1/notifications/")
    assert res.status_code == 200
    notifs = res.json()
    assert len(notifs) >= 1
    mentor_notif = notifs[0]
    assert mentor_notif["type"] == "report_submitted"
    assert "submitted a daily standup report" in mentor_notif["message"]

    # Mark read
    res = client.patch(f"/api/v1/notifications/{mentor_notif['id']}/read", json={})
    assert res.status_code == 200
    assert res.json()["read_at"] is not None

    # 4. Add Mentor Feedback -> Triggers notification to student1
    set_current_user_override(mentor)
    res = client.patch(f"/api/v1/daily/reports/{report_id}/feedback", json={"feedback": "Nice job!"})
    assert res.status_code == 200

    # Verify student1 received feedback notification
    set_current_user_override(student1)
    res = client.get("/api/v1/notifications/")
    assert res.status_code == 200
    student_notifs = res.json()
    assert len(student_notifs) >= 1
    student_notif = student_notifs[0]
    assert student_notif["type"] == "feedback_added"

    # Mark all read
    res = client.patch("/api/v1/notifications/read-all", json={})
    assert res.status_code == 200
    
    # Verify unread count is 0
    res = client.get("/api/v1/notifications/")
    assert res.status_code == 200
    assert all(n["read_at"] is not None for n in res.json())

    clear_user_override()

def test_accountability_cron_job(setup_test_data, db_session):
    from app.models.notification import Notification
    student1 = setup_test_data["student1"]
    student2 = setup_test_data["student2"]
    project = setup_test_data["project"]

    # 1. Clean existing daily_todos for student1 today
    db_session.query(DailyTodo).filter(
        DailyTodo.user_id == student1.id,
        DailyTodo.date == datetime.date.today()
    ).delete()
    db_session.commit()

    # 2. Add an uncompleted todo (status = planned) for student1 today
    todo = DailyTodo(
        user_id=student1.id,
        project_id=project.id,
        task_id=None,
        date=datetime.date.today(),
        description="Write scheduler specifications",
        status="planned",
        source="self",
        created_at=datetime.datetime.utcnow()
    )
    db_session.add(todo)

    # 3. Clean existing daily_reports for student2 today (ensuring they missed report)
    db_session.query(DailyReport).filter(
        DailyReport.user_id == student2.id,
        DailyReport.date == datetime.date.today()
    ).delete()
    
    # Make sure student2 is active member of this project
    existing_member = db_session.query(ProjectMember).filter(ProjectMember.project_id == project.id, ProjectMember.user_id == student2.id).first()
    if not existing_member:
        db_session.add(ProjectMember(project_id=project.id, user_id=student2.id, role="contributor"))
        
    db_session.query(Notification).filter(
        Notification.user_id == student2.id,
        Notification.type == "missing_report"
    ).delete()
    db_session.commit()

    # 4. Invoke accountability cron job logic
    from app.cron.accountability import run_accountability_job
    run_accountability_job()

    # 5. Assertions:
    # Check if student1's planned todo is carried over
    db_session.refresh(todo)
    assert todo.status == "carried_over"

    # Check if student2 got a missing_report notification specifically for our test project
    notif = db_session.query(Notification).filter(
        Notification.user_id == student2.id,
        Notification.type == "missing_report",
        Notification.message.like(f"%in project '{project.title}'%")
    ).first()
    assert notif is not None
