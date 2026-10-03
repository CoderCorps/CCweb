import bcrypt
from sqlalchemy import create_engine, text

engine = create_engine('postgresql://postgres.arbhdndsmpzvuliiopru:Coder%402004corps@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres')
hash = bcrypt.hashpw(b'CoderCorps123!', bcrypt.gensalt()).decode()

with engine.begin() as conn:
    conn.execute(text("UPDATE users SET password_hash = '" + hash + "' WHERE email IN ('admin@codercorps.com', 'itsdevatul@gmail.com', 'atulsharma280@gmail.com', 'atulsharma28092004@gmail.com')"))

print('Passwords reset!')
