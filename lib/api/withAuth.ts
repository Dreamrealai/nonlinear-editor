/**
 * Authentication Middleware for API Routes
 *
 * Provides reusable authentication wrappers for Next.js API routes.
 * Ensures all routes have proper authentication, authorization, and logging.
 *
 * Features:
 * - User authentication verification
 * - Admin role verification
 * - User and Supabase client injection
 * - Automatic error handling and logging
 * - Rate limiting integration
 *
 * Usage:
 * ```typescript
 * import { withAuth, withAdminAuth } from '@/lib/api/withAuth';
 *
 * export const POST = withAuth(async (request, { user, supabase }) => {
 *   // Your authenticated route logic here
 *   return NextResponse.json({ success: true });
 * }, { route: '/api/projects' });
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { serverLogger } from '@/lib/serverLogger';
import { HttpStatusCode, isClientError, isServerError } from '../errors/errorCodes';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { auditSecurityEvent, auditRateLimitViolation, AuditAction } from '@/lib/auditLog';

export interface AuthContext {
  /** Authenticated user from Supabase */
  user: User;
  /** Supabase client with user session */
  supabase: SupabaseClient;
}

export interface AuthOptions {
  /** Route path for logging context */
  route: string;
  /** Optional rate limiting configuration */
  rateLimit?: {
    max: number;
    windowMs: number;
  };
}

export type AuthenticatedHandler<TParams = Record<string, never>> = (
  request: NextRequest,
  context: AuthContext & { params?: TParams }
) => Promise<Response>;

/**
 * Extracts identifier for rate limiting
 * Uses user ID if available, falls back to IP address
 */
function getRateLimitIdentifier(request: NextRequest, userId?: string): string {
  if (userId) {
    return `user:${userId}`;
  }

  const ip =
    request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  return `ip:${ip}`;
}

/**
 * Authentication middleware wrapper for API routes
 * Verifies user is authenticated before allowing access
 *
 * @param handler - Authenticated route handler
 * @param options - Authentication configuration
 * @returns Wrapped Next.js route handler
 *
 * @example
 * export const POST = withAuth(async (request, { user, supabase }) => {
 *   const body = await request.json();
 *   const { data } = await supabase
 *     .from('projects')
 *     .insert({ ...body, user_id: user.id });
 *   return NextResponse.json(data);
 * }, { route: '/api/projects' });
 */
export function withAuth<TParams = Record<string, never>>(
  handler: AuthenticatedHandler<TParams>,
  options: AuthOptions
): (request: NextRequest, context?: { params?: Promise<TParams> | TParams }) => Promise<Response> {
  return async (
    request: NextRequest,
    context: { params?: Promise<TParams> | TParams } = {}
  ): Promise<Response> => {
    const startTime = Date.now();
    const { route, rateLimit } = options;

    // Handle Next.js 15's async params while staying compatible with legacy tests
    let params: TParams = {} as TParams;
    const rawParams = context?.params;

    if (rawParams) {
      try {
        params = ((await Promise.resolve(rawParams)) ?? {}) as TParams;
      } catch (error) {
        serverLogger.warn(
          {
            event: 'api.params_resolution_failed',
            route,
            method: request.method,
            error:
              error instanceof Error
                ? {
                    name: error.name,
                    message: error.message,
                  }
                : error,
          },
          'Failed to resolve route params, continuing with empty params'
        );
        params = {} as TParams;
      }
    }

    try {
      serverLogger.info(
        {
          event: 'api.request',
          route,
          method: request.method,
        },
        `${request.method} ${route} - Starting`
      );

      // Create Supabase client and verify authentication
      const supabase = await createServerSupabaseClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        const duration = Date.now() - startTime;
        serverLogger.warn(
          {
            event: 'api.unauthorized',
            route,
            method: request.method,
            duration,
            error: authError?.message,
          },
          `${request.method} ${route} - Unauthorized (${duration}ms)`
        );

        // Audit log: Unauthorized access attempt
        await auditSecurityEvent(AuditAction.SECURITY_UNAUTHORIZED_ACCESS, null, request, {
          route,
          method: request.method,
          error: authError?.message,
        });

        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: HttpStatusCode.UNAUTHORIZED }
        );
      }

      // Apply rate limiting if configured
      if (rateLimit && process.env.NODE_ENV !== 'test') {
        const { checkRateLimit } = await import('@/lib/rateLimit');
        const identifier = getRateLimitIdentifier(request, user.id);
        const rateLimitResult = await checkRateLimit(identifier, rateLimit);

        if (!rateLimitResult.success) {
          serverLogger.warn(
            {
              event: 'api.rate_limited',
              route,
              method: request.method,
              userId: user.id,
              identifier,
              limit: rateLimitResult.limit,
              resetAt: rateLimitResult.resetAt,
            },
            `${request.method} ${route} - Rate limit exceeded`
          );

          // Audit log: Rate limit violation
          await auditRateLimitViolation(user.id, request, identifier, {
            route,
            limit: rateLimitResult.limit,
            remaining: rateLimitResult.remaining,
            resetAt: rateLimitResult.resetAt,
          });

          return NextResponse.json(
            {
              error: 'Rate limit exceeded',
              limit: rateLimitResult.limit,
              remaining: rateLimitResult.remaining,
              resetAt: rateLimitResult.resetAt,
            },
            {
              status: HttpStatusCode.RATE_LIMITED,
              headers: {
                'X-RateLimit-Limit': rateLimitResult.limit.toString(),
                'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
                'X-RateLimit-Reset': rateLimitResult.resetAt.toString(),
              },
            }
          );
        }
      }

      // Create child logger with user context
      const logger = serverLogger.child({
        userId: user.id,
        userEmail: user.email,
        route,
      });

      logger.debug(
        {
          event: 'api.authenticated',
        },
        'User authenticated successfully'
      );

      // Call the authenticated handler with user and supabase context
      const context: AuthContext & { params?: TParams } = {
        user,
        supabase,
        params,
      };

      const response = await handler(request, context);

      const duration = Date.now() - startTime;
      const status = response.status;

      if (isServerError(status)) {
        logger.error(
          {
            event: 'api.error',
            status,
            duration,
          },
          `${request.method} ${route} - Server error ${status} (${duration}ms)`
        );
      } else if (isClientError(status)) {
        logger.warn(
          {
            event: 'api.client_error',
            status,
            duration,
          },
          `${request.method} ${route} - Client error ${status} (${duration}ms)`
        );
      } else {
        logger.info(
          {
            event: 'api.success',
            status,
            duration,
          },
          `${request.method} ${route} - Success ${status} (${duration}ms)`
        );
      }

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      serverLogger.error(
        {
          event: 'api.exception',
          route,
          method: request.method,
          duration,
          error:
            error instanceof Error
              ? {
                  name: error.name,
                  message: error.message,
                  stack: error.stack,
                }
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

export interface AdminAuthContext extends AuthContext {
  /** Admin user profile */
  adminProfile: {
    id: string;
    tier: 'admin';
  };
}

export type AdminAuthenticatedHandler<TParams = Record<string, never>> = (
  request: NextRequest,
  context: AdminAuthContext & { params?: TParams }
) => Promise<Response>;

/**
 * Admin authentication middleware wrapper for API routes
 * Verifies user is authenticated AND has admin role
 *
 * @param handler - Admin route handler
 * @param options - Authentication configuration
 * @returns Wrapped Next.js route handler
 *
 * @example
 * export const POST = withAdminAuth(async (request, { user, adminProfile, supabase }) => {
 *   const body = await request.json();
 *   // Perform admin operations
 *   return NextResponse.json({ success: true });
 * }, { route: '/api/admin/change-tier' });
 */
export function withAdminAuth<TParams = Record<string, never>>(
  handler: AdminAuthenticatedHandler<TParams>,
  options: AuthOptions
): (request: NextRequest, context?: { params?: Promise<TParams> | TParams }) => Promise<Response> {
  return withAuth<TParams>(async (request, authContext) => {
    const { user, supabase } = authContext;
    const { route } = options;

    try {
      // Check if user is admin
      const { data: adminProfile, error: adminError } = await supabase
        .from('user_profiles')
        .select('tier')
        .eq('id', user.id)
        .single();

      if (adminError || adminProfile?.tier !== 'admin') {
        serverLogger.warn(
          {
            event: 'api.forbidden',
            route,
            userId: user.id,
            userTier: adminProfile?.tier,
            error: adminError?.message,
          },
          `${request.method} ${route} - Forbidden (non-admin access attempt)`
        );

        return NextResponse.json(
          { error: 'Admin access required' },
          { status: HttpStatusCode.FORBIDDEN }
        );
      }

      serverLogger.info(
        {
          event: 'api.admin_access',
          route,
          adminId: user.id,
        },
        'Admin access granted'
      );

      // Call admin handler with admin context
      const adminContext: AdminAuthContext & { params?: TParams } = {
        ...authContext,
        adminProfile: {
          id: user.id,
          tier: 'admin',
        },
      };

      return await handler(request, adminContext);
    } catch (error) {
      serverLogger.error(
        {
          event: 'api.admin_check_error',
          route,
          userId: user.id,
          error:
            error instanceof Error
              ? {
                  name: error.name,
                  message: error.message,
                  stack: error.stack,
                }
              : error,
        },
        'Error checking admin privileges'
      );

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: HttpStatusCode.INTERNAL_SERVER_ERROR }
      );
    }
  }, options);
}

/**
 * Audit log for admin actions
 * Records admin operations in the database for compliance and security
 */
export async function logAdminAction(
  supabase: SupabaseClient,
  action: string,
  adminId: string,
  targetUserId: string | null,
  details: Record<string, unknown>
): Promise<void> {
  try {
    const { error } = await supabase.from('admin_audit_log').insert({
      action,
      admin_id: adminId,
      target_user_id: targetUserId,
      details,
      created_at: new Date().toISOString(),
    });

    if (error) {
      // Log to server logger if database insert fails
      serverLogger.error(
        {
          event: 'admin.audit_log_failed',
          action,
          adminId,
          targetUserId,
          error: error.message,
        },
        'Failed to write admin audit log'
      );
    } else {
      serverLogger.info(
        {
          event: 'admin.audit_log_recorded',
          action,
          adminId,
          targetUserId,
        },
        'Admin action logged to audit trail'
      );
    }
  } catch (error) {
    serverLogger.error(
      {
        event: 'admin.audit_log_exception',
        action,
        adminId,
        targetUserId,
        error,
      },
      'Exception writing admin audit log'
    );
  }
}
