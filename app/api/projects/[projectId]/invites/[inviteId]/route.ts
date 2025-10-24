/**
 * Individual Invite API
 *
 * Handles revoking invitations
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { RATE_LIMITS } from '@/lib/rateLimit';
import { serverLogger } from '@/lib/serverLogger';

/**
 * DELETE - Revoke an invite
 */
export const DELETE = withAuth<{ projectId: string; inviteId: string }>(
  async (req: NextRequest, { user, supabase }, routeContext): Promise<NextResponse<{ error: string; }> | NextResponse<{ success: boolean; }>> => {
    const params = await routeContext?.params;
    const projectId = params?.projectId;
    const inviteId = params?.inviteId;

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

      // Update invite status to revoked
      const { error: updateError } = await supabase
        .from('project_invites')
        .update({ status: 'revoked' })
        .eq('id', inviteId)
        .eq('project_id', projectId);

      if (updateError) {
        serverLogger.error({ error: updateError, inviteId, projectId }, 'Failed to revoke invite');
        return NextResponse.json({ error: 'Failed to revoke invite' }, { status: 500 });
      }

      // Log activity
      await supabase.from('collaboration_activity').insert({
        project_id: projectId,
        user_id: user.id,
        action: 'revoked_invite',
        details: { invite_id: inviteId },
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      serverLogger.error({ error, inviteId, projectId }, 'Error revoking invite');
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  {
    route: '/api/projects/[projectId]/invites/[inviteId]',
    rateLimit: RATE_LIMITS.tier2_ai_video_upload,
  }
);
