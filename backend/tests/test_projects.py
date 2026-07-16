"""
Tests for /projects endpoints.
Covers: role-based access (mentor vs student), IDOR, ownership checks.
"""
import pytest
import datetime
from fastapi.testclient import TestClient
from app.models.project import Project, ProjectMember
from app.models.sprint import Sprint
from tests.conftest import auth_headers


@pytest.fixture()
def project(db, mentor_user, student_user):
    """Create a test project with mentor as lead and student as contributor."""
    proj = Project(
        title="Test Project",
        description="Test Description",
        status="active",
        mentor_id=mentor_user.id,
        start_date=datetime.datetime.utcnow(),
        end_date=datetime.datetime.utcnow() + datetime.timedelta(days=30),
    )
    db.add(proj)
    db.flush()
    db.add(ProjectMember(project_id=proj.id, user_id=mentor_user.id, role="lead"))
    db.add(ProjectMember(project_id=proj.id, user_id=student_user.id, role="contributor"))
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
        goal="Initial sprint",
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


class TestProjectCreation:
    def test_mentor_can_create_project(self, client: TestClient, mentor_token):
        res = client.post("/api/v1/projects", headers=auth_headers(mentor_token), json={
            "title": "My New Project",
            "description": "Description",
            "status": "active",
            "start_date": datetime.datetime.utcnow().isoformat(),
            "end_date": (datetime.datetime.utcnow() + datetime.timedelta(days=30)).isoformat(),
        })
        assert res.status_code in (200, 201)
        data = res.json()
        assert data["title"] == "My New Project"

    def test_student_cannot_create_project(self, client: TestClient, student_token):
        """Students must be rejected with 403."""
        res = client.post("/api/v1/projects", headers=auth_headers(student_token), json={
            "title": "Student Project",
            "description": "Should fail",
            "status": "active",
            "start_date": datetime.datetime.utcnow().isoformat(),
            "end_date": (datetime.datetime.utcnow() + datetime.timedelta(days=30)).isoformat(),
        })
        assert res.status_code == 403

    def test_unauthenticated_cannot_create_project(self, client: TestClient):
        res = client.post("/api/v1/projects", json={
            "title": "Unauth Project",
            "description": "Should fail",
            "status": "active",
        })
        assert res.status_code == 401


class TestProjectMemberManagement:
    def test_mentor_can_add_member(
        self, client: TestClient, project, mentor_token, student_user2
    ):
        res = client.post(
            f"/api/v1/projects/{project.id}/members",
            headers=auth_headers(mentor_token),
            json={"student_id": student_user2.id},
        )
        assert res.status_code == 200

    def test_student_cannot_add_member(
        self, client: TestClient, project, student_token, student_user2
    ):
        """Students should not be able to add members."""
        res = client.post(
            f"/api/v1/projects/{project.id}/members",
            headers=auth_headers(student_token),
            json={"student_id": student_user2.id},
        )
        assert res.status_code == 403

    def test_mentor_can_remove_member(
        self, client: TestClient, project, mentor_token, student_user
    ):
        res = client.delete(
            f"/api/v1/projects/{project.id}/members/{student_user.id}",
            headers=auth_headers(mentor_token),
        )
        assert res.status_code == 200


class TestProjectAccess:
    def test_project_member_can_get_project(
        self, client: TestClient, project, student_token
    ):
        res = client.get(f"/api/v1/projects/{project.id}",
                         headers=auth_headers(student_token))
        assert res.status_code == 200

    def test_nonmember_cannot_access_room(
        self, client: TestClient, project, student_user2, student2_token
    ):
        """A student not in the project should be rejected from the room."""
        res = client.get(
            f"/api/v1/rooms/{project.id}/messages",
            headers=auth_headers(student2_token),
        )
        assert res.status_code == 403

    def test_idor_project_manage_not_own_mentor(
        self, client: TestClient, project, student_user2, student2_token
    ):
        """A student (or wrong-mentor) should not be able to manage another mentor's project."""
        res = client.post(
            f"/api/v1/projects/{project.id}/members",
            headers=auth_headers(student2_token),
            json={"student_id": student_user2.id},
        )
        assert res.status_code in (403, 401)


class TestSprintCreation:
    def test_mentor_can_create_sprint(
        self, client: TestClient, project, mentor_token
    ):
        res = client.post(
            f"/api/v1/projects/{project.id}/sprints",
            headers=auth_headers(mentor_token),
            json={
                "sprint_number": 2,
                "goal": "Second sprint",
                "start_date": datetime.datetime.utcnow().isoformat(),
                "end_date": (datetime.datetime.utcnow() + datetime.timedelta(days=14)).isoformat(),
            },
        )
        assert res.status_code in (200, 201)

    def test_student_cannot_create_sprint(
        self, client: TestClient, project, student_token
    ):
        res = client.post(
            f"/api/v1/projects/{project.id}/sprints",
            headers=auth_headers(student_token),
            json={
                "sprint_number": 2,
                "goal": "Student sprint",
                "start_date": datetime.datetime.utcnow().isoformat(),
                "end_date": (datetime.datetime.utcnow() + datetime.timedelta(days=14)).isoformat(),
            },
        )
        assert res.status_code == 403
