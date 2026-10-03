import psycopg2

db_url = 'postgresql://postgres.arbhdndsmpzvuliiopru:Coder%402004corps@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres'

conn = psycopg2.connect(db_url)
conn.autocommit = True
cur = conn.cursor()

grant_sql = """
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
"""

cur.execute(grant_sql)
print("Granted schema & table permissions to anon, authenticated, and service_role successfully!")

conn.close()
