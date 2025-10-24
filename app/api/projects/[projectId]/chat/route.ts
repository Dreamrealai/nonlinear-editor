/**
 * GET /api/projects/[projectId]/chat
 * Retrieves chat messages for a project
 *
 * DELETE /api/projects/[projectId]/chat
 * Clears all chat messages for a project
 *
 * Security:
 * - Requires authentication
 * - RLS enforces project ownership
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { serverLogger } from '@/lib/serverLogger';
import { validateUUID, ValidationError } from '@/lib/validation';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    // Validate UUID format
    try {
      validateUUID(projectId, 'Project ID');
    } catch (error) {
      if (error instanceof ValidationError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }

    // Create authenticated Supabase client (enforces RLS)
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      serverLogger.warn(
        { projectId, event: 'chat.load.unauthorized' },
        'Unauthorized chat access attempt'
      );
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch chat messages (RLS ensures user owns this project)
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) {
      serverLogger.error(
        { error, projectId, userId: user.id, event: 'chat.load.error' },
        'Failed to load chat messages'
      );
      return NextResponse.json({ error: 'Failed to load chat messages' }, { status: 500 });
    }

    serverLogger.info(
      { projectId, userId: user.id, messageCount: data?.length || 0, event: 'chat.load.success' },
      'Chat messages loaded'
    );

    return NextResponse.json({ messages: data || [] }, { status: 200 });
  } catch (error) {
    serverLogger.error(
      { error, event: 'chat.load.exception' },
      'Unexpected error loading chat messages'
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    // Validate UUID format
    try {
      validateUUID(projectId, 'Project ID');
    } catch (error) {
      if (error instanceof ValidationError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }

    // Create authenticated Supabase client (enforces RLS)
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      serverLogger.warn(
        { projectId, event: 'chat.clear.unauthorized' },
        'Unauthorized chat clear attempt'
      );
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete all chat messages for this project (RLS ensures ownership)
    const { error: deleteError } = await supabase
      .from('chat_messages')
      .delete()
      .eq('project_id', projectId);

    if (deleteError) {
      serverLogger.error(
        { error: deleteError, projectId, userId: user.id, event: 'chat.clear.error' },
        'Failed to clear chat messages'
      );
      return NextResponse.json({ error: 'Failed to clear chat messages' }, { status: 500 });
    }

    serverLogger.info(
      { projectId, userId: user.id, event: 'chat.clear.success' },
      'Chat messages cleared'
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    serverLogger.error(
      { error, event: 'chat.clear.exception' },
      'Unexpected error clearing chat messages'
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
