import datetime
# Import db base first to ensure all schemas and relationships are compiled in SQLAlchemy
import app.db.base
from app.db.session import SessionLocal
from app.models.daily_activity import DailyTodo, DailyReport
from app.models.project import Project, ProjectMember
from app.models.notification import Notification

def run_accountability_job():
    db = SessionLocal()
    try:
        today = datetime.date.today()
        
        # 1. Update daily_todos that are 'planned' or 'in_progress' to 'carried_over'
        uncompleted_todos = db.query(DailyTodo).filter(
            DailyTodo.date == today,
            DailyTodo.status.in_(["planned", "in_progress"])
        ).all()
        
        for todo in uncompleted_todos:
            todo.status = "carried_over"
            
        print(f"Carried over {len(uncompleted_todos)} uncompleted todos.")

        # 2. Find student contributors in active projects who missed daily reports today
        active_projects = db.query(Project).filter(Project.status == "active").all()
        notification_count = 0
        
        for project in active_projects:
            # Get contributor student IDs
            members = db.query(ProjectMember).filter(
                ProjectMember.project_id == project.id,
                ProjectMember.role == "contributor"
            ).all()
            
            for m in members:
                # Check if this student has submitted a daily report for today
                report = db.query(DailyReport).filter(
                    DailyReport.project_id == project.id,
                    DailyReport.user_id == m.user_id,
                    DailyReport.date == today
                ).first()
                
                if not report:
                    # Create notification prompting the student
                    notif = Notification(
                        user_id=m.user_id,
                        type="missing_report",
                        message=f"You missed submitting your daily standup report for {today.isoformat()} in project '{project.title}'.",
                        link="/today"
                    )
                    db.add(notif)
                    notification_count += 1
                    
        db.commit()
        print(f"Dispatched {notification_count} notifications for missing standup reports.")
        
    finally:
        db.close()

if __name__ == "__main__":
    run_accountability_job()
