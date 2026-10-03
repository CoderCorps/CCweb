import psycopg2

db_url = 'postgresql://postgres.arbhdndsmpzvuliiopru:Coder%402004corps@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres'

conn = psycopg2.connect(db_url)
conn.autocommit = True
cur = conn.cursor()

# 1. Check and rename legacy tables if they exist
legacy_renames = [
    ("quiz_questions", "legacy_quiz_questions"),
    ("user_quiz_attempts", "legacy_user_quiz_attempts"),
    ("quizzes", "legacy_quizzes"),
]

for old_name, new_name in legacy_renames:
    cur.execute(f"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '{old_name}');")
    exists = cur.fetchone()[0]
    if exists:
        print(f"Renaming {old_name} to {new_name}...")
        cur.execute(f"ALTER TABLE {old_name} RENAME TO {new_name};")

# 2. Read and apply schema.sql
with open('frontend/supabase/schema.sql', 'r', encoding='utf-8') as f:
    sql = f.read()

cur.execute(sql)
print("Applied frontend/supabase/schema.sql successfully!")

# 3. Verify created tables
cur.execute("""
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name IN ('quizzes', 'questions', 'quiz_sessions', 'session_participants', 'session_answers')
    ORDER BY table_name;
""")
tables = cur.fetchall()
print("Created tables in Supabase Postgres:", [t[0] for t in tables])

# 4. Enable realtime publication for quiz_sessions if possible
try:
    cur.execute("ALTER PUBLICATION supabase_realtime ADD TABLE quiz_sessions;")
    print("Added quiz_sessions to supabase_realtime publication")
except Exception as e:
    print("supabase_realtime note:", e)

conn.close()
