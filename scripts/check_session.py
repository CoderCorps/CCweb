import psycopg2

conn = psycopg2.connect('postgresql://postgres.arbhdndsmpzvuliiopru:Coder%402004corps@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres')
cur = conn.cursor()

sess_id = 'ae967edb-b6a2-4d1e-b0e3-1e7a292beac6'
cur.execute(f"SELECT id, status, current_question_index FROM quiz_sessions WHERE id='{sess_id}';")
print('Session:', cur.fetchall())

cur.execute(f"SELECT id, nickname, total_score FROM session_participants WHERE session_id='{sess_id}';")
print('Participants:', cur.fetchall())

cur.execute(f"SELECT id, selected_option, is_correct, points_awarded FROM session_answers WHERE session_id='{sess_id}';")
print('Answers:', cur.fetchall())

conn.close()
