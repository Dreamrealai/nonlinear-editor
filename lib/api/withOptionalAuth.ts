/**
 * Optional Authentication Middleware for API Routes
 *
 * Provides a wrapper for API routes that can handle both authenticated and
 * unauthenticated users. It attempts to authenticate the user but does not
 * reject the request if no user is found.
 *
 * Features:
 * - Attempts to resolve user session
 * - Injects an optional user object and Supabase client
 * - Automatic error handling and logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { serverLogger } from '@/lib/serverLogger';
import { HttpStatusCode } from '../errors/errorCodes';
import type { SupabaseClient, User } from '@supabase/supabase-js';

export interface OptionalAuthContext {
  /** Authenticated user from Supabase, or null if unauthenticated */
  user: User | null;
  /** Supabase client instance */
  supabase: SupabaseClient;
}

export interface OptionalAuthOptions {
  /** Route path for logging context */
  route: string;
}

export type OptionalAuthHandler<TParams = Record<string, never>> = (
  request: NextRequest,
  context: OptionalAuthContext,
  routeContext?: { params: Promise<TParams> }
) => Promise<Response>;

export function withOptionalAuth<TParams = Record<string, never>>(
  handler: OptionalAuthHandler<TParams>,
  options: OptionalAuthOptions
): (request: NextRequest, context: { params: Promise<TParams> }) => Promise<Response> {
  return async (request: NextRequest, context: { params: Promise<TParams> }): Promise<Response> => {
    const startTime = Date.now();
    const { route } = options;

    let params: TParams = {} as TParams;
    try {
      params = ((await context.params) ?? {}) as TParams;
    } catch {
      serverLogger.warn(
        { event: 'api.params_resolution_failed', route },
        'Failed to resolve route params'
      );
    }

    try {
      const supabase = await createServerSupabaseClient();
      const { data } = await supabase.auth.getUser();
      const user = data.user; // This will be null if not authenticated

      const authContext: OptionalAuthContext = {
        user,
        supabase,
      };

      const routeContext = { params: Promise.resolve(params) };
      const response = await handler(request, authContext, routeContext);

      const duration = Date.now() - startTime;
      serverLogger.info(
        {
          event: 'api.request.optional_auth',
          route,
          status: response.status,
          duration,
          userId: user?.id ?? 'anonymous',
        },
        `${request.method} ${route} - Completed ${response.status} (${duration}ms)`
      );

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      serverLogger.error(
        {
          event: 'api.exception.optional_auth',
          route,
          duration,
          error:
            error instanceof Error
              ? { name: error.name, message: error.message, stack: error.stack }
              : error,
        },
        `${request.method} ${route} - Exception (${duration}ms)`
      );

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: HttpStatusCode.INTERNAL_SERVER_ERROR }
      );
    }
  };
}
