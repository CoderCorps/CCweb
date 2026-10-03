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

    const endedAt = new Date().toISOString();

    const { data: session, error: updateErr } = await supabase
      .from('quiz_sessions')
      .update({
        status: 'ended',
        ended_at: endedAt,
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Get final leaderboard (top 20)
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
      session,
      final_leaderboard: finalLeaderboard,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
