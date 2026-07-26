import datetime
import logging
# Ensure db base imports register all models
import app.db.base
from app.db.session import SessionLocal
from app.models.candidate import AssessmentInvitation, ReminderLog
from app.services.email_service import send_reminder_email

logger = logging.getLogger(__name__)

def run_assessment_sweeps():
    """
    Runs automated expiry sweep followed by reminder sweep.
    IMPORTANT: Expiry sweep MUST run FIRST so expired invitations do not receive reminders.
    """
    db = SessionLocal()
    try:
        now = datetime.datetime.utcnow()

        # ------------------------------------------------------------------
        # 1. EXPIRY SWEEP (First)
        # ------------------------------------------------------------------
        expired_invitations = db.query(AssessmentInvitation).filter(
            AssessmentInvitation.status.in_(["pending", "in_progress"]),
            AssessmentInvitation.expires_at < now
        ).all()

        for inv in expired_invitations:
            inv.status = "expired"

        if expired_invitations:
            db.commit()
            logger.info(f"[EXPIRY SWEEP] Marked {len(expired_invitations)} invitations as expired.")

        # ------------------------------------------------------------------
        # 2. REMINDER SWEEP (Second)
        # ------------------------------------------------------------------
        active_invitations = db.query(AssessmentInvitation).filter(
            AssessmentInvitation.status.in_(["pending", "in_progress"])
        ).all()

        reminder_count = 0

        for inv in active_invitations:
            # Check elapsed hours since creation
            elapsed_seconds = (now - inv.created_at).total_seconds()
            elapsed_hours = elapsed_seconds / 3600.0

            # Get existing logged reminder numbers for this invitation
            logged_numbers = {
                log.reminder_number for log in db.query(ReminderLog).filter(
                    ReminderLog.invitation_id == inv.id
                ).all()
            }

            candidate_name = inv.application.name if inv.application else "Candidate"
            to_email = inv.application.email if inv.application else ""
            expires_at_str = inv.expires_at.strftime("%Y-%m-%d %H:%M UTC")

            # Check +18h reminder (reminder 3)
            if elapsed_hours >= 18.0 and 3 not in logged_numbers:
                msg_id = send_reminder_email(to_email, candidate_name, inv.token, 3, expires_at_str)
                if msg_id:
                    db.add(ReminderLog(invitation_id=inv.id, reminder_number=3, sent_at=now, email_provider_message_id=msg_id))
                    reminder_count += 1

            # Check +12h reminder (reminder 2)
            elif elapsed_hours >= 12.0 and 2 not in logged_numbers:
                msg_id = send_reminder_email(to_email, candidate_name, inv.token, 2, expires_at_str)
                if msg_id:
                    db.add(ReminderLog(invitation_id=inv.id, reminder_number=2, sent_at=now, email_provider_message_id=msg_id))
                    reminder_count += 1

            # Check +6h reminder (reminder 1)
            elif elapsed_hours >= 6.0 and 1 not in logged_numbers:
                msg_id = send_reminder_email(to_email, candidate_name, inv.token, 1, expires_at_str)
                if msg_id:
                    db.add(ReminderLog(invitation_id=inv.id, reminder_number=1, sent_at=now, email_provider_message_id=msg_id))
                    reminder_count += 1

        if reminder_count > 0:
            db.commit()
            logger.info(f"[REMINDER SWEEP] Dispatched {reminder_count} reminder emails.")

    except Exception as e:
        logger.error(f"Error executing assessment sweeps: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_assessment_sweeps()
