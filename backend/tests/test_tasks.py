"""
Tests for /tasks endpoints.
Covers: task creation role checks, competitive vs individual assignments, IDOR.
"""
import pytest
import datetime
from fastapi.testclient import TestClient
from app.models.project import Project, ProjectMember
from app.models.sprint import Sprint, Task, TaskAssignment
from tests.conftest import auth_headers


@pytest.fixture()
def project(db, mentor_user, student_user, student_user2):
    proj = Project(
        title="Task Test Project",
        description="Testing tasks",
        status="active",
        mentor_id=mentor_user.id,
        start_date=datetime.datetime.utcnow(),
        end_date=datetime.datetime.utcnow() + datetime.timedelta(days=30),
    )
    db.add(proj)
    db.flush()
    db.add(ProjectMember(project_id=proj.id, user_id=mentor_user.id, role="lead"))
    db.add(ProjectMember(project_id=proj.id, user_id=student_user.id, role="contributor"))
    db.add(ProjectMember(project_id=proj.id, user_id=student_user2.id, role="contributor"))
    db.commit()
    db.refresh(proj)
    return proj


@pytest.fixture()
def sprint(db, project):
    s = Sprint(
        project_id=project.id,
        sprint_number=1,
        start_date=datetime.datetime.utcnow(),
        end_date=datetime.datetime.utcnow() + datetime.timedelta(days=14),
        goal="Test sprint",
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


@pytest.fixture()
def individual_task(db, sprint):
    task = Task(
        sprint_id=sprint.id,
        title="Individual Task",
        description="Do something",
        status="todo",
        task_mode="individual",
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


class TestTaskCreation:
    def test_mentor_can_create_task(
        self, client: TestClient, project, sprint, mentor_token
    ):
        res = client.post(
            f"/api/v1/projects/{project.id}/sprints/{sprint.id}/tasks",
            headers=auth_headers(mentor_token),
            json={
                "title": "New Task",
                "description": "Description",
                "status": "todo",
                "task_mode": "individual",
                "difficulty": "medium",
            },
        )
        assert res.status_code in (200, 201)
        data = res.json()
        assert data["title"] == "New Task"

    def test_student_cannot_create_task(
        self, client: TestClient, project, sprint, student_token
    ):
        """Students must not be able to create tasks."""
        res = client.post(
            f"/api/v1/projects/{project.id}/sprints/{sprint.id}/tasks",
            headers=auth_headers(student_token),
            json={
                "title": "Student Task",
                "description": "Should fail",
                "status": "todo",
                "task_mode": "individual",
            },
        )
        assert res.status_code == 403


class TestTaskAssignment:
    def test_mentor_can_assign_task(
        self, client: TestClient, project, sprint, individual_task, mentor_token, student_user
    ):
        res = client.post(
            f"/api/v1/tasks/{individual_task.id}/assign",
            headers=auth_headers(mentor_token),
            json={"user_ids": [student_user.id], "mode": "individual"},
        )
        assert res.status_code == 200

    def test_student_cannot_assign_task_to_others(
        self, client: TestClient, project, individual_task, student_token, student_user2
    ):
        """Students must not be able to assign tasks to other students."""
        res = client.post(
            f"/api/v1/tasks/{individual_task.id}/assign",
            headers=auth_headers(student_token),
            json={"user_ids": [student_user2.id], "mode": "individual"},
        )
        assert res.status_code == 403

    def test_competitive_task_creates_multiple_assignment_rows(
        self, db: object, client: TestClient, project, sprint, mentor_token,
        student_user, student_user2
    ):
        """A competitive task assigned to N students should create N TaskAssignment rows."""
        # 1. Create the competitive task
        create_res = client.post(
            f"/api/v1/projects/{project.id}/sprints/{sprint.id}/tasks",
            headers=auth_headers(mentor_token),
            json={
                "title": "Competitive Task",
                "description": "Race!",
                "status": "todo",
                "task_mode": "competitive",
            },
        )
        assert create_res.status_code in (200, 201)
        task_id = create_res.json()["id"]

        # 2. Assign both students
        assign_res = client.post(
            f"/api/v1/tasks/{task_id}/assign",
            headers=auth_headers(mentor_token),
            json={"user_ids": [student_user.id, student_user2.id], "mode": "competitive"},
        )
        assert assign_res.status_code == 200

        # 3. Verify DB has 2 assignment rows
        rows = db.query(TaskAssignment).filter(TaskAssignment.task_id == task_id).all()
        assert len(rows) == 2
        assigned_user_ids = {r.user_id for r in rows}
        assert student_user.id in assigned_user_ids
        assert student_user2.id in assigned_user_ids


class TestTaskStatusUpdate:
    def test_assigned_student_can_update_task_status(
        self, db: object, client: TestClient, project, individual_task,
        student_token, student_user, mentor_token
    ):
        # First assign the task to the student (creates a TaskAssignment row)
        assign_res = client.post(
            f"/api/v1/tasks/{individual_task.id}/assign",
            headers=auth_headers(mentor_token),
            json={"user_ids": [student_user.id], "mode": "individual"},
        )
        assert assign_res.status_code == 200

        # Get the assignment ID from DB
        assignment = db.query(TaskAssignment).filter(
            TaskAssignment.task_id == individual_task.id,
            TaskAssignment.user_id == student_user.id
        ).first()
        assert assignment is not None, "Assignment not created in DB"

        # Update via the correct route: /task-assignments/{assignment_id}
        res = client.patch(
            f"/api/v1/task-assignments/{assignment.id}",
            headers=auth_headers(student_token),
            json={"status": "in_progress"},
        )
        assert res.status_code == 200
        assert res.json()["status"] == "in_progress"

    def test_unassigned_student_cannot_update_task_status(
        self, db: object, client: TestClient, project, individual_task,
        mentor_token, student_user, student2_token
    ):
        """A student not assigned to a task should not be able to update it."""
        # Assign task to student_user (not student_user2)
        assign_res = client.post(
            f"/api/v1/tasks/{individual_task.id}/assign",
            headers=auth_headers(mentor_token),
            json={"user_ids": [student_user.id], "mode": "individual"},
        )
        assert assign_res.status_code == 200

        assignment = db.query(TaskAssignment).filter(
            TaskAssignment.task_id == individual_task.id,
            TaskAssignment.user_id == student_user.id
        ).first()
        assert assignment is not None

        # student_user2 tries to update — should be 403
        res = client.patch(
            f"/api/v1/task-assignments/{assignment.id}",
            headers=auth_headers(student2_token),
            json={"status": "done"},
        )
        assert res.status_code == 403
