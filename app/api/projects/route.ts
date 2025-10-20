import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const title = body.title || 'Untitled Project';

    const { data: project, error: dbError } = await supabase
      .from('projects')
      .insert({
        title,
        user_id: user.id,
        timeline_state_jsonb: {}
      })
      .select()
      .single();

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json(project);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
