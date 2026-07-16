import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'app')))
# Wait, if we run it from backend/, we just import app...

from app.db.session import SessionLocal
from app.db.base import Badge

def seed_badges():
    db = SessionLocal()
    badges = [
        Badge(
            name="7-Day Standup Streak",
            description="Awarded for submitting 7 daily standup reports.",
            image_url="/myassets/Badges/streak.svg",
            criteria_type="streak",
            criteria_value=7
        ),
        Badge(
            name="Blocker Crusher",
            description="Awarded for getting 5 tasks reviewed successfully.",
            image_url="/myassets/Badges/blocker.svg",
            criteria_type="review",
            criteria_value=5
        ),
        Badge(
            name="System Architect",
            description="Awarded for mastering complex backend tasks.",
            image_url="/myassets/Badges/architect.svg",
            criteria_type="points",
            criteria_value=5
        )
    ]
    
    for b in badges:
        existing = db.query(Badge).filter(Badge.name == b.name).first()
        if not existing:
            db.add(b)
            print(f"Added badge: {b.name}")
        else:
            print(f"Badge already exists: {b.name}")
            
    db.commit()
    db.close()
    print("Seeding complete.")

if __name__ == "__main__":
    seed_badges()
