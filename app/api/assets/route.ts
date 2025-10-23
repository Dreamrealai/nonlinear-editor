import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import {
  unauthorizedResponse,
  errorResponse,
  withErrorHandling,
  rateLimitResponse,
  successResponse
} from '@/lib/api/response';
import { validateUUID, validateEnum, validateAll } from '@/lib/api/validation';
import { serverLogger } from '@/lib/serverLogger';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit';

const VALID_ASSET_TYPES = ['image', 'video', 'audio'] as const;

export const GET = withErrorHandling(async (request: NextRequest) => {
  // SECURITY: Verify user authentication
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return unauthorizedResponse();
  }

  // TIER 3 RATE LIMITING: Read operations (30/min)
  const rateLimitResult = await checkRateLimit(
    `assets-get:${user.id}`,
    RATE_LIMITS.tier3_status_read
  );

  if (!rateLimitResult.success) {
    serverLogger.warn({
      event: 'assets.get.rate_limited',
      userId: user.id,
      limit: rateLimitResult.limit,
    }, 'Assets GET rate limit exceeded');

    return rateLimitResponse(
      rateLimitResult.limit,
      rateLimitResult.remaining,
      rateLimitResult.resetAt
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const projectId = searchParams.get('projectId');
  const type = searchParams.get('type');

  // Validate query parameters
  const validations: (ReturnType<typeof validateUUID> | ReturnType<typeof validateEnum>)[] = [];

  if (projectId) {
    validations.push(validateUUID(projectId, 'projectId'));
  }

  if (type) {
    validations.push(validateEnum(type, 'type', VALID_ASSET_TYPES, false));
  }

  const validation = validateAll(validations);
  if (!validation.valid) {
    return errorResponse(validation.errors[0].message, 400, validation.errors[0].field);
  }

  // Build query
  let query = supabase
    .from('assets')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  // Filter by project if provided
  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  // Filter by type if provided
  if (type) {
    query = query.eq('type', type);
  }

  const { data: assets, error } = await query;

  if (error) {
    serverLogger.error({ error, userId: user.id, projectId, type }, 'Failed to fetch assets');
    return errorResponse(error.message, 500);
  }

  return successResponse({ assets });
});
