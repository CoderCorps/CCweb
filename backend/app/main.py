from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1 import auth, programs, projects, submissions, portfolio, dashboard, contact, mentors, activity, certificates, tasks, daily, rooms, notifications, badges
from app.api.v1 import messages, task_comments, announcements, stuck_flags, peer_reviews, reactions, resources, quizzes, webhooks, recruiters, admin, assessments, public_apply, admin_candidates, issue_reports, password_reset

from fastapi.staticfiles import StaticFiles
import os


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


# Async startup event for safe DB initialization without blocking Vercel module import
@app.on_event("startup")
async def startup_event():
    # In Vercel serverless environments, skip synchronous DB seeding to prevent cold start gateway timeouts
    if os.getenv("VERCEL") or os.getenv("VERCEL_ENV"):
        print("[VERCEL]: Serverless environment detected. Skipping startup event.")
        return

    try:
        from app.db.base import Base
        from app.db.session import engine, SessionLocal
        from app.models.user import User
        from app.core import security
        from sqlalchemy import text

        # Base.metadata.create_all(bind=engine)
        # 
        # We comment out the heavy ALTER TABLE statements below because they cause 
        # a 10-second cold start timeout on Vercel's Hobby tier (500 FUNCTION_INVOCATION_FAILED).
        # These migrations have already been run successfully.
        """
        alter_statements = [
            ...
        ]
        """
        
        # Create new tables that might not have been created by Base.metadata.create_all if not imported early enough
        try:
            from app.models.certificate_template import CertificateTemplate, CertificateTemplateField, EmailTemplate, CertificateEmailLog
            Base.metadata.create_all(bind=engine, tables=[
                CertificateTemplate.__table__,
                CertificateTemplateField.__table__,
                EmailTemplate.__table__,
                CertificateEmailLog.__table__
            ])
        except Exception:
            pass

        # Seed initial admin user safely if no admin exists in the database
        db = SessionLocal()
        try:
            import secrets
            admin_user = db.query(User).filter(User.role == "admin").first()
            if not admin_user:
                admin_email = settings.INITIAL_ADMIN_EMAIL or "admin@codercorps.com"
                admin_pass = settings.INITIAL_ADMIN_PASSWORD
                was_generated = False
                if not admin_pass:
                    admin_pass = secrets.token_urlsafe(16)
                    was_generated = True

                admin_user = User(
                    name="System Admin",
                    email=admin_email,
                    password_hash=security.get_password_hash(admin_pass),
                    role="admin",
                    status="active"
                )
                db.add(admin_user)
                db.commit()

                if was_generated:
                    print(f"[STARTUP SECURITY]: Created initial admin ({admin_email}) with generated secure password: {admin_pass}")
                else:
                    print(f"[STARTUP SECURITY]: Created initial admin ({admin_email}) using configured INITIAL_ADMIN_PASSWORD.")
        finally:
            db.close()

    except Exception as e:
        print(f"[STARTUP INIT WARNING]: {e}")

# Include Routers (both /api/v1 and root prefixes for Vercel path compatibility)
from app.api.v1 import certificate_templates, email_templates
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
app.include_router(certificate_templates.router, prefix=f"{settings.API_V1_STR}/certificate-templates", tags=["certificate-templates"])
app.include_router(email_templates.router, prefix=f"{settings.API_V1_STR}/email-templates", tags=["email-templates"])
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
app.include_router(issue_reports.router, prefix=f"{settings.API_V1_STR}/issue-reports", tags=["issue-reports"])
app.include_router(issue_reports.router, prefix="/issue-reports", tags=["issue-reports-root"])
app.include_router(password_reset.router, prefix=f"{settings.API_V1_STR}/auth", tags=["password-reset"])
app.include_router(password_reset.router, prefix="/auth", tags=["password-reset-root"])


# Mount static upload files directory safely (fallback to /tmp on serverless environments like Vercel)
try:
    if os.getenv("VERCEL") or os.getenv("VERCEL_ENV"):
        static_upload_dir = "/tmp/static"
    else:
        static_upload_dir = os.path.join(os.path.dirname(__file__), "static")
    os.makedirs(os.path.join(static_upload_dir, "uploads", "screenshots"), exist_ok=True)
    app.mount("/static", StaticFiles(directory=static_upload_dir), name="static")
except Exception as e:
    print(f"[STATIC MOUNT WARNING]: Could not mount static files: {e}")


@app.get("/")
def read_root():
    return {"message": "Welcome to CoderCorps API. Go to /docs for Swagger documentation."}

@app.get("/health")
def read_health():
    return {"status": "ok"}
