import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, generatePin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { quiz_id, created_by } = body;

    if (!quiz_id) {
      return NextResponse.json({ error: 'quiz_id is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Verify quiz exists and has questions
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id, title')
      .eq('id', quiz_id)
      .single();

    if (quizError || !quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    const { count, error: qCountError } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('quiz_id', quiz_id);

    if (qCountError || !count || count === 0) {
      return NextResponse.json({ error: 'Quiz must have at least 1 question before launching' }, { status: 400 });
    }

    // Generate unique 6-digit PIN
    let pin = generatePin();
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      const { data: existing } = await supabase
        .from('quiz_sessions')
        .select('id')
        .eq('pin', pin)
        .eq('status', 'lobby')
        .maybeSingle();

      if (!existing) {
        isUnique = true;
      } else {
        pin = generatePin();
        attempts++;
      }
    }

    const { data: session, error: sessionError } = await supabase
      .from('quiz_sessions')
      .insert({
        quiz_id,
        pin,
        status: 'lobby',
        current_question_index: 0,
        question_started_at: null,
        created_by: created_by || 'admin',
      })
      .select()
      .single();

    if (sessionError) {
      return NextResponse.json({ error: sessionError.message }, { status: 500 });
    }

    return NextResponse.json({
      session,
      quiz_title: quiz.title,
      total_questions: count,
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
