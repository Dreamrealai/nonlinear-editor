/**
 * Collaboration Activity API
 *
 * Handles fetching activity logs for a project
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { RATE_LIMITS } from '@/lib/rateLimit';
import { serverLogger } from '@/lib/serverLogger';
import { validateInteger, ValidationError } from '@/lib/validation';

/**
 * GET - Get activity log for a project
 */
export const GET = withAuth<{ projectId: string }>(
  async (req: NextRequest, { user, supabase }, routeContext): Promise<NextResponse<{ error: string; }> | NextResponse<{ activities: any[]; total: number; limit: number; offset: number; }>> => {
    const params = await routeContext?.params;
    const projectId = params?.projectId;

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    try {
      // Get query parameters
      const { searchParams } = new URL(req.url);
      const limitParam = searchParams.get('limit') || '50';
      const offsetParam = searchParams.get('offset') || '0';

      let limit = parseInt(limitParam, 10);
      const offset = parseInt(offsetParam, 10);

      // Validate pagination parameters
      try {
        validateInteger(limit, 'limit', { min: 1, max: 100 });
        validateInteger(offset, 'offset', { min: 0 });
      } catch (error) {
        if (error instanceof ValidationError) {
          return NextResponse.json({ error: error.message }, { status: 400 });
        }
        throw error;
      }

      // Ensure limit doesn't exceed 100
      limit = Math.min(limit, 100);

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
  {
    route: '/api/projects/[projectId]/activity',
    rateLimit: RATE_LIMITS.tier3_status_read
  }
);
