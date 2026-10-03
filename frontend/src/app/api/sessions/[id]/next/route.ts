import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, broadcastToSession } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id: sessionId } = await context.params;
    const supabase = getSupabaseAdmin();

    // Fetch current session
    const { data: session, error: sErr } = await supabase
      .from('quiz_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sErr || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.status === 'ended') {
      return NextResponse.json({ error: 'Session has already ended' }, { status: 400 });
    }

    // Fetch all questions for this quiz ordered by order_index
    const { data: questions, error: qErr } = await supabase
      .from('questions')
      .select('*')
      .eq('quiz_id', session.quiz_id)
      .order('order_index', { ascending: true });

    if (qErr || !questions || questions.length === 0) {
      return NextResponse.json({ error: 'No questions found for this quiz' }, { status: 400 });
    }

    // Determine target question index
    // If coming from lobby, index is 1. If coming from reveal or leaderboard, advance by 1.
    const nextQuestionIndex = (session.current_question_index || 0) + 1;

    if (nextQuestionIndex > questions.length) {
      // All questions played: Auto-end session and broadcast final leaderboard
      const endedAt = new Date().toISOString();
      const { data: endedSession } = await supabase
        .from('quiz_sessions')
        .update({
          status: 'ended',
          ended_at: endedAt,
        })
        .eq('id', sessionId)
        .select()
        .single();

      const { data: participants } = await supabase
        .from('session_participants')
        .select('id, nickname, total_score')
        .eq('session_id', sessionId)
        .order('total_score', { ascending: false })
        .order('joined_at', { ascending: true })
        .limit(20);

      const finalLeaderboard = (participants || []).map((p: any, idx: number) => ({
        participant_id: p.id,
        nickname: p.nickname,
        score: p.total_score,
        rank: idx + 1,
      }));

      await broadcastToSession(sessionId, 'session_ended', {
        final_leaderboard: finalLeaderboard,
      });

      return NextResponse.json({
        ended: true,
        session: endedSession,
        final_leaderboard: finalLeaderboard,
      });
    }

    const currentQuestion = questions[nextQuestionIndex - 1];
    const startedAt = new Date().toISOString();

    // Update quiz_session
    const { data: updatedSession, error: updateErr } = await supabase
      .from('quiz_sessions')
      .update({
        status: 'question',
        current_question_index: nextQuestionIndex,
        question_started_at: startedAt,
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Broadcast question_started to all players and host display
    // CRITICAL: NEVER include correct_option in this payload!
    const broadcastPayload = {
      question_index: nextQuestionIndex,
      total_questions: questions.length,
      question_id: currentQuestion.id,
      question_text: currentQuestion.question_text,
      options: {
        a: currentQuestion.option_a,
        b: currentQuestion.option_b,
        c: currentQuestion.option_c,
        d: currentQuestion.option_d,
      },
      image_url: currentQuestion.image_url,
      time_limit_seconds: currentQuestion.time_limit_seconds,
      points_base: currentQuestion.points_base,
      started_at: startedAt,
    };

    await broadcastToSession(sessionId, 'question_started', broadcastPayload);

    return NextResponse.json({
      session: updatedSession,
      question: broadcastPayload,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
