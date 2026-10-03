import psycopg2

db_url = 'postgresql://postgres.arbhdndsmpzvuliiopru:Coder%402004corps@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres'

conn = psycopg2.connect(db_url)
cur = conn.cursor()

try:
    cur.execute("SELECT name, secret FROM vault.decrypted_secrets;")
    print("Vault secrets:", cur.fetchall())
except Exception as e:
    print("Vault error:", e)

conn.close()
