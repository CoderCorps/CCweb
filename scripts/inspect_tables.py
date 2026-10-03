import psycopg2

db_url = 'postgresql://postgres.arbhdndsmpzvuliiopru:Coder%402004corps@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres'

conn = psycopg2.connect(db_url)
cur = conn.cursor()

for t in ['quizzes', 'questions', 'quiz_sessions', 'session_participants', 'session_answers']:
    cur.execute(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '{t}';")
    cols = cur.fetchall()
    print(f"Table {t}:", cols)

conn.close()
