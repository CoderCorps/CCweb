import datetime
import argparse
import sys

# Import db base first to ensure all schemas and relationships are compiled in SQLAlchemy
import app.db.base
from app.db.session import SessionLocal
from app.models.user import User
from app.models.project import Project
from app.models.daily_activity import DailyReport
from app.models.sprint import Task, Sprint, StuckFlag, PeerReviewRequest
from app.models.notification import Notification
from sqlalchemy import or_, and_, func

def run_digest_job(mode: str):
    db = SessionLocal()
    try:
        now = datetime.datetime.now(datetime.timezone.utc)
        
        # Determine time window
        if mode == "daily":
            window_start = now - datetime.timedelta(days=1)
            digest_title = "Daily"
        elif mode == "weekly":
            window_start = now - datetime.timedelta(days=7)
            digest_title = "Weekly"
        else:
            print("Invalid mode. Use 'daily' or 'weekly'.")
            return

        # Find all mentors
        mentors = db.query(User).filter(User.role == "mentor").all()
        notification_count = 0

        for mentor in mentors:
            # Get mentor's active projects
            mentor_projects = db.query(Project).filter(
                Project.mentor_id == mentor.id,
                Project.status == "active"
            ).all()
            
            if not mentor_projects:
                continue
                
            project_ids = [p.id for p in mentor_projects]
            
            # Metric 1: Reports submitted since last digest
            new_reports = db.query(DailyReport).filter(
                DailyReport.project_id.in_(project_ids),
                DailyReport.submitted_at >= window_start
            ).count()
            
            # Metric 2: Reports still needing review/feedback
            reports_needing_review = db.query(DailyReport).filter(
                DailyReport.project_id.in_(project_ids),
                or_(
                    DailyReport.mentor_read_at.is_(None),
                    DailyReport.mentor_feedback.is_(None)
                )
            ).count()
            
            # Metric 3: Active unresolved stuck_flags
            active_stuck_flags = db.query(StuckFlag).join(Task).join(Sprint).filter(
                Sprint.project_id.in_(project_ids),
                StuckFlag.resolved_at.is_(None)
            ).count()
            
            # Metric 4: Pending peer reviews older than 48h
            forty_eight_hours_ago = now - datetime.timedelta(hours=48)
            pending_peer_reviews = db.query(PeerReviewRequest).join(Task).join(Sprint).filter(
                Sprint.project_id.in_(project_ids),
                PeerReviewRequest.status != "reviewed",
                PeerReviewRequest.created_at < forty_eight_hours_ago
            ).count()
            
            # Metric 5: Upcoming task due dates in next 2 days
            two_days_from_now = now + datetime.timedelta(days=2)
            upcoming_tasks = db.query(Task).join(Sprint).filter(
                Sprint.project_id.in_(project_ids),
                Task.status != "completed",
                Task.due_date >= now,
                Task.due_date <= two_days_from_now
            ).count()
            
            # Check if we should skip
            if (new_reports == 0 and reports_needing_review == 0 and 
                active_stuck_flags == 0 and pending_peer_reviews == 0 and 
                upcoming_tasks == 0):
                continue
                
            # Create Digest Notification
            message = (f"Your {digest_title} Digest: {new_reports} new reports, "
                       f"{reports_needing_review} need review, {active_stuck_flags} stuck flags, "
                       f"{pending_peer_reviews} pending peer reviews, {upcoming_tasks} upcoming deadlines.")
                       
            notif = Notification(
                user_id=mentor.id,
                type=f"{mode}_digest",
                message=message,
                link="/mentor/dashboard"
            )
            db.add(notif)
            notification_count += 1
            
        db.commit()
        print(f"Dispatched {notification_count} {mode} digest notifications.")
        
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run the digest notification job.")
    parser.add_argument("--daily", action="store_true", help="Run the daily digest")
    parser.add_argument("--weekly", action="store_true", help="Run the weekly digest")
    args = parser.parse_args()

    if args.daily and args.weekly:
        print("Error: Specify either --daily or --weekly, not both.")
        sys.exit(1)
    elif args.daily:
        run_digest_job("daily")
    elif args.weekly:
        run_digest_job("weekly")
    else:
        print("Error: Must specify --daily or --weekly.")
        sys.exit(1)
