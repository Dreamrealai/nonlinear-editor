/**
 * Project Collaborators API
 *
 * Handles managing project collaborators
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { RATE_LIMITS } from '@/lib/rateLimit';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { serverLogger } from '@/lib/serverLogger';

/**
 * GET - List all collaborators for a project
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

      // Get all collaborators
      const { data: collaborators, error } = await supabase
        .from('project_collaborators')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) {
        serverLogger.error({ error, projectId, userId: user.id }, 'Failed to fetch collaborators');
        return NextResponse.json({ error: 'Failed to fetch collaborators' }, { status: 500 });
      }

      return NextResponse.json({ collaborators: collaborators || [] });
    } catch (error) {
      serverLogger.error({ error, projectId, userId: user.id }, 'Error fetching collaborators');
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  RATE_LIMITS.tier3_read
);
