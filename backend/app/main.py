from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1 import auth, programs, projects, submissions, portfolio, dashboard, contact, mentors, activity, certificates, tasks, daily, rooms, notifications, badges
from app.api.v1 import messages, task_comments, announcements, stuck_flags, peer_reviews, reactions, resources, quizzes, webhooks, recruiters, admin, assessments, public_apply, admin_candidates

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Enable CORS for Vercel & local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://c-cweb-u67f.vercel.app",
        "https://c-cweb-three.vercel.app",
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000"
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Run DB migrations on startup
try:
    from app.db.base import Base
    from app.db.session import engine
    from sqlalchemy import text
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        for col_name, col_type in [("linkedin_url", "VARCHAR(500)"), ("github_url", "VARCHAR(500)"), ("resume_url", "VARCHAR(500)"), ("instagram_url", "VARCHAR(500)")]:
            try:
                conn.execute(text(f"ALTER TABLE candidate_applications ADD COLUMN {col_name} {col_type}"))
                conn.commit()
            except Exception:
                pass
except Exception as e:
    print(f"[STARTUP DB MIGRATION ERROR]: {e}")

# Ensure default admin account exists in production database
try:
    from app.db.session import SessionLocal
    from app.models.user import User
    from app.core import security
    db_init = SessionLocal()
    try:
        admin_user = db_init.query(User).filter(User.role == "admin").first()
        if not admin_user:
            print("[STARTUP]: Creating default admin user (admin@codercorps.com)")
            admin_user = User(
                name="Admin System",
                email="admin@codercorps.com",
                password_hash=security.get_password_hash("admin123"),
                role="admin",
                status="active"
            )
            db_init.add(admin_user)
            db_init.commit()
    finally:
        db_init.close()
except Exception as err:
    print(f"[STARTUP ADMIN INIT ERROR]: {err}")

# Include Routers (both /api/v1 and root prefixes for Vercel path compatibility)
app.include_router(public_apply.router, prefix=f"{settings.API_V1_STR}", tags=["public-apply"])
app.include_router(public_apply.router, prefix="", tags=["public-apply-root"])
app.include_router(admin_candidates.router, prefix=f"{settings.API_V1_STR}/admin", tags=["admin-candidates"])
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])

app.include_router(admin.router, prefix=f"{settings.API_V1_STR}/admin", tags=["admin"])
app.include_router(programs.router, prefix=f"{settings.API_V1_STR}/programs", tags=["programs"])
app.include_router(projects.router, prefix=f"{settings.API_V1_STR}/projects", tags=["projects"])
app.include_router(submissions.router, prefix=f"{settings.API_V1_STR}/submissions", tags=["submissions"])
app.include_router(portfolio.router, prefix=f"{settings.API_V1_STR}/portfolio", tags=["portfolio"])
app.include_router(dashboard.router, prefix=f"{settings.API_V1_STR}/dashboard", tags=["dashboard"])
app.include_router(contact.router, prefix=f"{settings.API_V1_STR}/contact", tags=["contact"])
app.include_router(mentors.router, prefix=f"{settings.API_V1_STR}/mentors", tags=["mentors"])
app.include_router(activity.router, prefix=f"{settings.API_V1_STR}/activity", tags=["activity"])
app.include_router(certificates.router, prefix=f"{settings.API_V1_STR}/certificates", tags=["certificates"])
app.include_router(tasks.router, prefix=f"{settings.API_V1_STR}", tags=["tasks"])
app.include_router(daily.router, prefix=f"{settings.API_V1_STR}/daily", tags=["daily"])
app.include_router(rooms.router, tags=["rooms"])
app.include_router(notifications.router, prefix=f"{settings.API_V1_STR}/notifications", tags=["notifications"])
app.include_router(badges.router, prefix=f"{settings.API_V1_STR}/badges", tags=["badges"])
app.include_router(messages.router, prefix=f"{settings.API_V1_STR}/messages", tags=["messages"])
app.include_router(reactions.router, prefix=f"{settings.API_V1_STR}/reactions", tags=["reactions"])
app.include_router(task_comments.router, prefix=f"{settings.API_V1_STR}/task-comments", tags=["task-comments"])
app.include_router(announcements.router, prefix=f"{settings.API_V1_STR}/announcements", tags=["announcements"])
app.include_router(stuck_flags.router, prefix=f"{settings.API_V1_STR}/stuck-flags", tags=["stuck-flags"])
app.include_router(peer_reviews.router, prefix=f"{settings.API_V1_STR}/peer-review", tags=["peer-reviews"])
app.include_router(resources.router, prefix=f"{settings.API_V1_STR}/resources", tags=["resources"])
app.include_router(quizzes.router, prefix=f"{settings.API_V1_STR}/quizzes", tags=["quizzes"])
app.include_router(assessments.router, prefix=f"{settings.API_V1_STR}/assessments", tags=["assessments"])
app.include_router(webhooks.router, prefix=f"{settings.API_V1_STR}/webhooks", tags=["webhooks"])
app.include_router(recruiters.router, prefix=f"{settings.API_V1_STR}/recruiters", tags=["recruiters"])

@app.get("/")
def read_root():
    return {"message": "Welcome to CoderCorps API. Go to /docs for Swagger documentation."}

@app.get("/health")
def read_health():
    return {"status": "ok"}
