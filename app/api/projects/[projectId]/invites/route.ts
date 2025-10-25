/**
 * Project Invites API
 *
 * Handles creating and managing project invitations
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { RATE_LIMITS } from '@/lib/rateLimit';
import { serverLogger } from '@/lib/serverLogger';
import { validateEnum, validateUUID, ValidationError } from '@/lib/validation';
import { validationError } from '@/lib/api/response';
import type { ShareProjectRequest, ProjectInvite } from '@/types/collaboration';

/**
 * GET - List all invites for a project
 */
export const GET = withAuth<{ projectId: string }>(
  async (
    _req: NextRequest,
    { user, supabase },
    routeContext
  ): Promise<NextResponse<{ error: string }> | NextResponse<{ invites: ProjectInvite[] }>> => {
    const params = await routeContext?.params;
    const projectId = params?.projectId;

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

      // Get all invites
      const { data: invites, error } = await supabase
        .from('project_invites')
        .select('*')
        .eq('project_id', projectId)
        .order('invited_at', { ascending: false });

      if (error) {
        serverLogger.error({ error, projectId, userId: user.id }, 'Failed to fetch invites');
        return NextResponse.json({ error: 'Failed to fetch invites' }, { status: 500 });
      }

      return NextResponse.json({ invites: invites || [] });
    } catch (error) {
      serverLogger.error({ error, projectId, userId: user.id }, 'Error fetching invites');
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  {
    route: '/api/projects/[projectId]/invites',
    rateLimit: RATE_LIMITS.tier3_status_read,
  }
);

/**
 * POST - Create a new invite
 */
export const POST = withAuth<{ projectId: string }>(
  async (
    req: NextRequest,
    { user, supabase },
    routeContext
  ): Promise<
    NextResponse<{ error: string }> | NextResponse<{ invite: ProjectInvite; message: string }>
  > => {
    const params = await routeContext?.params;
    const projectId = params?.projectId;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      // Validate path parameters
      validateUUID(projectId, 'projectId');

      // Validate request body
      const body: ShareProjectRequest = await req.json();
      const { email, role } = body;

      // Basic email validation (more comprehensive validation would check format)
      if (
        !email ||
        typeof email !== 'string' ||
        !email.includes('@') ||
        email.length < 3 ||
        email.length > 254
      ) {
        throw new ValidationError('Invalid email address', 'email', 'INVALID_EMAIL');
      }

      validateEnum(role, 'role', ['viewer', 'editor', 'admin'] as const);

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

      // Check if user is already a collaborator
      const { data: existingCollaborator } = await supabase
        .from('project_collaborators')
        .select('id')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .single();

      if (existingCollaborator) {
        return NextResponse.json({ error: 'User is already a collaborator' }, { status: 400 });
      }

      // Create invite
      const { data: invite, error: inviteError } = await supabase
        .from('project_invites')
        .insert({
          project_id: projectId,
          email,
          role,
          invited_by: user.id,
        })
        .select()
        .single();

      if (inviteError) {
        // Check for unique constraint violation
        if (inviteError.code === '23505') {
          return NextResponse.json(
            { error: 'An invite for this email already exists' },
            { status: 400 }
          );
        }
        serverLogger.error(
          { error: inviteError, projectId, userId: user.id },
          'Failed to create invite'
        );
        return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
      }

      // Log activity
      await supabase.from('collaboration_activity').insert({
        project_id: projectId,
        user_id: user.id,
        action: 'sent_invite',
        details: {
          email,
          role,
          invite_id: invite.id,
        },
      });

      // TODO: Send email notification
      // This would integrate with an email service like SendGrid, Resend, etc.
      serverLogger.info(
        { projectId, email, role, inviteToken: invite.token },
        'Invite created (email sending not implemented)'
      );

      return NextResponse.json(
        {
          invite,
          message: 'Invite created successfully. Email sending is not yet implemented.',
        },
        { status: 201 }
      );
    } catch (error) {
      if (error instanceof ValidationError) {
        return validationError(error.message);
      }
      serverLogger.error({ error, projectId, userId: user.id }, 'Error creating invite');
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  {
    route: '/api/projects/[projectId]/invites',
    rateLimit: RATE_LIMITS.tier2_resource_creation,
  }
);
