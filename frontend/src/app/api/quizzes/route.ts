import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data: quizzes, error } = await supabase
      .from('quizzes')
      .select('*, questions(count)')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formatted = (quizzes || []).map((q: any) => ({
      ...q,
      question_count: q.questions?.[0]?.count || 0,
    }));

    return NextResponse.json({ quizzes: formatted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, description, created_by } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Quiz title is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('quizzes')
      .insert({
        title: title.trim(),
        description: description?.trim() || null,
        created_by: created_by || 'admin',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ quiz: data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
