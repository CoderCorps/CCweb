import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.core.config import settings

db_url = settings.DATABASE_URL
if ("localhost" in db_url or "127.0.0.1" in db_url) and (os.getenv("VERCEL") or os.getenv("VERCEL_ENV")):
    db_url = "sqlite:////tmp/codercorps.db"

if db_url.startswith("sqlite"):
    engine = create_engine(db_url, connect_args={"check_same_thread": False})
else:
    try:
        engine = create_engine(db_url, pool_pre_ping=True)
    except Exception:
        db_url = "sqlite:////tmp/codercorps.db"
        engine = create_engine(db_url, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass
