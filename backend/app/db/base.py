# Import all the models so that Base has them before Alembic imports base
from app.db.session import Base
from app.models.user import User, Profile
from app.models.program import Program
from app.models.project import Project, ProjectMember, Resource
from app.models.sprint import Sprint, Task, TaskAssignment, TaskSubmission, TaskComment, StuckFlag, PeerReviewRequest
from app.models.submission import Submission, Certificate
from app.models.activity import ActivityEvent
from app.models.daily_activity import DailyTodo, DailyReport
from app.models.communication import Room, RoomMessage, DirectMessage, Announcement, AnnouncementRead, MessageReaction
from app.models.notification import Notification
