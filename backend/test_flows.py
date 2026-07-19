import requests
import string
import random
import time

BASE_URL = "http://127.0.0.1:8000/api/v1"

def random_string(length=8):
    return "".join(random.choices(string.ascii_letters, k=length))

def run_tests():
    print("--- Starting End-to-End API Flow Tests ---")
    
    # 1. Register 3 Users: Admin, Mentor, Student
    print("\n--- Registering Users ---")
    admin_email = f"admin_{random_string()}@test.com"
    mentor_email = f"mentor_{random_string()}@test.com"
    student_email = f"student_{random_string()}@test.com"
    password = "password123"

    for email, role, name in [
        (admin_email, "admin", "Test Admin"),
        (mentor_email, "mentor", "Test Mentor"),
        (student_email, "student", "Test Student")
    ]:
        res = requests.post(f"{BASE_URL}/auth/signup", json={
            "name": name,
            "email": email,
            "password": password
        })
        if res.status_code == 200:
            print(f"Registered {role}: {email}")
            # Manually update roles via DB for admin/mentor since register defaults to student
            # Actually, our API might not let us register as admin. Let's rely on DB script if needed,
            # but for now let's see if we can log in.
        else:
            print(f"Failed to register {role}: {res.text}")
            return

    # To properly test, we need the roles set. Let's do that via a direct DB call in python since this is local testing.
    print("\n--- Setting Roles in DB ---")
    import os
    from sqlalchemy import create_engine, text
    from dotenv import load_dotenv
    load_dotenv(".env")
    url = os.getenv("DATABASE_URL")
    engine = create_engine(url)
    with engine.connect() as conn:
        conn.execute(text(f"UPDATE users SET role = 'admin' WHERE email = '{admin_email}'"))
        conn.execute(text(f"UPDATE users SET role = 'mentor' WHERE email = '{mentor_email}'"))
        conn.commit()
    print("Roles updated successfully.")

    # Logins
    def login(email):
        res = requests.post(f"{BASE_URL}/auth/login", data={"username": email, "password": password})
        if res.status_code == 200:
            return res.json()["access_token"]
        print(f"Login failed for {email}: {res.text}")
        return None

    admin_token = login(admin_email)
    mentor_token = login(mentor_email)
    student_token = login(student_email)

    if not all([admin_token, mentor_token, student_token]):
        print("Logins failed, aborting.")
        return

    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    mentor_headers = {"Authorization": f"Bearer {mentor_token}"}
    student_headers = {"Authorization": f"Bearer {student_token}"}

    # Fetch User IDs
    admin_id = requests.get(f"{BASE_URL}/auth/me", headers=admin_headers).json()["id"]
    mentor_id = requests.get(f"{BASE_URL}/auth/me", headers=mentor_headers).json()["id"]
    student_id = requests.get(f"{BASE_URL}/auth/me", headers=student_headers).json()["id"]

    # --- ADMIN FLOW ---
    print("\n--- Testing ADMIN Flow ---")
    # Create Program
    res = requests.post(f"{BASE_URL}/programs/", json={
        "title": "E2E Test Program",
        "description": "Program for testing",
        "cohort": "Test 2026"
    }, headers=admin_headers)
    if res.status_code != 200: print(f"Admin create program failed: {res.text}"); return
    program_id = res.json()["id"]
    print(f"Program created: {program_id}")

    # Create Project
    res = requests.post(f"{BASE_URL}/projects/", json={
        "program_id": program_id,
        "title": "E2E Test Project",
        "description": "Project for testing",
        "mentor_id": mentor_id,
        "github_repo_url": "https://github.com/test/test",
        "tags": ["test"]
    }, headers=admin_headers)
    if res.status_code != 200: print(f"Admin create project failed: {res.text}"); return
    project_id = res.json()["id"]
    print(f"Project created: {project_id}")

    # Assign Student to Project
    res = requests.post(f"{BASE_URL}/projects/{project_id}/members", json={
        "student_id": student_id
    }, headers=admin_headers)
    if res.status_code != 200: print(f"Admin assign student failed: {res.text}"); return
    print(f"Assigned student to project {project_id}")

    # --- MENTOR FLOW ---
    print("\n--- Testing MENTOR Flow ---")
    # Create Sprint
    res = requests.post(f"{BASE_URL}/projects/{project_id}/sprints", json={
        "sprint_number": 1,
        "start_date": "2026-07-01T00:00:00Z",
        "end_date": "2026-07-15T00:00:00Z",
        "goal": "Test sprint goal"
    }, headers=mentor_headers)
    if res.status_code != 200: print(f"Mentor create sprint failed: {res.text}"); return
    sprint_id = res.json()["id"]
    print(f"Sprint created: {sprint_id}")

    # Create Task
    res = requests.post(f"{BASE_URL}/projects/{project_id}/sprints/{sprint_id}/tasks", json={
        "title": "E2E Test Task",
        "description": "Task for testing",
        "status": "todo"
    }, headers=mentor_headers)
    if res.status_code != 200: print(f"Mentor create task failed: {res.text}"); return
    task_id = res.json()["id"]
    print(f"Task created: {task_id}")

    # Assign Task to Student
    res = requests.post(f"{BASE_URL}/tasks/{task_id}/assign", json={
        "user_ids": [student_id],
        "mode": "individual"
    }, headers=mentor_headers)
    if res.status_code != 200: print(f"Mentor assign task failed: {res.text}"); return
    print("Task assigned to student")

    # --- STUDENT FLOW ---
    print("\n--- Testing STUDENT Flow ---")
    # Get Dashboard
    res = requests.get(f"{BASE_URL}/dashboard/student", headers=student_headers)
    if res.status_code != 200: print(f"Student dashboard failed: {res.text}"); return
    print("Student dashboard loaded")

    # Submit Task
    res = requests.post(f"{BASE_URL}/tasks/{task_id}/submissions", json={
        "repo_url": "https://github.com/student/test",
        "demo_url": "https://youtube.com/test",
        "approach_notes": "I wrote code."
    }, headers=student_headers)
    if res.status_code != 200: print(f"Student submit task failed: {res.text}"); return
    submission_id = res.json()["id"]
    print(f"Student submitted task, ID: {submission_id}")

    # Send Message
    res = requests.post(f"{BASE_URL}/messages", json={
        "recipient_id": mentor_id,
        "content": "Hi mentor!"
    }, headers=student_headers)
    if res.status_code != 200: print(f"Student send message failed: {res.text}"); return
    print("Student sent message")

    # --- MENTOR GRADING FLOW ---
    print("\n--- Testing MENTOR GRADING Flow ---")
    # Trigger AI Review
    res = requests.post(f"{BASE_URL}/task-submissions/{submission_id}/ai-review", headers=mentor_headers)
    if res.status_code != 200: print(f"Mentor trigger AI review failed: {res.text}"); return
    print("AI Review triggered")

    # Submit Grade
    res = requests.patch(f"{BASE_URL}/task-submissions/{submission_id}/review", json={
        "mentor_score": 95,
        "mentor_feedback": "Great job."
    }, headers=mentor_headers)
    if res.status_code != 200: print(f"Mentor grading failed: {res.text}"); return
    print("Mentor graded submission")

    print("\n--- ALL TESTS PASSED SUCCESSFULLY! ---")

if __name__ == "__main__":
    run_tests()
