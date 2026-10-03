import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, broadcastToSession, calculatePoints } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id: sessionId } = await context.params;
    const body = await req.json();
    const { question_id, participant_id, client_token, selected_option } = body;

    if (!question_id || !participant_id || !client_token || !selected_option) {
      return NextResponse.json(
        { error: 'Missing question_id, participant_id, client_token, or selected_option' },
        { status: 400 }
      );
    }

    const normOption = selected_option.toLowerCase().trim();
    if (!['a', 'b', 'c', 'd'].includes(normOption)) {
      return NextResponse.json({ error: 'selected_option must be a, b, c, or d' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 1. Validate session state
    const { data: session, error: sErr } = await supabase
      .from('quiz_sessions')
      .select('id, quiz_id, status, current_question_index, question_started_at')
      .eq('id', sessionId)
      .single();

    if (sErr || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.status !== 'question') {
      return NextResponse.json(
        { error: 'Question is not active for answers. Current status: ' + session.status },
        { status: 400 }
      );
    }

    if (!session.question_started_at) {
      return NextResponse.json({ error: 'Question start time not recorded' }, { status: 400 });
    }

    // 2. Validate participant and token
    const { data: participant, error: pErr } = await supabase
      .from('session_participants')
      .select('id, nickname, client_token, total_score')
      .eq('id', participant_id)
      .eq('session_id', sessionId)
      .single();

    if (pErr || !participant || participant.client_token !== client_token) {
      return NextResponse.json({ error: 'Invalid participant credentials' }, { status: 403 });
    }

    // 3. Validate question and fetch server truth (correct_option)
    const { data: question, error: qErr } = await supabase
      .from('questions')
      .select('*')
      .eq('id', question_id)
      .eq('quiz_id', session.quiz_id)
      .single();

    if (qErr || !question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    // 4. Server-side anti-cheat: compute response_time_ms strictly from server timestamp
    const nowMs = Date.now();
    const startedMs = new Date(session.question_started_at).getTime();
    const responseTimeMs = Math.max(50, nowMs - startedMs);

    // Grace period of 3 seconds for network latency over conference Wi-Fi
    const timeLimitMs = (question.time_limit_seconds + 3) * 1000;
    const isWithinTime = responseTimeMs <= timeLimitMs;

    const isCorrect = isWithinTime && normOption === question.correct_option.toLowerCase().trim();
    const pointsAwarded = isCorrect
      ? calculatePoints(true, responseTimeMs, question.time_limit_seconds, question.points_base)
      : 0;

    // 5. Insert answer row (enforces unique constraint per session, question, participant)
    const submittedAt = new Date().toISOString();
    const { data: answerRow, error: ansErr } = await supabase
      .from('session_answers')
      .insert({
        session_id: sessionId,
        question_id,
        participant_id,
        selected_option: normOption,
        is_correct: isCorrect,
        response_time_ms: responseTimeMs,
        points_awarded: pointsAwarded,
        submitted_at: submittedAt,
      })
      .select()
      .single();

    if (ansErr) {
      // Check if duplicate submission
      if (ansErr.code === '23505' || ansErr.message.includes('unique')) {
        return NextResponse.json({ error: 'Answer already submitted for this question' }, { status: 409 });
      }
      return NextResponse.json({ error: ansErr.message }, { status: 500 });
    }

    // 6. Update participant total score if points awarded
    let newTotalScore = participant.total_score;
    if (pointsAwarded > 0) {
      newTotalScore += pointsAwarded;
      await supabase
        .from('session_participants')
        .update({ total_score: newTotalScore })
        .eq('id', participant_id);
    }

    // 7. Get total answered count for this question to broadcast to host display
    const { count: answeredCount } = await supabase
      .from('session_answers')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .eq('question_id', question_id);

    const { count: totalParticipants } = await supabase
      .from('session_participants')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId);

    // Broadcast answer_locked indicator to host
    broadcastToSession(sessionId, 'answer_locked', {
      participant_count_answered: answeredCount || 1,
      total_participants: totalParticipants || 1,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      is_correct: isCorrect,
      correct_option: question.correct_option, // only sent after player has committed answer
      points_awarded: pointsAwarded,
      response_time_ms: responseTimeMs,
      new_total_score: newTotalScore,
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
