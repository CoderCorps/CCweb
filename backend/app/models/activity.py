from sqlalchemy import String, Integer, DateTime, ForeignKey, JSON, func, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base
import datetime

class ActivityEvent(Base):
    __tablename__ = "activity_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    # event_type: 'submission_approved' | 'certificate_issued' | 'project_started' | 'pr_merged'
    event_type: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    actor_user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    project_id: Mapped[int] = mapped_column(Integer, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=func.now(), nullable=False, index=True)
    # Extra info: project title, cert id, etc. — stored as JSON so schema is flexible
    event_metadata: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    # Relationships (read only — no back_populates needed for this log table)
    actor: Mapped["User"] = relationship("User", foreign_keys=[actor_user_id])
    project: Mapped["Project"] = relationship("Project", foreign_keys=[project_id])

