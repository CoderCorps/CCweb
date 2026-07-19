import datetime
from sqlalchemy.orm import Session
from app.db.session import SessionLocal, Base, engine
import app.db.base  # Important: Registers all models
from app.core import security
from app.models.user import User, Profile
from app.models.program import Program
from app.models.project import Project, ProjectMember
from app.models.sprint import Sprint, Task, TaskAssignment, TaskSubmission
from app.models.submission import Submission, Certificate
from app.models.daily_activity import DailyTodo, DailyReport
from app.models.communication import Room, RoomMessage

def seed_db():
    db = SessionLocal()
    try:
        # Drop and recreate all tables for a clean slate
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        
        print("Dropped and recreated all database tables.")

        # 1. Create Users
        admin_pass = security.get_password_hash("admin123")
        mentor_pass = security.get_password_hash("mentor123")
        student_pass = security.get_password_hash("student123")

        admin = User(
            name="Admin System",
            email="admin@codercorps.com",
            password_hash=admin_pass,
            role="admin",
            avatar_url="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"
        )
        mentor = User(
            name="Siddharth Roy",
            email="mentor@codercorps.com",
            password_hash=mentor_pass,
            role="mentor",
            avatar_url="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150"
        )
        student1 = User(
            name="Atul Sharma",
            email="student1@codercorps.com",
            password_hash=student_pass,
            role="student",
            avatar_url="https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150"
        )
        student2 = User(
            name="Priya Patel",
            email="student2@codercorps.com",
            password_hash=student_pass,
            role="student",
            avatar_url="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150"
        )

        db.add_all([admin, mentor, student1, student2])
        db.commit()

        # Refresh to get IDs
        db.refresh(admin)
        db.refresh(mentor)
        db.refresh(student1)
        db.refresh(student2)

        # 2. Create User Profiles
        admin_profile = Profile(
            user_id=admin.id,
            bio="Administrator of the CoderCorps Platform.",
            college="BITS Pilani",
            skills=["System Administration", "DevOps", "Infrastructure"],
            github_url="https://github.com/admin",
            linkedin_url="https://linkedin.com/in/admin",
            is_public=False
        )
        mentor_profile = Profile(
            user_id=mentor.id,
            bio="Senior Staff Engineer with 12+ years experience building cloud services.",
            college="IIT Bombay",
            skills=["System Design", "Python", "Kubernetes", "PostgreSQL", "React"],
            github_url="https://github.com/mentor-siddharth",
            linkedin_url="https://linkedin.com/in/siddharth-roy",
            is_public=True
        )
        student1_profile = Profile(
            user_id=student1.id,
            bio="Aspiring Full Stack Engineer. Love building backend services and distributed systems.",
            college="Delhi Technological University",
            skills=["Python", "JavaScript", "SQL", "React", "Docker"],
            github_url="https://github.com/atulsharma-dev",
            linkedin_url="https://linkedin.com/in/atulsharma",
            is_public=True
        )
        student2_profile = Profile(
            user_id=student2.id,
            bio="Passionate about UI/UX and React frontends. Exploring backend engineering.",
            college="RV College of Engineering",
            skills=["React", "TailwindCSS", "TypeScript", "Node.js"],
            github_url="https://github.com/priyapatel-dev",
            linkedin_url="https://linkedin.com/in/priya-patel",
            is_public=True
        )

        db.add_all([admin_profile, mentor_profile, student1_profile, student2_profile])
        db.commit()

        # 3. Create Programs
        prog_ai = Program(
            title="AI & Machine Learning Engineering Track",
            description="Master PyTorch, fine-tuning large language models, setting up vector databases, and building production-grade LLM applications.",
            track_type="AI"
        )
        prog_web = Program(
            title="Advanced Full-Stack Engineering Track",
            description="Deep dive into Next.js App Router, advanced system architecture, database index tuning, concurrent connections, and microservices.",
            track_type="Web"
        )
        db.add_all([prog_ai, prog_web])
        db.commit()

        # 4. Create Project
        p_start = datetime.datetime.now()
        p_end = p_start + datetime.timedelta(days=45)
        project = Project(
            title="Distributed E-Commerce API Engine",
            description="A high-performance e-commerce API supporting bulk catalogs, real-time inventory updates, and order placement under load.",
            status="active",
            mentor_id=mentor.id,
            start_date=p_start,
            end_date=p_end
        )
        db.add(project)
        db.commit()
        db.refresh(project)

        # 5. Create Project Members
        mentor_member = ProjectMember(project_id=project.id, user_id=mentor.id, role="lead")
        member1 = ProjectMember(project_id=project.id, user_id=student1.id, role="contributor")
        member2 = ProjectMember(project_id=project.id, user_id=student2.id, role="contributor")
        db.add_all([mentor_member, member1, member2])
        db.commit()

        # 6. Create Sprint
        start_date = datetime.datetime.now()
        end_date = start_date + datetime.timedelta(days=14)
        sprint1 = Sprint(
            project_id=project.id,
            sprint_number=1,
            start_date=start_date,
            end_date=end_date,
            goal="Establish base architecture, database models, and authentication."
        )
        db.add(sprint1)
        db.commit()
        db.refresh(sprint1)

        # 7. Create Tasks
        task1 = Task(
            sprint_id=sprint1.id,
            title="Design core DB schema & implement SQLAlchemy models",
            description="Establish standard user, project, sprint, task, and submission tables using clean foreign key integrity.",
            status="done",
            github_pr_url="https://github.com/codercorps/ecommerce-api/pull/1",
            task_mode="individual",
            difficulty="medium",
            due_date=datetime.datetime.now() + datetime.timedelta(days=7)
        )
        task2 = Task(
            sprint_id=sprint1.id,
            title="Set up JWT Authentication & Route Guards",
            description="Implement backend login/signup/refresh logic and frontend route protection context.",
            status="in_progress",
            github_pr_url=None,
            task_mode="individual",
            difficulty="hard",
            due_date=datetime.datetime.now() + datetime.timedelta(days=10)
        )
        task3 = Task(
            sprint_id=sprint1.id,
            title="Create Docker Compose configuration for local testing",
            description="Configure Postgres and backend containers for quick team onboarding.",
            status="todo",
            github_pr_url=None,
            task_mode="competitive",
            difficulty="easy",
            due_date=datetime.datetime.now() + datetime.timedelta(days=5)
        )
        db.add_all([task1, task2, task3])
        db.commit()
        db.refresh(task1)
        db.refresh(task2)
        db.refresh(task3)

        # 8. Create Task Assignments
        assign1 = TaskAssignment(
            task_id=task1.id,
            user_id=student1.id,
            assigned_by_id=mentor.id,
            status="reviewed"
        )
        assign2 = TaskAssignment(
            task_id=task2.id,
            user_id=student2.id,
            assigned_by_id=mentor.id,
            status="in_progress"
        )
        assign3_1 = TaskAssignment(
            task_id=task3.id,
            user_id=student1.id,
            assigned_by_id=mentor.id,
            status="assigned"
        )
        assign3_2 = TaskAssignment(
            task_id=task3.id,
            user_id=student2.id,
            assigned_by_id=mentor.id,
            status="assigned"
        )
        db.add_all([assign1, assign2, assign3_1, assign3_2])
        db.commit()

        # 9. Create Room and Room Messages
        room = Room(project_id=project.id)
        db.add(room)
        db.commit()
        db.refresh(room)

        msg1 = RoomMessage(
            room_id=room.id,
            user_id=mentor.id,
            content="Welcome to the Distributed E-Commerce API Engine team room! Let's build something scalable."
        )
        msg2 = RoomMessage(
            room_id=room.id,
            user_id=student1.id,
            content="Thanks Siddharth! Ready to design the SQLAlchemy schemas."
        )
        db.add_all([msg1, msg2])
        db.commit()

        # 10. Create Skill Galaxy and User Skills
        from app.models.skill import SkillNode, UserSkill
        react_skill = SkillNode(name="React", category="Frontend", description="React framework")
        python_skill = SkillNode(name="Python", category="Backend", description="Python programming")
        aws_skill = SkillNode(name="AWS", category="DevOps", description="Amazon Web Services")
        db.add_all([react_skill, python_skill, aws_skill])
        db.commit()
        db.refresh(react_skill)
        db.refresh(python_skill)
        db.refresh(aws_skill)

        u1_react = UserSkill(user_id=student1.id, skill_id=react_skill.id, proficiency_level=3)
        u1_python = UserSkill(user_id=student1.id, skill_id=python_skill.id, proficiency_level=5)
        u2_react = UserSkill(user_id=student2.id, skill_id=react_skill.id, proficiency_level=4)
        db.add_all([u1_react, u1_python, u2_react])
        db.commit()

        # Update TaskSubmission for portfolio testing
        submission1 = TaskSubmission(
            task_id=task1.id,
            user_id=student1.id,
            repo_url="https://github.com/codercorps/ecommerce-api",
            mentor_score=95,
            ai_score=90,
            ai_feedback_json={"feedback": ["Great job on the schema.", "Consider indexing."]}
        )
        db.add(submission1)
        db.commit()

        print("Database successfully seeded with mock data!")
        
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
