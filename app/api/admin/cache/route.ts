// =============================================================================
// Admin Cache Management API Route
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, type AdminAuthContext } from '@/lib/api/withAuth';
import { successResponse, errorResponse } from '@/lib/api/response';
import { getCacheStats, clearAllCaches } from '@/lib/cacheInvalidation';
import { serverLogger } from '@/lib/serverLogger';
import { RATE_LIMITS } from '@/lib/rateLimit';

/**
 * GET /api/admin/cache
 *
 * Get cache statistics
 * Requires admin authentication
 */
async function handleGetCacheStats(
  _request: NextRequest,
  context: AdminAuthContext
): Promise<NextResponse> {
  const { user } = context;

  try {
    serverLogger.info({
      event: 'admin.cache.stats_requested',
      adminId: user.id,
    }, 'Admin requested cache statistics');

    const stats = getCacheStats();

    return successResponse({
      ...stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    serverLogger.error({
      event: 'admin.cache.stats_error',
      adminId: user.id,
      error,
    }, 'Error fetching cache statistics');
    return errorResponse('Failed to fetch cache statistics', 500);
  }
}

/**
 * DELETE /api/admin/cache
 *
 * Clear all caches
 * Requires admin authentication
 * Use with caution - will clear ALL cached data
 */
async function handleClearCache(
  _request: NextRequest,
  context: AdminAuthContext
): Promise<NextResponse> {
  const { user } = context;

  try {
    serverLogger.warn({
      event: 'admin.cache.clear_requested',
      adminId: user.id,
      adminEmail: user.email,
    }, 'Admin requested to clear all caches');

    await clearAllCaches();

    serverLogger.info({
      event: 'admin.cache.cleared',
      adminId: user.id,
      adminEmail: user.email,
    }, 'All caches cleared by admin');

    return successResponse(null, 'All caches cleared successfully');
  } catch (error) {
    serverLogger.error({
      event: 'admin.cache.clear_error',
      adminId: user.id,
      error,
    }, 'Error clearing caches');
    return errorResponse('Failed to clear caches', 500);
  }
}

// Export with admin authentication middleware
export const GET = withAdminAuth(handleGetCacheStats, {
  route: '/api/admin/cache',
  rateLimit: RATE_LIMITS.tier1_auth_payment, // TIER 1: Admin operations (5 req/min)
});

export const DELETE = withAdminAuth(handleClearCache, {
  route: '/api/admin/cache',
  rateLimit: RATE_LIMITS.tier1_auth_payment, // TIER 1: Admin operations (5 req/min)
});
