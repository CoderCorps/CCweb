import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.core.config import settings

PROD_SUPABASE_DB = "postgresql://postgres.arbhdndsmpzvuliiopru:Coder%402004corps@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres"

db_url = settings.DATABASE_URL
if (os.getenv("VERCEL") or os.getenv("VERCEL_ENV")) and ("localhost" in db_url or "127.0.0.1" in db_url or db_url.startswith("sqlite")):
    db_url = PROD_SUPABASE_DB

if db_url.startswith("sqlite"):
    engine = create_engine(db_url, connect_args={"check_same_thread": False})
else:
    engine = create_engine(db_url, pool_pre_ping=True, pool_recycle=300)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass
