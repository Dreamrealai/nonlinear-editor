/**
 * Individual Collaborator API
 *
 * Handles updating and removing collaborators
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { RATE_LIMITS } from '@/lib/rateLimit';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { serverLogger } from '@/lib/serverLogger';
import type { UpdateCollaboratorRequest } from '@/types/collaboration';

/**
 * PATCH - Update a collaborator's role
 */
export const PATCH = withAuth(
  async (
    req: NextRequest,
    { params }: { params: Promise<{ projectId: string; collaboratorId: string }> }
  ) => {
    const { projectId, collaboratorId } = await params;
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const body: UpdateCollaboratorRequest = await req.json();
      const { role } = body;

      if (!role || !['viewer', 'editor', 'admin'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }

      // Verify user owns the project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('user_id')
        .eq('id', projectId)
        .single();

      if (projectError || !project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      if (project.user_id !== user.id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      // Update collaborator role
      const { data: collaborator, error: updateError } = await supabase
        .from('project_collaborators')
        .update({ role })
        .eq('id', collaboratorId)
        .eq('project_id', projectId)
        .select()
        .single();

      if (updateError || !collaborator) {
        serverLogger.error({ error: updateError, collaboratorId, projectId }, 'Failed to update collaborator');
        return NextResponse.json({ error: 'Failed to update collaborator' }, { status: 500 });
      }

      // Log activity
      await supabase.from('collaboration_activity').insert({
        project_id: projectId,
        user_id: user.id,
        action: 'updated_collaborator_role',
        details: {
          collaborator_id: collaboratorId,
          new_role: role,
        },
      });

      return NextResponse.json({ collaborator });
    } catch (error) {
      serverLogger.error({ error, collaboratorId, projectId }, 'Error updating collaborator');
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  RATE_LIMITS.tier2_ai_video_upload
);

/**
 * DELETE - Remove a collaborator
 */
export const DELETE = withAuth(
  async (
    req: NextRequest,
    { params }: { params: Promise<{ projectId: string; collaboratorId: string }> }
  ) => {
    const { projectId, collaboratorId } = await params;
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      // Verify user owns the project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('user_id')
        .eq('id', projectId)
        .single();

      if (projectError || !project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      if (project.user_id !== user.id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      // Get collaborator info before deletion for logging
      const { data: collaborator } = await supabase
        .from('project_collaborators')
        .select('user_id, role')
        .eq('id', collaboratorId)
        .eq('project_id', projectId)
        .single();

      // Delete collaborator
      const { error: deleteError } = await supabase
        .from('project_collaborators')
        .delete()
        .eq('id', collaboratorId)
        .eq('project_id', projectId);

      if (deleteError) {
        serverLogger.error({ error: deleteError, collaboratorId, projectId }, 'Failed to remove collaborator');
        return NextResponse.json({ error: 'Failed to remove collaborator' }, { status: 500 });
      }

      // Log activity
      if (collaborator) {
        await supabase.from('collaboration_activity').insert({
          project_id: projectId,
          user_id: user.id,
          action: 'removed_collaborator',
          details: {
            collaborator_id: collaboratorId,
            removed_user_id: collaborator.user_id,
            role: collaborator.role,
          },
        });
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      serverLogger.error({ error, collaboratorId, projectId }, 'Error removing collaborator');
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  RATE_LIMITS.tier2_ai_video_upload
);
