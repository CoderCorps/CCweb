export type SessionStatus = 'lobby' | 'question' | 'reveal' | 'leaderboard' | 'ended';

export interface Quiz {
  id: string;
  title: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Question {
  id: string;
  quiz_id: string;
  question_text: string;
  image_url?: string | null;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: 'a' | 'b' | 'c' | 'd';
  time_limit_seconds: number;
  points_base: number;
  order_index: number;
}

export interface PublicQuestion {
  id: string;
  quiz_id: string;
  question_text: string;
  image_url?: string | null;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  time_limit_seconds: number;
  points_base: number;
  order_index: number;
}

export interface QuizSession {
  id: string;
  quiz_id: string;
  pin: string;
  status: SessionStatus;
  current_question_index: number;
  question_started_at: string | null;
  created_by: string | null;
  created_at: string;
  ended_at: string | null;
}

export interface SessionParticipant {
  id: string;
  session_id: string;
  nickname: string;
  client_token: string;
  joined_at: string;
  total_score: number;
}

export interface SessionAnswer {
  id: string;
  session_id: string;
  question_id: string;
  participant_id: string;
  selected_option: 'a' | 'b' | 'c' | 'd';
  is_correct: boolean;
  response_time_ms: number;
  points_awarded: number;
  submitted_at: string;
}

export interface LeaderboardEntry {
  participant_id: string;
  nickname: string;
  score: number;
  rank: number;
}

export interface PlayerJoinedPayload {
  nickname: string;
  participant_count: number;
}

export interface QuestionStartedPayload {
  question_index: number;
  total_questions: number;
  question_id: string;
  question_text: string;
  options: {
    a: string;
    b: string;
    c: string;
    d: string;
  };
  image_url?: string | null;
  time_limit_seconds: number;
  started_at: string;
}

export interface AnswerLockedPayload {
  participant_count_answered: number;
  total_participants: number;
}

export interface QuestionRevealPayload {
  question_index: number;
  question_id: string;
  correct_option: 'a' | 'b' | 'c' | 'd';
  question_text?: string;
  options?: {
    a: string;
    b: string;
    c: string;
    d: string;
  };
  stats: {
    a: number;
    b: number;
    c: number;
    d: number;
  };
  leaderboard_top10: LeaderboardEntry[];
}

export interface SessionEndedPayload {
  final_leaderboard: LeaderboardEntry[];
}
