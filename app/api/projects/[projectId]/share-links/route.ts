/**
 * Share Links API
 *
 * Handles creating and managing share links for projects
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { RATE_LIMITS } from '@/lib/rateLimit';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { serverLogger } from '@/lib/serverLogger';
import type { CreateShareLinkRequest, CreateShareLinkResponse } from '@/types/collaboration';

/**
 * GET - List all share links for a project
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

      // Get all active share links
      const { data: links, error } = await supabase
        .from('share_links')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        serverLogger.error({ error, projectId, userId: user.id }, 'Failed to fetch share links');
        return NextResponse.json({ error: 'Failed to fetch share links' }, { status: 500 });
      }

      return NextResponse.json({ links: links || [] });
    } catch (error) {
      serverLogger.error({ error, projectId, userId: user.id }, 'Error fetching share links');
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  RATE_LIMITS.tier3_read
);

/**
 * POST - Create a new share link
 */
export const POST = withAuth(
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
      const body: CreateShareLinkRequest = await req.json();
      const { role, expires_in_hours, max_uses } = body;

      // Validate input
      if (!role || !['viewer', 'editor'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }

      // Verify user owns the project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('user_id, name')
        .eq('id', projectId)
        .single();

      if (projectError || !project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      if (project.user_id !== user.id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      // Calculate expiration
      const expiresAt = expires_in_hours
        ? new Date(Date.now() + expires_in_hours * 60 * 60 * 1000).toISOString()
        : null;

      // Create share link
      const { data: link, error: linkError } = await supabase
        .from('share_links')
        .insert({
          project_id: projectId,
          role,
          created_by: user.id,
          expires_at: expiresAt,
          max_uses,
        })
        .select()
        .single();

      if (linkError || !link) {
        serverLogger.error({ error: linkError, projectId, userId: user.id }, 'Failed to create share link');
        return NextResponse.json({ error: 'Failed to create share link' }, { status: 500 });
      }

      // Log activity
      await supabase.from('collaboration_activity').insert({
        project_id: projectId,
        user_id: user.id,
        action: 'created_share_link',
        details: {
          role,
          expires_at: expiresAt,
          max_uses,
          link_id: link.id,
        },
      });

      // Build full URL
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const url = `${baseUrl}/join/${link.token}`;

      const response: CreateShareLinkResponse = {
        link,
        url,
      };

      return NextResponse.json(response, { status: 201 });
    } catch (error) {
      serverLogger.error({ error, projectId, userId: user.id }, 'Error creating share link');
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  RATE_LIMITS.tier2_ai_video_upload
);
