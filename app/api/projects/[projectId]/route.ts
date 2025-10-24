/**
 * DELETE /api/projects/[projectId]
 *
 * Deletes a project and all associated resources
 *
 * Security:
 * - Requires authentication
 * - Validates project ownership via RLS
 * - Cascading delete handled by database
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { serverLogger } from '@/lib/serverLogger';
import { validateUUID, ValidationError } from '@/lib/validation';

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
      if (error instanceof ValidationError || (error as Error).name === 'ValidationError') {
        return NextResponse.json({ error: (error as Error).message }, { status: 400 });
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
        { projectId, event: 'project.delete.unauthorized' },
        'Unauthorized delete attempt'
      );
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete project (RLS ensures user owns this project)
    const { error: deleteError } = await supabase.from('projects').delete().eq('id', projectId);

    if (deleteError) {
      serverLogger.error(
        { error: deleteError, projectId, userId: user.id, event: 'project.delete.error' },
        'Failed to delete project'
      );
      return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
    }

    serverLogger.info(
      { projectId, userId: user.id, event: 'project.delete.success' },
      'Project deleted successfully'
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    serverLogger.error(
      { error, event: 'project.delete.exception' },
      'Unexpected error during project deletion'
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
