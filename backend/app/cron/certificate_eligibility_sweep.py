from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.program import Program
from app.services.certificate_eligibility import get_eligible_candidates

def run_sweep():
    db = SessionLocal()
    try:
        programs = db.query(Program).all()
        for p in programs:
            eligible = get_eligible_candidates(db, p.id)
            print(f"Program {p.id} ({p.title}): Found {len(eligible)} eligible candidates.")
            # Here we might send a notification to the mentor
    finally:
        db.close()

if __name__ == "__main__":
    run_sweep()

