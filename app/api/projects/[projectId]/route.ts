/**
 * DELETE /api/projects/[projectId]
 *
 * Deletes a project and all associated resources
 *
 * Security:
 * - Requires authentication
 * - Validates project ownership via RLS
 * - Cascading delete handled by database
 */

import { NextRequest } from 'next/server';
import { serverLogger } from '@/lib/serverLogger';
import { validateUUID, ValidationError } from '@/lib/validation';
import { errorResponse, successResponse, validationError } from '@/lib/api/response';
import { withAuth, type AuthContext } from '@/lib/api/withAuth';
import { RATE_LIMITS } from '@/lib/rateLimit';
import { invalidateUserProjects } from '@/lib/cacheInvalidation';

async function handleProjectDelete(
  _request: NextRequest,
  context: AuthContext,
  routeContext?: { params: Promise<{ projectId: string }> }
) {
  const { user, supabase } = context;
  const startTime = Date.now();
  const resolvedParams = await routeContext?.params;

  if (!resolvedParams?.projectId) {
    return validationError('Project ID is required', 'projectId');
  }

  const { projectId } = resolvedParams;

  serverLogger.info(
    {
      event: 'projects.delete.request_started',
      userId: user.id,
      projectId,
    },
    'Project deletion request received'
  );

  // Validate UUID format
  try {
    validateUUID(projectId, 'projectId');
  } catch (error) {
    if (error instanceof ValidationError) {
      serverLogger.warn(
        {
          event: 'projects.delete.validation_error',
          userId: user.id,
          projectId,
          error: error.message,
        },
        'Invalid project ID format'
      );
      return validationError(error.message, error.field);
    }
    throw error;
  }

  // Delete project (RLS ensures user owns this project)
  const { error: deleteError } = await supabase.from('projects').delete().eq('id', projectId);

  if (deleteError) {
    serverLogger.error(
      {
        event: 'projects.delete.error',
        error: deleteError.message,
        projectId,
        userId: user.id,
      },
      'Failed to delete project'
    );
    return errorResponse('Failed to delete project', 500);
  }

  const duration = Date.now() - startTime;
  serverLogger.info(
    {
      event: 'projects.delete.success',
      projectId,
      userId: user.id,
      duration,
    },
    `Project deleted successfully in ${duration}ms`
  );

  // Invalidate user's projects cache after deletion
  await invalidateUserProjects(user.id);

  return successResponse({ success: true });
}

// Export with authentication middleware and rate limiting
export const DELETE = withAuth(handleProjectDelete, {
  route: '/api/projects/[projectId]',
  rateLimit: RATE_LIMITS.tier2_resource_creation, // 10 requests per minute
});
