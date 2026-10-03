import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id: quizId } = await context.params;
    const supabase = getSupabaseAdmin();

    const { data: questions, error } = await supabase
      .from('questions')
      .select('*')
      .eq('quiz_id', quizId)
      .order('order_index', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ questions: questions || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id: quizId } = await context.params;
    const body = await req.json();

    const {
      question_text,
      image_url,
      option_a,
      option_b,
      option_c,
      option_d,
      correct_option,
      time_limit_seconds = 20,
      points_base = 1000,
      order_index,
    } = body;

    if (!question_text || !option_a || !option_b || !option_c || !option_d || !correct_option) {
      return NextResponse.json(
        { error: 'Question text, all 4 options, and correct_option (a, b, c, or d) are required' },
        { status: 400 }
      );
    }

    const normCorrect = correct_option.toLowerCase().trim();
    if (!['a', 'b', 'c', 'd'].includes(normCorrect)) {
      return NextResponse.json({ error: 'correct_option must be a, b, c, or d' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Auto-calculate order_index if not supplied
    let nextOrder = order_index;
    if (nextOrder === undefined || nextOrder === null) {
      const { count } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('quiz_id', quizId);
      nextOrder = (count || 0) + 1;
    }

    const { data, error } = await supabase
      .from('questions')
      .insert({
        quiz_id: quizId,
        question_text: question_text.trim(),
        image_url: image_url || null,
        option_a: option_a.trim(),
        option_b: option_b.trim(),
        option_c: option_c.trim(),
        option_d: option_d.trim(),
        correct_option: normCorrect,
        time_limit_seconds: Number(time_limit_seconds) || 20,
        points_base: Number(points_base) || 1000,
        order_index: nextOrder,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ question: data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id: quizId } = await context.params;
    const body = await req.json();
    const { question_id, ...updates } = body;

    if (!question_id) {
      return NextResponse.json({ error: 'question_id is required' }, { status: 400 });
    }

    if (updates.correct_option) {
      updates.correct_option = updates.correct_option.toLowerCase().trim();
      if (!['a', 'b', 'c', 'd'].includes(updates.correct_option)) {
        return NextResponse.json({ error: 'correct_option must be a, b, c, or d' }, { status: 400 });
      }
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('questions')
      .update(updates)
      .eq('id', question_id)
      .eq('quiz_id', quizId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ question: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const { id: quizId } = await context.params;
    const url = new URL(req.url);
    const questionId = url.searchParams.get('question_id');

    if (!questionId) {
      return NextResponse.json({ error: 'question_id query parameter is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('questions')
      .delete()
      .eq('id', questionId)
      .eq('quiz_id', quizId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
