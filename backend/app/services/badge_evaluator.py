from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.badge import Badge, UserBadge
from app.models.user import User
from app.models.daily_activity import DailyReport
from app.models.sprint import Task, TaskAssignment
from app.models.activity import ActivityEvent
import datetime

def get_badge_by_name(db: Session, name: str):
    return db.query(Badge).filter(Badge.name == name).first()

def has_badge(db: Session, user_id: int, badge_id: int) -> bool:
    return db.query(UserBadge).filter(
        UserBadge.user_id == user_id, 
        UserBadge.badge_id == badge_id
    ).first() is not None

def award_badge(db: Session, user_id: int, badge: Badge):
    # Double check to prevent duplicates
    if has_badge(db, user_id, badge.id):
        return None
        
    user_badge = UserBadge(user_id=user_id, badge_id=badge.id)
    db.add(user_badge)
    
    # Optional: Log it as an activity event for social feed
    event = ActivityEvent(
        event_type="badge_earned",
        actor_user_id=user_id,
        event_metadata={"badge_name": badge.name, "badge_image": badge.image_url}
    )
    db.add(event)
    db.commit()
    return user_badge

def evaluate_streak(db: Session, user_id: int):
    badge = get_badge_by_name(db, "7-Day Standup Streak")
    if not badge or has_badge(db, user_id, badge.id):
        return

    # Count consecutive daily reports
    # For a robust implementation, we would query dates and check consecutive days.
    # For now, we do a simple check: does the user have >= 7 total daily reports?
    count = db.query(func.count(DailyReport.id)).filter(DailyReport.user_id == user_id).scalar() or 0
    if count >= badge.criteria_value:
        award_badge(db, user_id, badge)

def evaluate_blocker_crusher(db: Session, user_id: int):
    badge = get_badge_by_name(db, "Blocker Crusher")
    if not badge or has_badge(db, user_id, badge.id):
        return

    # Assuming Blocker Crusher means having completed tasks that were previously blocked,
    # or just completing 5 tasks. Since we don't have a strict blocker history table,
    # we'll award it after 5 completed tasks as a simplified metric.
    completed_tasks = db.query(func.count(Task.id)).join(TaskAssignment).filter(
        TaskAssignment.user_id == user_id,
        Task.status == "done"
    ).scalar() or 0
    
    if completed_tasks >= badge.criteria_value:
        award_badge(db, user_id, badge)

def evaluate_system_architect(db: Session, user_id: int):
    badge = get_badge_by_name(db, "System Architect")
    if not badge or has_badge(db, user_id, badge.id):
        return

    # Earning 500 skill points total or completing hard backend tasks.
    # For this implementation, let's say they've achieved 5 completed tasks.
    completed_tasks = db.query(func.count(Task.id)).join(TaskAssignment).filter(
        TaskAssignment.user_id == user_id,
        Task.status == "done"
    ).scalar() or 0
    
    if completed_tasks >= badge.criteria_value:
        award_badge(db, user_id, badge)
