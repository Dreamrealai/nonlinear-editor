import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { serverLogger } from '@/lib/serverLogger';
import {
  unauthorizedResponse,
  errorResponse,
  withErrorHandling,
  rateLimitResponse,
  successResponse
} from '@/lib/api/response';
import { validateString, validateAll } from '@/lib/api/validation';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit';

export const POST = withErrorHandling(async (request: NextRequest) => {
  const startTime = Date.now();

  serverLogger.info({
    event: 'projects.create.request_started',
  }, 'Project creation request received');

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    serverLogger.warn({
      event: 'projects.create.unauthorized',
    }, 'Unauthorized project creation attempt');
    return unauthorizedResponse();
  }

  // TIER 2 RATE LIMITING: Resource creation - project creation (10/min)
  const rateLimitResult = await checkRateLimit(
    `projects-create:${user.id}`,
    RATE_LIMITS.tier2_resource_creation
  );

  if (!rateLimitResult.success) {
    serverLogger.warn({
      event: 'projects.create.rate_limited',
      userId: user.id,
      limit: rateLimitResult.limit,
    }, 'Project creation rate limit exceeded');

    return rateLimitResponse(
      rateLimitResult.limit,
      rateLimitResult.remaining,
      rateLimitResult.resetAt
    );
  }

  const body = await request.json();
  const title = body.title || 'Untitled Project';

  // Validate title if provided
  if (body.title) {
    const validation = validateAll([
      validateString(body.title, 'title', { minLength: 1, maxLength: 200 }),
    ]);
    if (!validation.valid) {
      return errorResponse(validation.errors[0].message, 400, validation.errors[0].field);
    }
  }

  serverLogger.debug({
    event: 'projects.create.creating',
    userId: user.id,
    title,
  }, 'Creating new project');

  const { data: project, error: dbError } = await supabase
    .from('projects')
    .insert({
      title,
      user_id: user.id,
      timeline_state_jsonb: {}
    })
    .select()
    .single();

  if (dbError) {
    serverLogger.error({
      event: 'projects.create.db_error',
      userId: user.id,
      title,
      error: dbError.message,
      code: dbError.code,
    }, 'Database error creating project');
    return errorResponse(dbError.message, 500);
  }

  const duration = Date.now() - startTime;
  serverLogger.info({
    event: 'projects.create.success',
    userId: user.id,
    projectId: project.id,
    title,
    duration,
  }, `Project created successfully in ${duration}ms`);

  return successResponse(project);
});
