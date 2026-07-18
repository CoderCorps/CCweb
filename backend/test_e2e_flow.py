import json
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import engine, Base

def run_tests():
    print("Initializing test database...")
    Base.metadata.create_all(bind=engine)
    client = TestClient(app)
    
    headers_admin = {}
    headers_mentor = {}
    headers_student = {}
    
    import time
    ts = int(time.time())
    
    print("--- 1. User Creation & Auth ---")
    # Admin
    res = client.post("/api/v1/auth/signup", json={"email": f"admin_{ts}@example.com", "name": "Admin", "password": "password", "role": "admin", "avatar_url": ""})
    if res.status_code == 201:
        headers_admin["Authorization"] = f"Bearer {res.json()['access_token']}"
    else:
        print("Admin signup failed:", res.text)
        return
        
    admin_info = client.get("/api/v1/auth/me", headers=headers_admin).json()
    admin_id = admin_info["id"]

    # Mentor
    res = client.post("/api/v1/auth/signup", json={"email": f"mentor_{ts}@example.com", "name": "Mentor", "password": "password", "role": "mentor", "avatar_url": ""})
    if res.status_code == 201:
        headers_mentor["Authorization"] = f"Bearer {res.json()['access_token']}"
    else:
        print("Mentor signup failed:", res.text)
        return
    mentor_info = client.get("/api/v1/auth/me", headers=headers_mentor).json()
    mentor_id = mentor_info["id"]

    # Student
    res = client.post("/api/v1/auth/signup", json={"email": f"student_{ts}@example.com", "name": "Student", "password": "password", "role": "student", "avatar_url": ""})
    if res.status_code == 201:
        headers_student["Authorization"] = f"Bearer {res.json()['access_token']}"
    else:
        print("Student signup failed:", res.text)
        return
    student_info = client.get("/api/v1/auth/me", headers=headers_student).json()
    student_id = student_info["id"]
    
    print("Users created successfully.")

    print("--- 2. Project Setup (Admin Flow) ---")
    res = client.post("/api/v1/projects/", json={
        "title": "E2E Test Project",
        "description": "Integration testing",
        "repo_url": "https://github.com",
        "mentor_id": mentor_id,
        "is_public": True,
        "tags": ["test"]
    }, headers=headers_admin)
    if res.status_code != 201:
        print("Failed to create project:", res.text)
        return
    project_id = res.json()["id"]
    
    # Add student to project
    res = client.post(f"/api/v1/projects/{project_id}/members", json={
        "student_id": student_id
    }, headers=headers_admin)
    if res.status_code != 200:
        print("Failed to add student to project:", res.text)
        return
    
    print("Project & Member created.")

    print("--- 3. Sprint & Task Creation (Mentor Flow) ---")
    res = client.post(f"/api/v1/projects/{project_id}/sprints", json={
        "sprint_number": 1,
        "start_date": "2026-01-01T00:00:00Z",
        "end_date": "2026-01-14T00:00:00Z",
        "goal": "Test sprint"
    }, headers=headers_mentor)
    if res.status_code != 201:
        print("Failed to create sprint:", res.text)
        return
    sprint_id = res.json()["id"]
    
    # Create Task
    res = client.post(f"/api/v1/projects/{project_id}/sprints/{sprint_id}/tasks", json={
        "title": "Build Login API",
        "description": "Test task",
        "task_mode": "competitive",
        "difficulty": "medium",
        "due_date": "2026-01-10T00:00:00Z"
    }, headers=headers_mentor)
    if res.status_code != 201:
        print("Failed to create task:", res.text)
        return
    task_id = res.json()["id"]
    
    # Assign Task
    res = client.post(f"/api/v1/tasks/{task_id}/assign", json={
        "user_ids": [student_id],
        "mode": "competitive"
    }, headers=headers_mentor)
    if res.status_code != 200:
        print("Failed to assign task:", res.text)
        return
        
    print("Task created and assigned.")

    print("--- 4. Student Work (Student Flow) ---")
    # Dashboard check
    res = client.get("/api/v1/dashboard/summary", headers=headers_student)
    if res.status_code != 200:
        print("Student dashboard failed:", res.text)
        return
    
    # Start Day
    res = client.post("/api/v1/daily/start-day", json={
        "project_id": project_id,
        "date": "2026-01-05",
        "todos": [{"task_id": task_id, "description": "Work on login API"}]
    }, headers=headers_student)
    
    # Add comment to task
    res = client.post(f"/api/v1/tasks/{task_id}/comments", json={"content": "I am working on this"}, headers=headers_student)
    if res.status_code != 201:
        print("Task comment failed:", res.text)
        
    # Submit Task
    res = client.post(f"/api/v1/tasks/{task_id}/submissions", json={
        "repo_url": "https://github.com/my/repo",
        "approach_notes": "I used JWT."
    }, headers=headers_student)
    if res.status_code != 201:
        print("Task submission failed:", res.text)
        return
    submission_id = res.json()["id"]
    
    print("Student work completed.")

    print("--- 5. Mentor Review (Mentor Flow) ---")
    res = client.patch(f"/api/v1/task-submissions/{submission_id}/review", json={
        "mentor_score": 95,
        "mentor_feedback": "Great job"
    }, headers=headers_mentor)
    if res.status_code != 200:
        print("Mentor review failed:", res.text)
        return
        
    print("Mentor reviewed task.")

    print("--- 6. Final Dashboard Check ---")
    res = client.get("/api/v1/dashboard/summary", headers=headers_student)
    if res.status_code != 200:
        print("Student final dashboard failed:", res.text)
        return
        
    print("Final Student Dashboard Stats:", json.dumps(res.json()["stats"], indent=2))
    print("ALL TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()
