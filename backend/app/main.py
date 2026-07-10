from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1 import auth, programs, projects, submissions, portfolio, dashboard, contact, mentors, activity, certificates

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set CORS origins
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Include Routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(programs.router, prefix=f"{settings.API_V1_STR}/programs", tags=["programs"])
app.include_router(projects.router, prefix=f"{settings.API_V1_STR}/projects", tags=["projects"])
app.include_router(submissions.router, prefix=f"{settings.API_V1_STR}/submissions", tags=["submissions"])
app.include_router(portfolio.router, prefix=f"{settings.API_V1_STR}/portfolio", tags=["portfolio"])
app.include_router(dashboard.router, prefix=f"{settings.API_V1_STR}/dashboard", tags=["dashboard"])
app.include_router(contact.router, prefix=f"{settings.API_V1_STR}/contact", tags=["contact"])
app.include_router(mentors.router, prefix=f"{settings.API_V1_STR}/mentors", tags=["mentors"])
app.include_router(activity.router, prefix=f"{settings.API_V1_STR}/activity", tags=["activity"])
app.include_router(certificates.router, prefix=f"{settings.API_V1_STR}/certificates", tags=["certificates"])

@app.get("/")
def read_root():
    return {"message": "Welcome to CoderCorps API. Go to /docs for Swagger documentation."}

@app.get("/health")
def read_health():
    return {"status": "ok"}
