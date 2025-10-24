import { NextRequest } from 'next/server';
import { serverLogger } from '@/lib/serverLogger';
import { errorResponse, successResponse } from '@/lib/api/response';
import { validateString, validateAll } from '@/lib/api/validation';
import { RATE_LIMITS } from '@/lib/rateLimit';
import { invalidateUserProjects } from '@/lib/cacheInvalidation';
import { withAuth, type AuthContext } from '@/lib/api/withAuth';

/**
 * Create a new video editing project.
 *
 * Creates a new project associated with the authenticated user. Projects serve as containers
 * for assets, timelines, and editing work.
 *
 * @route POST /api/projects
 *
 * @param {string} [request.body.title] - Project title (1-200 characters, defaults to 'Untitled Project')
 *
 * @returns {object} The newly created project
 * @returns {string} returns.id - Project UUID
 * @returns {string} returns.title - Project title
 * @returns {string} returns.user_id - Owner's user ID
 * @returns {object} returns.timeline_state_jsonb - Timeline state (empty object initially)
 * @returns {string} returns.created_at - ISO 8601 timestamp of creation
 * @returns {string} returns.updated_at - ISO 8601 timestamp of last update
 *
 * @throws {401} Unauthorized - User not authenticated
 * @throws {400} Bad Request - Invalid title (empty or > 200 characters)
 * @throws {429} Too Many Requests - Rate limit exceeded (10 requests per minute)
 * @throws {500} Internal Server Error - Database error
 *
 * @ratelimit 10 requests per minute (TIER 2 - Resource Creation)
 *
 * @authentication Required - Session cookie (supabase-auth-token)
 *
 * @example
 * POST /api/projects
 * {
 *   "title": "My Video Project"
 * }
 *
 * Response:
 * {
 *   "id": "123e4567-e89b-12d3-a456-426614174000",
 *   "title": "My Video Project",
 *   "user_id": "user-uuid",
 *   "timeline_state_jsonb": {},
 *   "created_at": "2025-10-23T12:00:00.000Z",
 *   "updated_at": "2025-10-23T12:00:00.000Z"
 * }
 */
async function handleProjectCreate(request: NextRequest, context: AuthContext) {
  const { user, supabase } = context;
  const startTime = Date.now();

  serverLogger.info(
    {
      event: 'projects.create.request_started',
      userId: user.id,
    },
    'Project creation request received'
  );

  const body = await request.json();
  const title = body.title || 'Untitled Project';

  // Validate title if provided
  if (body.title) {
    const validation = validateAll([
      validateString(body.title, 'title', { minLength: 1, maxLength: 200 }),
    ]);
    if (!validation.valid) {
      return errorResponse(
        validation.errors[0]?.message ?? 'Invalid input',
        400,
        validation.errors[0]?.field
      );
    }
  }

  serverLogger.debug(
    {
      event: 'projects.create.creating',
      userId: user.id,
      title,
    },
    'Creating new project'
  );

  // Use ProjectService for project creation
  const { ProjectService } = await import('@/lib/services/projectService');
  const projectService = new ProjectService(supabase);

  let project;
  try {
    project = await projectService.createProject(user.id, { title });
  } catch (error) {
    serverLogger.error(
      {
        event: 'projects.create.service_error',
        userId: user.id,
        title,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'Service error creating project'
    );
    return errorResponse(error instanceof Error ? error.message : 'Failed to create project', 500);
  }

  const duration = Date.now() - startTime;
  serverLogger.info(
    {
      event: 'projects.create.success',
      userId: user.id,
      projectId: project.id,
      title,
      duration,
    },
    `Project created successfully in ${duration}ms`
  );

  // Invalidate user's projects cache after creation
  await invalidateUserProjects(user.id);

  return successResponse(project);
}

// Export with authentication middleware and rate limiting
export const POST = withAuth(handleProjectCreate, {
  route: '/api/projects',
  rateLimit: RATE_LIMITS.tier2_resource_creation, // 10 requests per minute
});
