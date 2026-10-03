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

    const { data: quiz, error } = await supabase
      .from('quizzes')
      .select('*, questions(*)')
      .eq('id', quizId)
      .single();

    if (error || !quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    return NextResponse.json({ quiz });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const { id: quizId } = await context.params;
    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from('quizzes')
      .delete()
      .eq('id', quizId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
