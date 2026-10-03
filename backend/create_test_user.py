import bcrypt
from sqlalchemy import create_engine, text

engine = create_engine('postgresql://postgres.arbhdndsmpzvuliiopru:Coder%402004corps@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres')
hash = bcrypt.hashpw(b'password123', bcrypt.gensalt()).decode()

with engine.begin() as conn:
    conn.execute(text("DELETE FROM users WHERE email='test_ai_agent@codercorps.com'"))
    conn.execute(text("INSERT INTO users (name, email, password_hash, role, status) VALUES ('AI Test', 'test_ai_agent@codercorps.com', '" + hash + "', 'student', 'active')"))

print('User created!')
