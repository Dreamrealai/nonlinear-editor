/**
 * Individual Share Link API
 *
 * Handles updating and deleting individual share links
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { RATE_LIMITS } from '@/lib/rateLimit';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { serverLogger } from '@/lib/serverLogger';

/**
 * PATCH - Update a share link (deactivate, change settings)
 */
export const PATCH = withAuth(
  async (req: NextRequest, { params }: { params: Promise<{ projectId: string; linkId: string }> }) => {
    const { projectId, linkId } = await params;
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const body = await req.json();
      const { is_active } = body;

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
      serverLogger.error({ error, linkId, projectId }, 'Error updating share link');
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  RATE_LIMITS.tier2_ai_video_upload
);

/**
 * DELETE - Delete a share link
 */
export const DELETE = withAuth(
  async (req: NextRequest, { params }: { params: Promise<{ projectId: string; linkId: string }> }) => {
    const { projectId, linkId } = await params;
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
      serverLogger.error({ error, linkId, projectId }, 'Error deleting share link');
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  RATE_LIMITS.tier2_ai_video_upload
);
