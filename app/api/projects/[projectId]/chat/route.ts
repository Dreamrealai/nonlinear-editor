/**
 * GET /api/projects/[projectId]/chat
 * Retrieves chat messages for a project
 *
 * DELETE /api/projects/[projectId]/chat
 * Clears all chat messages for a project
 *
 * Security:
 * - Requires authentication via withAuth middleware
 * - Rate limiting applied (TIER 3 for reads, TIER 4 for deletes)
 * - RLS enforces project ownership
 */

import { NextRequest } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/api/withAuth';
import { RATE_LIMITS } from '@/lib/rateLimit';
import { serverLogger } from '@/lib/serverLogger';
import { validateUUID, ValidationError } from '@/lib/validation';
import { validationError, errorResponse, successResponse } from '@/lib/api/response';

async function handleGetChat(
  _request: NextRequest,
  context: AuthContext,
  routeContext?: { params: Promise<{ projectId: string }> }
): Promise<Response> {
  const { user, supabase } = context;
  const params = await routeContext?.params;
  const projectId = params?.projectId;

  // Validate UUID format
  try {
    validateUUID(projectId, 'projectId');
  } catch (error) {
    if (error instanceof ValidationError) {
      return validationError(error.message, error.field);
    }
    throw error;
  }

  try {
    // Fetch chat messages (RLS ensures user owns this project)
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) {
      serverLogger.error(
        { error, projectId, userId: user.id, event: 'chat.load.error' },
        'Failed to load chat messages'
      );
      return errorResponse('Failed to load chat messages', 500);
    }

    serverLogger.info(
      { projectId, userId: user.id, messageCount: data?.length || 0, event: 'chat.load.success' },
      'Chat messages loaded'
    );

    return successResponse({ messages: data || [] });
  } catch (error) {
    serverLogger.error(
      { error, projectId, userId: user.id, event: 'chat.load.exception' },
      'Unexpected error loading chat messages'
    );
    return errorResponse('Internal server error', 500);
  }
}

async function handleDeleteChat(
  _request: NextRequest,
  context: AuthContext,
  routeContext?: { params: Promise<{ projectId: string }> }
): Promise<Response> {
  const { user, supabase } = context;
  const params = await routeContext?.params;
  const projectId = params?.projectId;

  // Validate UUID format
  try {
    validateUUID(projectId, 'projectId');
  } catch (error) {
    if (error instanceof ValidationError) {
      return validationError(error.message, error.field);
    }
    throw error;
  }

  try {
    // Delete all chat messages for this project (RLS ensures ownership)
    const { error: deleteError } = await supabase
      .from('chat_messages')
      .delete()
      .eq('project_id', projectId);

    if (deleteError) {
      serverLogger.error(
        { error: deleteError, projectId, userId: user.id, event: 'chat.clear.error' },
        'Failed to clear chat messages'
      );
      return errorResponse('Failed to clear chat messages', 500);
    }

    serverLogger.info(
      { projectId, userId: user.id, event: 'chat.clear.success' },
      'Chat messages cleared'
    );

    return successResponse({ success: true });
  } catch (error) {
    serverLogger.error(
      { error, projectId, userId: user.id, event: 'chat.clear.exception' },
      'Unexpected error clearing chat messages'
    );
    return errorResponse('Internal server error', 500);
  }
}

// Export with authentication middleware and rate limiting
export const GET = withAuth<{ projectId: string }>(handleGetChat, {
  route: '/api/projects/[projectId]/chat',
  rateLimit: RATE_LIMITS.tier4_general, // 200 requests per minute for chat read operations
});

export const DELETE = withAuth<{ projectId: string }>(handleDeleteChat, {
  route: '/api/projects/[projectId]/chat',
  rateLimit: RATE_LIMITS.tier4_general, // 200 requests per minute for delete operations
});
