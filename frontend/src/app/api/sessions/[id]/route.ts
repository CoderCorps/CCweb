import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id: sessionId } = await context.params;
    const supabase = getSupabaseAdmin();

    const { data: session, error: sErr } = await supabase
      .from('quiz_sessions')
      .select('*, quizzes(title, description)')
      .eq('id', sessionId)
      .single();

    if (sErr || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Get total questions for this quiz
    const { data: questions } = await supabase
      .from('questions')
      .select('id, question_text, option_a, option_b, option_c, option_d, time_limit_seconds, points_base, order_index, image_url')
      .eq('quiz_id', session.quiz_id)
      .order('order_index', { ascending: true });

    // Current question if active
    let currentQuestion = null;
    if (session.current_question_index > 0 && questions && questions.length >= session.current_question_index) {
      currentQuestion = questions[session.current_question_index - 1];
    }

    // Counts
    const { count: participantCount } = await supabase
      .from('session_participants')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId);

    let answeredCount = 0;
    if (currentQuestion) {
      const { count: ansCount } = await supabase
        .from('session_answers')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', sessionId)
        .eq('question_id', currentQuestion.id);
      answeredCount = ansCount || 0;
    }

    // Top participants ranked by score
    const { data: participants } = await supabase
      .from('session_participants')
      .select('id, nickname, total_score')
      .eq('session_id', sessionId)
      .order('total_score', { ascending: false })
      .order('joined_at', { ascending: true })
      .limit(20);

    const leaderboard = (participants || []).map((p: any, idx: number) => ({
      participant_id: p.id,
      nickname: p.nickname,
      score: p.total_score,
      rank: idx + 1,
    }));

    let revealData = null;
    if (session.status === 'reveal' && currentQuestion) {
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

      const { data: qWithCorrect } = await supabase
        .from('questions')
        .select('correct_option')
        .eq('id', currentQuestion.id)
        .single();

      revealData = {
        question_index: session.current_question_index,
        question_id: currentQuestion.id,
        question_text: currentQuestion.question_text,
        options: {
          a: currentQuestion.option_a,
          b: currentQuestion.option_b,
          c: currentQuestion.option_c,
          d: currentQuestion.option_d,
        },
        correct_option: qWithCorrect?.correct_option || 'a',
        stats,
        leaderboard_top10: leaderboard.slice(0, 10),
      };
    }

    return NextResponse.json({
      session,
      quiz: session.quizzes,
      total_questions: questions?.length || 0,
      current_question: currentQuestion,
      participant_count: participantCount || 0,
      answered_count: answeredCount,
      leaderboard,
      reveal_data: revealData,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
