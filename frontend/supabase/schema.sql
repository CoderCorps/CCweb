-- CoderCorps Live Quiz Platform Schema
-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Quiz definitions (reusable, created by admin)
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Questions for a quiz
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  image_url TEXT,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_option CHAR(1) NOT NULL, -- 'a' | 'b' | 'c' | 'd'
  time_limit_seconds INT DEFAULT 20 NOT NULL,
  points_base INT DEFAULT 1000 NOT NULL,
  order_index INT DEFAULT 0 NOT NULL
);

-- A live instance of a quiz being played
CREATE TABLE IF NOT EXISTS quiz_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE NOT NULL,
  pin CHAR(6) UNIQUE NOT NULL,
  status TEXT CHECK (status IN ('lobby', 'question', 'reveal', 'leaderboard', 'ended')) DEFAULT 'lobby' NOT NULL,
  current_question_index INT DEFAULT 0 NOT NULL,
  question_started_at TIMESTAMPTZ,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  ended_at TIMESTAMPTZ
);

-- Players who joined this session (anonymous, no login)
CREATE TABLE IF NOT EXISTS session_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES quiz_sessions(id) ON DELETE CASCADE NOT NULL,
  nickname TEXT NOT NULL,
  client_token UUID NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  total_score INT DEFAULT 0 NOT NULL
);

-- Answers submitted per question
CREATE TABLE IF NOT EXISTS session_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES quiz_sessions(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE NOT NULL,
  participant_id UUID REFERENCES session_participants(id) ON DELETE CASCADE NOT NULL,
  selected_option CHAR(1) NOT NULL,
  is_correct BOOLEAN NOT NULL,
  response_time_ms INT NOT NULL,
  points_awarded INT DEFAULT 0 NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_answer_per_participant UNIQUE(session_id, question_id, participant_id)
);

-- Indexes for performance & quick lookups
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_pin ON quiz_sessions(pin);
CREATE INDEX IF NOT EXISTS idx_session_answers_session_question ON session_answers(session_id, question_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_session ON session_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_token ON session_participants(session_id, client_token);

-- Enable RLS (Row Level Security) and configure public access policies
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_answers ENABLE ROW LEVEL SECURITY;

-- Allow anonymous select for live gameplay where needed, or service_role full access
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public select for quizzes') THEN
    CREATE POLICY "Public select for quizzes" ON quizzes FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public select for questions') THEN
    CREATE POLICY "Public select for questions" ON questions FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public select for quiz_sessions') THEN
    CREATE POLICY "Public select for quiz_sessions" ON quiz_sessions FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public select for session_participants') THEN
    CREATE POLICY "Public select for session_participants" ON session_participants FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public select for session_answers') THEN
    CREATE POLICY "Public select for session_answers" ON session_answers FOR SELECT USING (true);
  END IF;
END $$;
