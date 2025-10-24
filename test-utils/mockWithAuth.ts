/**
 * Mock withAuth middleware for testing API routes
 *
 * This helper provides a consistent mock of the withAuth middleware that:
 * - Handles authentication checks
 * - Supports rate limiting
 * - Passes route context correctly as a third parameter
 * - Matches the production withAuth signature
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

      // Check rate limiting if configured
      if (options?.rateLimit) {
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

      // Pass routeContext as third parameter to match production withAuth signature
      // Production signature: handler(request, { user, supabase }, routeContext)
      const routeContext = context?.params ? { params: context.params } : undefined;

      return await handler(req, { user, supabase }, routeContext);
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
