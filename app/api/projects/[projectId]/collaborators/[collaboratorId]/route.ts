/**
 * Individual Collaborator API
 *
 * Handles updating and removing collaborators
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { RATE_LIMITS } from '@/lib/rateLimit';
import { serverLogger } from '@/lib/serverLogger';
import { validateEnum, validateUUID, ValidationError } from '@/lib/validation';
import { validationError } from '@/lib/api/response';
import type { UpdateCollaboratorRequest, ProjectCollaborator } from '@/types/collaboration';

/**
 * PATCH - Update a collaborator's role
 */
export const PATCH = withAuth<{ projectId: string; collaboratorId: string }>(
  async (
    req: NextRequest,
    { user, supabase },
    routeContext
  ): Promise<
    NextResponse<{ error: string }> | NextResponse<{ collaborator: ProjectCollaborator }>
  > => {
    const params = await routeContext?.params;
    const projectId = params?.projectId;
    const collaboratorId = params?.collaboratorId;

    if (!projectId || !collaboratorId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    try {
      // Validate path parameters
      validateUUID(projectId, 'projectId');
      validateUUID(collaboratorId, 'collaboratorId');

      // Validate request body
      const body: UpdateCollaboratorRequest = await req.json();
      const { role } = body;

      validateEnum(role, 'role', ['viewer', 'editor', 'admin'] as const);

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
        serverLogger.error(
          { error: updateError, collaboratorId, projectId },
          'Failed to update collaborator'
        );
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
      if (error instanceof ValidationError) {
        return validationError(error.message);
      }
      serverLogger.error({ error, collaboratorId, projectId }, 'Error updating collaborator');
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  {
    route: '/api/projects/[projectId]/collaborators/[collaboratorId]',
    rateLimit: RATE_LIMITS.tier2_resource_creation,
  }
);

/**
 * DELETE - Remove a collaborator
 */
export const DELETE = withAuth<{ projectId: string; collaboratorId: string }>(
  async (
    _req: NextRequest,
    { user, supabase },
    routeContext
  ): Promise<NextResponse<{ error: string }> | NextResponse<{ success: boolean }>> => {
    const params = await routeContext?.params;
    const projectId = params?.projectId;
    const collaboratorId = params?.collaboratorId;

    if (!projectId || !collaboratorId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    try {
      // Validate path parameters
      validateUUID(projectId, 'projectId');
      validateUUID(collaboratorId, 'collaboratorId');

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
        serverLogger.error(
          { error: deleteError, collaboratorId, projectId },
          'Failed to remove collaborator'
        );
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
      if (error instanceof ValidationError) {
        return validationError(error.message);
      }
      serverLogger.error({ error, collaboratorId, projectId }, 'Error removing collaborator');
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  {
    route: '/api/projects/[projectId]/collaborators/[collaboratorId]',
    rateLimit: RATE_LIMITS.tier2_resource_creation,
  }
);
