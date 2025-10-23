import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Verify user authentication
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    const type = searchParams.get('type');

    // Build query
    let query = supabase
      .from('assets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Filter by project if provided
    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    // Filter by type if provided
    if (type) {
      query = query.eq('type', type);
    }

    const { data: assets, error } = await query;

    if (error) {
      console.error('Failed to fetch assets:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ assets });
  } catch (error) {
    console.error('Fetch assets error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
