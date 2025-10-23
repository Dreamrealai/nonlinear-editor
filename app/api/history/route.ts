import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/history - Fetch user's activity history
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters for pagination
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Fetch activity history for the user
    const { data: history, error } = await supabase
      .from('user_activity_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching activity history:', error);
      return NextResponse.json(
        { error: 'Failed to fetch activity history' },
        { status: 500 }
      );
    }

    return NextResponse.json({ history, count: history?.length || 0 });
  } catch (error) {
    console.error('Error in GET /api/history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/history - Clear user's activity history
export async function DELETE() {
  try {
    const supabase = await createServerSupabaseClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete all activity history for the user
    const { error } = await supabase
      .from('user_activity_history')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      console.error('Error clearing activity history:', error);
      return NextResponse.json(
        { error: 'Failed to clear activity history' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Activity history cleared' });
  } catch (error) {
    console.error('Error in DELETE /api/history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/history - Add a new activity entry (for manual logging)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      project_id,
      activity_type,
      title,
      description,
      model,
      asset_id,
      metadata,
    } = body;

    // Validate activity_type
    const validActivityTypes = [
      'video_generation',
      'audio_generation',
      'image_upload',
      'video_upload',
      'audio_upload',
      'frame_edit',
      'video_upscale',
    ];

    if (!activity_type || !validActivityTypes.includes(activity_type)) {
      return NextResponse.json(
        { error: 'Invalid activity_type' },
        { status: 400 }
      );
    }

    // Insert activity history entry
    const { data, error } = await supabase
      .from('user_activity_history')
      .insert({
        user_id: user.id,
        project_id,
        activity_type,
        title,
        description,
        model,
        asset_id,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding activity history entry:', error);
      return NextResponse.json(
        { error: 'Failed to add activity history entry' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, activity: data });
  } catch (error) {
    console.error('Error in POST /api/history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
