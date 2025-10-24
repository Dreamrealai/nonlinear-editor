import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { errorResponse, successResponse } from '@/lib/api/response';
import { validateUUID, validateEnum, validateAll } from '@/lib/api/validation';
import { serverLogger } from '@/lib/serverLogger';
import { RATE_LIMITS } from '@/lib/rateLimit';

/**
 * CACHING STRATEGY:
 * - API routes use runtime configuration for caching
 * - This GET endpoint benefits from short-term caching to reduce database load
 * - Rate limiting prevents abuse (30 requests/minute per user)
 * - Response headers include cache control for browser caching
 * - Server-side caching could be added using unstable_cache if needed
 */

const VALID_ASSET_TYPES = ['image', 'video', 'audio'] as const;

export const GET = withAuth(
  async (request: NextRequest, { user, supabase }) => {
    // User and supabase are automatically injected by withAuth
    // Authentication and rate limiting are handled by the wrapper

    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    const type = searchParams.get('type');
    const page = searchParams.get('page');
    const pageSize = searchParams.get('pageSize');

    // Pagination defaults
    const currentPage = page ? parseInt(page, 10) : 0;
    const itemsPerPage = pageSize ? parseInt(pageSize, 10) : 50;

    // Validate pagination parameters
    if (currentPage < 0 || !Number.isInteger(currentPage)) {
      return errorResponse('Invalid page number. Must be a non-negative integer.', 400, 'page');
    }

    if (itemsPerPage < 1 || itemsPerPage > 100 || !Number.isInteger(itemsPerPage)) {
      return errorResponse('Invalid page size. Must be between 1 and 100.', 400, 'pageSize');
    }

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
      return errorResponse(
        validation.errors[0]?.message ?? 'Invalid input',
        400,
        validation.errors[0]?.field
      );
    }

    // Calculate range for pagination
    const rangeStart = currentPage * itemsPerPage;
    const rangeEnd = rangeStart + itemsPerPage - 1;

    // Build query with pagination
    let query = supabase
      .from('assets')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(rangeStart, rangeEnd);

    // Filter by project if provided
    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    // Filter by type if provided
    if (type) {
      query = query.eq('type', type);
    }

    const { data: assets, error, count } = await query;

    if (error) {
      serverLogger.error({ error, userId: user.id, projectId, type }, 'Failed to fetch assets');
      return errorResponse(error.message, 500);
    }

    // Calculate pagination metadata
    const totalCount = count ?? 0;
    const totalPages = Math.ceil(totalCount / itemsPerPage);
    const hasNextPage = currentPage < totalPages - 1;
    const hasPreviousPage = currentPage > 0;

    return successResponse({
      assets,
      pagination: {
        page: currentPage,
        pageSize: itemsPerPage,
        totalCount,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
    });
  },
  {
    route: '/api/assets',
    rateLimit: RATE_LIMITS.tier3_status_read, // 30 requests/minute for read operations
  }
);
