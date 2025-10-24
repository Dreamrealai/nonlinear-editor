/**
 * Individual Share Link API
 *
 * Handles updating and deleting individual share links
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { RATE_LIMITS } from '@/lib/rateLimit';
import { serverLogger } from '@/lib/serverLogger';
import { validateBoolean, validateUUID, ValidationError } from '@/lib/validation';
import { validationError } from '@/lib/api/response';
import type { ShareLink } from '@/types/collaboration';

/**
 * PATCH - Update a share link (deactivate, change settings)
 */
export const PATCH = withAuth<{ projectId: string; linkId: string }>(
  async (req: NextRequest, { user, supabase }, routeContext): Promise<NextResponse<{ error: string; }> | NextResponse<{ link: ShareLink; }>> => {
    const params = await routeContext?.params;
    const projectId = params?.projectId;
    const linkId = params?.linkId;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      // Validate path parameters
      validateUUID(projectId, 'projectId');
      validateUUID(linkId, 'linkId');

      // Validate request body
      const body = await req.json();
      const { is_active } = body;

      validateBoolean(is_active, 'is_active', { required: true });

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

      // Update share link
      const { data: link, error: updateError } = await supabase
        .from('share_links')
        .update({ is_active })
        .eq('id', linkId)
        .eq('project_id', projectId)
        .select()
        .single();

      if (updateError || !link) {
        serverLogger.error({ error: updateError, linkId, projectId }, 'Failed to update share link');
        return NextResponse.json({ error: 'Failed to update share link' }, { status: 500 });
      }

      // Log activity
      await supabase.from('collaboration_activity').insert({
        project_id: projectId,
        user_id: user.id,
        action: is_active ? 'activated_share_link' : 'deactivated_share_link',
        details: { link_id: linkId },
      });

      return NextResponse.json({ link });
    } catch (error) {
      if (error instanceof ValidationError) {
        return validationError(error.message);
      }
      serverLogger.error({ error, linkId, projectId }, 'Error updating share link');
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  {
    route: '/api/projects/[projectId]/share-links/[linkId]',
    rateLimit: RATE_LIMITS.tier2_resource_creation,
  }
);

/**
 * DELETE - Delete a share link
 */
export const DELETE = withAuth<{ projectId: string; linkId: string }>(
  async (_req: NextRequest, { user, supabase }, routeContext): Promise<NextResponse<{ error: string; }> | NextResponse<{ success: boolean; }>> => {
    const params = await routeContext?.params;
    const projectId = params?.projectId;
    const linkId = params?.linkId;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      // Validate path parameters
      validateUUID(projectId, 'projectId');
      validateUUID(linkId, 'linkId');

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

      // Delete share link
      const { error: deleteError } = await supabase
        .from('share_links')
        .delete()
        .eq('id', linkId)
        .eq('project_id', projectId);

      if (deleteError) {
        serverLogger.error({ error: deleteError, linkId, projectId }, 'Failed to delete share link');
        return NextResponse.json({ error: 'Failed to delete share link' }, { status: 500 });
      }

      // Log activity
      await supabase.from('collaboration_activity').insert({
        project_id: projectId,
        user_id: user.id,
        action: 'deleted_share_link',
        details: { link_id: linkId },
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      if (error instanceof ValidationError) {
        return validationError(error.message);
      }
      serverLogger.error({ error, linkId, projectId }, 'Error deleting share link');
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  {
    route: '/api/projects/[projectId]/share-links/[linkId]',
    rateLimit: RATE_LIMITS.tier2_resource_creation,
  }
);
