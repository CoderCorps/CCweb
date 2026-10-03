import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, broadcastToSession } from '@/lib/supabaseAdmin';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id: pinOrId } = await context.params;
    const body = await req.json();
    let { nickname, client_token } = body;

    if (!nickname || !nickname.trim()) {
      return NextResponse.json({ error: 'Nickname is required' }, { status: 400 });
    }
    nickname = nickname.trim().slice(0, 24);

    if (!client_token) {
      client_token = randomUUID();
    }

    const supabase = getSupabaseAdmin();
    const cleanParam = (pinOrId || '').trim();

    // Find session by PIN or ID
    let { data: session, error: sessionErr } = await supabase
      .from('quiz_sessions')
      .select('id, quiz_id, status, pin, quizzes(title)')
      .eq('pin', cleanParam)
      .maybeSingle();

    if (!session) {
      const byId = await supabase
        .from('quiz_sessions')
        .select('id, quiz_id, status, pin, quizzes(title)')
        .eq('id', cleanParam)
        .maybeSingle();
      session = byId.data;
      sessionErr = byId.error;
    }

    if (sessionErr || !session) {
      return NextResponse.json({ error: 'Invalid PIN or session not found' }, { status: 404 });
    }

    // Check if player is re-joining with existing token
    const { data: existingParticipant } = await supabase
      .from('session_participants')
      .select('*')
      .eq('session_id', session.id)
      .eq('client_token', client_token)
      .maybeSingle();

    if (existingParticipant) {
      const { count } = await supabase
        .from('session_participants')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', session.id);

      return NextResponse.json({
        participant_id: existingParticipant.id,
        client_token: existingParticipant.client_token,
        session_id: session.id,
        nickname: existingParticipant.nickname,
        quiz_title: (session as any).quizzes?.title || 'Live Quiz',
        status: session.status,
        total_score: existingParticipant.total_score || 0,
        participant_count: count || 1,
      });
    }

    // Anti-cheat / Security rule: Lock joining once status != 'lobby'
    if (session.status !== 'lobby') {
      return NextResponse.json(
        { error: 'This session has already started and is locked for new participants.' },
        { status: 403 }
      );
    }

    // Insert new participant
    const { data: participant, error: pErr } = await supabase
      .from('session_participants')
      .insert({
        session_id: session.id,
        nickname,
        client_token,
        total_score: 0,
      })
      .select()
      .single();

    if (pErr) {
      return NextResponse.json({ error: pErr.message }, { status: 500 });
    }

    // Get count of participants
    const { count: totalParticipants } = await supabase
      .from('session_participants')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', session.id);

    const participantCount = totalParticipants || 1;

    // Broadcast player_joined to session channel
    await broadcastToSession(session.id, 'player_joined', {
      nickname: participant.nickname,
      participant_count: participantCount,
    });

    return NextResponse.json({
      participant_id: participant.id,
      client_token: participant.client_token,
      session_id: session.id,
      nickname: participant.nickname,
      quiz_title: (session as any).quizzes?.title || 'Live Quiz',
      status: session.status,
      participant_count: participantCount,
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
