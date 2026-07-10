import sys
import os

# Append the current directory to sys.path to resolve module imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import engine
from app.db.base import Base
from app.seed import seed_db

def init():
    print("Connecting to database...")
    try:
        # Drop all tables first to handle schema updates cleanly in this sandbox environment
        print("Dropping existing tables...")
        Base.metadata.drop_all(bind=engine)
        print("Tables dropped successfully!")

        # Create all tables defined in models inside the database engine
        print("Creating new tables...")
        Base.metadata.create_all(bind=engine)
        print("Database tables created successfully!")
        
        # Seed the database with initial structured mock data
        print("Seeding database...")
        seed_db()
        print("Database initialization and seed complete!")
    except Exception as e:
        print(f"Error initializing database: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    init()
