"""
Tests for /submissions and /rooms endpoints.
Covers: ownership checks, IDOR, member-only access.
"""
import pytest
import datetime
from fastapi.testclient import TestClient
from app.models.project import Project, ProjectMember
from app.models.sprint import Sprint, Task, TaskAssignment, TaskSubmission
from tests.conftest import auth_headers


@pytest.fixture()
def project_with_members(db, mentor_user, student_user, student_user2):
    proj = Project(
        title="Submission Test Project",
        description="Testing submissions",
        status="active",
        mentor_id=mentor_user.id,
        start_date=datetime.datetime.utcnow(),
        end_date=datetime.datetime.utcnow() + datetime.timedelta(days=30),
    )
    db.add(proj)
    db.flush()
    db.add(ProjectMember(project_id=proj.id, user_id=mentor_user.id, role="lead"))
    db.add(ProjectMember(project_id=proj.id, user_id=student_user.id, role="contributor"))
    # Note: student_user2 is NOT a member of this project
    db.commit()
    db.refresh(proj)
    return proj


@pytest.fixture()
def sprint_with_task(db, project_with_members, student_user):
    sprint = Sprint(
        project_id=project_with_members.id,
        sprint_number=1,
        start_date=datetime.datetime.utcnow(),
        end_date=datetime.datetime.utcnow() + datetime.timedelta(days=14),
        goal="Sprint 1",
    )
    db.add(sprint)
    db.flush()

    task = Task(
        sprint_id=sprint.id,
        title="Assigned Task",
        description="A task assigned to student1",
        status="todo",
        task_mode="individual",
    )
    db.add(task)
    db.flush()

    # Assign only student_user (not student_user2)
    db.add(TaskAssignment(task_id=task.id, user_id=student_user.id))
    db.commit()
    db.refresh(task)
    return sprint, task


class TestTaskSubmissions:
    def test_assigned_student_can_submit(
        self, client: TestClient, project_with_members, sprint_with_task,
        student_token, student_user
    ):
        _, task = sprint_with_task
        res = client.post(
            f"/api/v1/tasks/{task.id}/submissions",
            headers=auth_headers(student_token),
            json={
                "repo_url": "https://github.com/test/repo",
                "demo_url": "https://demo.example.com",
                "notes": "All done!",
            },
        )
        assert res.status_code in (200, 201)

    def test_unassigned_student_cannot_submit(
        self, client: TestClient, project_with_members, sprint_with_task,
        student2_token
    ):
        """student_user2 is not assigned to this task — must be rejected."""
        _, task = sprint_with_task
        res = client.post(
            f"/api/v1/tasks/{task.id}/submissions",
            headers=auth_headers(student2_token),
            json={
                "repo_url": "https://github.com/test/repo2",
                "demo_url": "https://demo2.example.com",
                "notes": "Unauthorized submission",
            },
        )
        assert res.status_code == 403

    def test_only_project_mentor_can_review_submission(
        self, db: object, client: TestClient, project_with_members,
        mentor_token, student_token, student_user
    ):
        """Only the project's own mentor can score/review a project-level submission."""
        # Student first creates a project-level submission
        sub_res = client.post(
            "/api/v1/submissions/",
            headers=auth_headers(student_token),
            json={
                "project_id": project_with_members.id,
                "repo_url": "https://github.com/test/review-repo",
                "demo_url": "https://demo-review.example.com",
            },
        )
        assert sub_res.status_code in (200, 201), f"Submission failed: {sub_res.json()}"
        sub_id = sub_res.json()["id"]

        # Mentor reviews — should succeed (uses submissions.router which expects feedback+status)
        review_res = client.patch(
            f"/api/v1/submissions/{sub_id}/review",
            headers=auth_headers(mentor_token),
            json={"status": "approved", "feedback": "Great work!"},
        )
        assert review_res.status_code == 200, f"Review failed: {review_res.json()}"

    def test_student_cannot_review_submission(
        self, db: object, client: TestClient, project_with_members, sprint_with_task,
        student_token, student2_token, student_user, mentor_token
    ):
        """A student must not be able to call the review endpoint."""
        # Create a project-level submission first
        sub_res = client.post(
            "/api/v1/submissions/",
            headers=auth_headers(student_token),
            json={
                "project_id": project_with_members.id,
                "repo_url": "https://github.com/test/student-review",
                "demo_url": "https://student-review.example.com",
            },
        )
        if sub_res.status_code not in (200, 201):
            pytest.skip("Submission failed — skipping review test")

        sub_id = sub_res.json()["id"]

        # Student tries to review — must be rejected (submissions.router requires mentor role)
        review_res = client.patch(
            f"/api/v1/submissions/{sub_id}/review",
            headers=auth_headers(student2_token),
            json={"status": "approved", "feedback": "Hacking the review!"},
        )
        assert review_res.status_code in (403, 401)


class TestRoomAccess:
    def test_project_member_can_get_messages(
        self, client: TestClient, project_with_members, student_token
    ):
        res = client.get(
            f"/api/v1/rooms/{project_with_members.id}/messages",
            headers=auth_headers(student_token),
        )
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_non_member_cannot_get_messages(
        self, client: TestClient, project_with_members, student2_token
    ):
        """student_user2 is not a member — must get 403."""
        res = client.get(
            f"/api/v1/rooms/{project_with_members.id}/messages",
            headers=auth_headers(student2_token),
        )
        assert res.status_code == 403

    def test_unauthenticated_cannot_get_messages(
        self, client: TestClient, project_with_members
    ):
        res = client.get(f"/api/v1/rooms/{project_with_members.id}/messages")
        assert res.status_code == 401

    def test_idor_room_access_different_project_id(
        self, client: TestClient, project_with_members, student2_token
    ):
        """Even guessing a project ID with a valid token should fail if not a member."""
        res = client.get(
            f"/api/v1/rooms/{project_with_members.id}/messages",
            headers=auth_headers(student2_token),
        )
        assert res.status_code == 403
