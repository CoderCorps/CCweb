import psycopg2
import os

db_url = 'postgresql://postgres.arbhdndsmpzvuliiopru:Coder%402004corps@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres'

print("Connecting to Supabase Postgres...")
conn = psycopg2.connect(db_url)
conn.autocommit = True
cur = conn.cursor()

with open('frontend/supabase/schema.sql', 'r', encoding='utf-8') as f:
    sql = f.read()

cur.execute(sql)
print("Schema applied successfully!")

cur.execute("""
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name IN ('quizzes', 'questions', 'quiz_sessions', 'session_participants', 'session_answers')
    ORDER BY table_name;
""")
tables = cur.fetchall()
print("Verified tables in database:", [t[0] for t in tables])

# Enable realtime publication for quiz_sessions if not already added
try:
    cur.execute("ALTER PUBLICATION supabase_realtime ADD TABLE quiz_sessions;")
    print("Added quiz_sessions to supabase_realtime publication")
except Exception as e:
    print("Realtime publication note:", e)

conn.close()
