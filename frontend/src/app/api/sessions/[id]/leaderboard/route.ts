import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id: sessionId } = await context.params;
    const url = new URL(req.url);
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '10', 10)));

    const supabase = getSupabaseAdmin();

    const { data: participants, error } = await supabase
      .from('session_participants')
      .select('id, nickname, total_score')
      .eq('session_id', sessionId)
      .order('total_score', { ascending: false })
      .order('joined_at', { ascending: true })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { count: totalParticipants } = await supabase
      .from('session_participants')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId);

    const leaderboard = (participants || []).map((p: any, idx: number) => ({
      participant_id: p.id,
      nickname: p.nickname,
      score: p.total_score,
      rank: idx + 1,
    }));

    return NextResponse.json({
      leaderboard,
      total_participants: totalParticipants || 0,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
