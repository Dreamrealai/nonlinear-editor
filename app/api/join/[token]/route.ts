/**
 * Join Project via Share Link or Invite
 *
 * Handles accepting share links and invites
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { RATE_LIMITS } from '@/lib/rateLimit';
import { serverLogger } from '@/lib/serverLogger';
import { validateString, ValidationError } from '@/lib/validation';
import { validationError } from '@/lib/api/response';

/**
 * POST - Accept a share link or invite
 */
export const POST = withAuth<{ token: string }>(
  async (req: NextRequest, { user, supabase }, routeContext): Promise<NextResponse<{ error: string; }> | NextResponse<{ success: boolean; project_id: any; role: any; type: string; message: any; }> | NextResponse<{ success: boolean; error: any; }>> => {
    const params = await routeContext?.params;
    const token = params?.token;

    // Validate token
    try {
      validateString(token, 'token', { minLength: 1 });
    } catch (error) {
      if (error instanceof ValidationError) {
        return validationError(error.message, error.field);
      }
      throw error;
    }

    try {
      // Try to use as share link first
      const { data: shareLinkResult, error: shareLinkError } = await supabase.rpc('use_share_link', {
        p_token: token,
      });

      if (!shareLinkError && shareLinkResult && shareLinkResult.length > 0) {
        const result = shareLinkResult[0];
        if (result.link_valid) {
          return NextResponse.json({
            success: true,
            project_id: result.project_id,
            role: result.role,
            type: 'share_link',
            message: result.error_message,
          });
        }
      }

      // Try to use as invite
      const { data: inviteResult, error: inviteError } = await supabase.rpc('accept_project_invite', {
        p_token: token,
      });

      if (!inviteError && inviteResult && inviteResult.length > 0) {
        const result = inviteResult[0];
        if (result.invite_valid) {
          return NextResponse.json({
            success: true,
            project_id: result.project_id,
            role: result.role,
            type: 'invite',
            message: result.error_message,
          });
        }
        // Return invite-specific error
        return NextResponse.json(
          {
            success: false,
            error: result.error_message || 'Invalid invite',
          },
          { status: 400 }
        );
      }

      // If both failed, return generic error
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or expired link/invite',
        },
        { status: 400 }
      );
    } catch (error) {
      serverLogger.error({ error, token, userId: user.id }, 'Error accepting link/invite');
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  {
    route: '/api/join/[token]',
    rateLimit: RATE_LIMITS.tier2_resource_creation,
  }
);

/**
 * GET - Get info about a share link or invite (without accepting)
 */
export const GET = withAuth<{ token: string }>(
  async (req: NextRequest, { user, supabase }, routeContext): Promise<NextResponse<{ error: string; }> | NextResponse<{ type: string; project_name: any; role: any; expires_at: any; is_valid: boolean; }>> => {
    const params = await routeContext?.params;
    const token = params?.token;

    // Validate token
    try {
      validateString(token, 'token', { minLength: 1 });
    } catch (error) {
      if (error instanceof ValidationError) {
        return validationError(error.message, error.field);
      }
      throw error;
    }

    try {
      // Check if it's a share link
      const { data: shareLink } = await supabase
        .from('share_links')
        .select('project_id, role, expires_at, max_uses, current_uses, is_active')
        .eq('token', token)
        .single();

      if (shareLink && shareLink.is_active) {
        // Get project name
        const { data: project } = await supabase
          .from('projects')
          .select('name')
          .eq('id', shareLink.project_id)
          .single();

        return NextResponse.json({
          type: 'share_link',
          project_name: project?.name || 'Unknown Project',
          role: shareLink.role,
          expires_at: shareLink.expires_at,
          is_valid: true,
        });
      }

      // Check if it's an invite
      const { data: invite } = await supabase
        .from('project_invites')
        .select('project_id, email, role, expires_at, status')
        .eq('token', token)
        .single();

      if (invite) {
        // Get project name
        const { data: project } = await supabase
          .from('projects')
          .select('name')
          .eq('id', invite.project_id)
          .single();

        return NextResponse.json({
          type: 'invite',
          project_name: project?.name || 'Unknown Project',
          role: invite.role,
          email: invite.email,
          expires_at: invite.expires_at,
          is_valid: invite.status === 'pending' && new Date(invite.expires_at) > new Date(),
        });
      }

      return NextResponse.json(
        {
          error: 'Link/invite not found',
        },
        { status: 404 }
      );
    } catch (error) {
      serverLogger.error({ error, token }, 'Error fetching link/invite info');
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  {
    route: '/api/join/[token]',
    rateLimit: RATE_LIMITS.tier3_status_read,
  }
);
