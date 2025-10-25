/**
 * Mock withAuth middleware for testing API routes
 *
 * This helper provides a consistent mock of the withAuth middleware that:
 * - Handles authentication checks
 * - Supports rate limiting
 * - Handles both 2-param and 3-param handler signatures automatically
 * - Matches the production withAuth signature
 *
 * IMPORTANT: This mock handles two handler signatures:
 * 1. Two-param handlers (no route params): handler(request, authContext)
 * 2. Three-param handlers (with route params): handler(request, authContext, routeContext)
 *
 * Usage in test files:
 * ```typescript
 * import { mockWithAuth } from '@/test-utils/mockWithAuth';
 *
 * jest.mock('@/lib/api/withAuth', () => ({
 *   withAuth: mockWithAuth,
 * }));
 * ```
 */

import { NextRequest } from 'next/server';

export function mockWithAuth(handler: any, options: any) {
  return async (req: NextRequest, context: any) => {
    try {
      const { createServerSupabaseClient } = require('@/lib/supabase');
      const supabase = await createServerSupabaseClient();

      if (!supabase || !supabase.auth) {
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Check rate limiting if configured (skip in test environment)
      if (options?.rateLimit && process.env.NODE_ENV !== 'test') {
        const { checkRateLimit } = require('@/lib/rateLimit');
        const rateLimitResult = await checkRateLimit(`user:${user.id}`, options.rateLimit);

        if (!rateLimitResult.success) {
          return new Response(
            JSON.stringify({
              error: 'Rate limit exceeded',
              limit: rateLimitResult.limit,
              remaining: rateLimitResult.remaining,
              resetAt: rateLimitResult.resetAt,
            }),
            {
              status: 429,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
      }

      // Create auth context
      const authContext = { user, supabase };

      // Determine if handler expects route params (3-param signature)
      // Check if context has params property (indicates dynamic route)
      const hasRouteParams = context?.params !== undefined;

      if (hasRouteParams) {
        // Three-param handler: handler(request, authContext, routeContext)
        // Used by dynamic routes like /api/projects/[projectId]/backups
        const routeContext = { params: context.params };
        return await handler(req, authContext, routeContext);
      } else {
        // Two-param handler: handler(request, authContext)
        // Used by static routes like /api/projects
        return await handler(req, authContext);
      }
    } catch (error) {
      console.error('Error in withAuth mock:', error);
      return new Response(
        JSON.stringify({
          error: 'Internal server error',
          details: (error as Error).message
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  };
}
