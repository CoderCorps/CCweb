import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy.pool import NullPool
from app.core.config import settings

PROD_SUPABASE_DB = "postgresql+psycopg2://postgres.arbhdndsmpzvuliiopru:Coder%402004corps@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?sslmode=require"

db_url = settings.DATABASE_URL
if (os.getenv("VERCEL") or os.getenv("VERCEL_ENV")) and ("localhost" in db_url or "127.0.0.1" in db_url or db_url.startswith("sqlite")):
    db_url = PROD_SUPABASE_DB

if "supabase" in db_url and "sslmode" not in db_url:
    db_url += ("&" if "?" in db_url else "?") + "sslmode=require"

# Ensure SQLAlchemy uses psycopg2 driver (not psycopg v3 which isn't installed).
# SQLAlchemy 2.x defaults bare "postgresql://" to the psycopg (v3) dialect.
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

if db_url.startswith("sqlite"):
    engine = create_engine(db_url, connect_args={"check_same_thread": False})
elif os.getenv("VERCEL") or os.getenv("VERCEL_ENV"):
    engine = create_engine(
        db_url,
        poolclass=NullPool,
        connect_args={"connect_timeout": 10}
    )
else:
    engine = create_engine(db_url, pool_pre_ping=True, pool_recycle=300)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass
