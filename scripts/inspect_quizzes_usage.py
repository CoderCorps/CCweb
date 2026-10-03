import psycopg2

db_url = 'postgresql://postgres.arbhdndsmpzvuliiopru:Coder%402004corps@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres'

conn = psycopg2.connect(db_url)
cur = conn.cursor()

cur.execute("SELECT count(*) FROM quizzes;")
print("Quizzes count:", cur.fetchone())

cur.execute("""
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name='quizzes';
""")
print("Foreign keys pointing to quizzes:", cur.fetchall())
conn.close()
