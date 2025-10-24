/**
 * Collaboration Activity API
 *
 * Handles fetching activity logs for a project
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { RATE_LIMITS } from '@/lib/rateLimit';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { serverLogger } from '@/lib/serverLogger';

/**
 * GET - Get activity log for a project
 */
export const GET = withAuth(
  async (req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) => {
    const { projectId } = await params;
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      // Get query parameters
      const { searchParams } = new URL(req.url);
      const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
      const offset = parseInt(searchParams.get('offset') || '0');

      // Verify user has access to the project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('user_id')
        .eq('id', projectId)
        .single();

      if (projectError || !project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      // Check if user is owner or collaborator
      const isOwner = project.user_id === user.id;
      if (!isOwner) {
        const { data: collab } = await supabase
          .from('project_collaborators')
          .select('id')
          .eq('project_id', projectId)
          .eq('user_id', user.id)
          .single();

        if (!collab) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
      }

      // Get activity log
      const { data: activities, error, count } = await supabase
        .from('collaboration_activity')
        .select('*', { count: 'exact' })
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        serverLogger.error({ error, projectId, userId: user.id }, 'Failed to fetch activity log');
        return NextResponse.json({ error: 'Failed to fetch activity log' }, { status: 500 });
      }

      return NextResponse.json({
        activities: activities || [],
        total: count || 0,
        limit,
        offset,
      });
    } catch (error) {
      serverLogger.error({ error, projectId, userId: user.id }, 'Error fetching activity log');
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  RATE_LIMITS.tier3_read
);
