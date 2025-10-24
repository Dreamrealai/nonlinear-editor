/**
 * POST /api/projects/[projectId]/chat/messages
 * Saves a chat message to the database
 *
 * Security:
 * - Requires authentication
 * - RLS enforces project ownership
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { serverLogger } from '@/lib/serverLogger';
import { validateUUID, ValidationError } from '@/lib/validation';

export async function POST(
  request: NextRequest,
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
        { projectId, event: 'chat.save.unauthorized' },
        'Unauthorized chat save attempt'
      );
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { role, content, model, attachments } = body;

    // Validate required fields
    if (
      typeof role !== 'string' ||
      role.trim().length === 0 ||
      typeof content !== 'string' ||
      content.trim().length === 0
    ) {
      return NextResponse.json(
        { error: 'Missing required fields: role and content' },
        { status: 400 }
      );
    }

    // Validate role
    if (role !== 'user' && role !== 'assistant') {
      return NextResponse.json(
        { error: 'Invalid role. Must be "user" or "assistant"' },
        { status: 400 }
      );
    }

    // Insert message (RLS ensures ownership)
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        project_id: projectId,
        role,
        content,
        model: model || null,
        attachments: attachments || null,
      })
      .select()
      .single();

    if (error) {
      serverLogger.error(
        { error, projectId, userId: user.id, event: 'chat.save.error' },
        'Failed to save chat message'
      );
      return NextResponse.json({ error: 'Failed to save chat message' }, { status: 500 });
    }

    serverLogger.info(
      { projectId, userId: user.id, role, event: 'chat.save.success' },
      'Chat message saved'
    );

    return NextResponse.json({ message: data }, { status: 201 });
  } catch (error) {
    serverLogger.error(
      { error, event: 'chat.save.exception' },
      'Unexpected error saving chat message'
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
