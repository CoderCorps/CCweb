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

    // 1. Fetch current session
    const { data: session, error: sErr } = await supabase
      .from('quiz_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sErr || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // 2. Fetch current question
    const { data: questions, error: qErr } = await supabase
      .from('questions')
      .select('*')
      .eq('quiz_id', session.quiz_id)
      .order('order_index', { ascending: true });

    if (qErr || !questions || !questions.length) {
      return NextResponse.json({ error: 'No questions found' }, { status: 400 });
    }

    const currentQuestion = questions[(session.current_question_index || 1) - 1];
    if (!currentQuestion) {
      return NextResponse.json({ error: 'Current question not found' }, { status: 400 });
    }

    // 3. Update session status to 'reveal'
    await supabase
      .from('quiz_sessions')
      .update({ status: 'reveal' })
      .eq('id', sessionId);

    // 4. Calculate answer distribution stats for this question
    const { data: answers } = await supabase
      .from('session_answers')
      .select('selected_option')
      .eq('session_id', sessionId)
      .eq('question_id', currentQuestion.id);

    const stats = { a: 0, b: 0, c: 0, d: 0 };
    (answers || []).forEach((ans: any) => {
      const opt = ans.selected_option?.toLowerCase();
      if (opt && opt in stats) {
        stats[opt as keyof typeof stats]++;
      }
    });

    // 5. Get Top 10 leaderboard
    const { data: participants } = await supabase
      .from('session_participants')
      .select('id, nickname, total_score')
      .eq('session_id', sessionId)
      .order('total_score', { ascending: false })
      .order('joined_at', { ascending: true })
      .limit(10);

    const leaderboardTop10 = (participants || []).map((p: any, idx: number) => ({
      participant_id: p.id,
      nickname: p.nickname,
      score: p.total_score,
      rank: idx + 1,
    }));

    // 6. Broadcast question_reveal
    const payload = {
      question_index: session.current_question_index,
      question_id: currentQuestion.id,
      question_text: currentQuestion.question_text,
      options: {
        a: currentQuestion.option_a,
        b: currentQuestion.option_b,
        c: currentQuestion.option_c,
        d: currentQuestion.option_d,
      },
      correct_option: currentQuestion.correct_option,
      stats,
      leaderboard_top10: leaderboardTop10,
    };

    await broadcastToSession(sessionId, 'question_reveal', payload);

    return NextResponse.json(payload);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
