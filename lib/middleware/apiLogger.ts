/**
 * API Route Logging Middleware
 *
 * Provides comprehensive request/response logging for Next.js API routes.
 * Logs to Axiom via serverLogger for monitoring and debugging.
 *
 * Features:
 * - Request/response logging with timing
 * - Error tracking
 * - Performance monitoring
 * - User context tracking
 *
 * Usage:
 * ```typescript
 * import { withApiLogger } from '@/lib/middleware/apiLogger';
 *
 * export const POST = withApiLogger(async (request) => {
 *   // Your route handler logic
 *   return NextResponse.json({ success: true });
 * }, { route: '/api/projects' });
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { serverLogger } from '../serverLogger';

export interface ApiLoggerOptions {
  /** Route path for logging context */
  route: string;
  /** Whether to log request body (disable for sensitive data) */
  logRequestBody?: boolean;
  /** Whether to log response body (disable for large responses) */
  logResponseBody?: boolean;
  /** Maximum body size to log (bytes) */
  maxBodySize?: number;
}

/**
 * Wrapper for API route handlers with automatic logging
 */
export function withApiLogger<T extends (...args: unknown[]) => Promise<NextResponse>>(
  handler: T,
  options: ApiLoggerOptions
): T {
  const {
    route,
    logRequestBody = false,
    logResponseBody = false,
    maxBodySize = 1024, // 1KB max for logs
  } = options;

  return (async (...args: unknown[]) => {
    const request = args[0] as NextRequest;
    const startTime = Date.now();
    const requestId = generateRequestId();

    // Extract request metadata
    const method = request.method;
    const url = request.url;
    const userAgent = request.headers.get('user-agent');
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown';

    // Create child logger with request context
    const logger = serverLogger.child({
      requestId,
      route,
      method,
      ip,
      userAgent,
    });

    // Log incoming request
    const requestContext: Record<string, unknown> = {
      url,
      headers: Object.fromEntries(
        Array.from(request.headers.entries())
          .filter(([key]) => !key.toLowerCase().includes('authorization'))
      ),
    };

    // Optionally log request body
    if (logRequestBody && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      try {
        const body = await request.clone().text();
        if (body.length <= maxBodySize) {
          requestContext.body = body.substring(0, maxBodySize);
        } else {
          requestContext.bodySize = body.length;
          requestContext.bodyTruncated = true;
        }
      } catch {
        // Ignore body parsing errors
      }
    }

    logger.info(requestContext, `Incoming ${method} request to ${route}`);

    try {
      // Call the actual handler
      const response = await handler(...args);

      const duration = Date.now() - startTime;
      const status = response.status;

      // Log response
      const responseContext: Record<string, unknown> = {
        status,
        duration,
        durationMs: duration,
      };

      // Optionally log response body
      if (logResponseBody && response.body) {
        try {
          const clonedResponse = response.clone();
          const body = await clonedResponse.text();
          if (body.length <= maxBodySize) {
            responseContext.body = body.substring(0, maxBodySize);
          } else {
            responseContext.bodySize = body.length;
            responseContext.bodyTruncated = true;
          }
        } catch {
          // Ignore body parsing errors
        }
      }

      // Log based on status code
      if (status >= 500) {
        logger.error(responseContext, `${method} ${route} failed with ${status} (${duration}ms)`);
      } else if (status >= 400) {
        logger.warn(responseContext, `${method} ${route} returned ${status} (${duration}ms)`);
      } else {
        logger.info(responseContext, `${method} ${route} completed ${status} (${duration}ms)`);
      }

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Log error
      logger.error(
        {
          error: error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          } : error,
          duration,
          durationMs: duration,
        },
        `${method} ${route} threw error (${duration}ms)`
      );

      // Re-throw to let the error boundary handle it
      throw error;
    }
  }) as T;
}

/**
 * Generate a unique request ID for tracing
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Middleware to extract and log user info from Supabase auth
 */
export async function logUserContext(
  logger: typeof serverLogger,
  userId?: string,
  email?: string
): Promise<typeof serverLogger> {
  if (!userId) {
    return logger;
  }

  return logger.child({
    userId,
    userEmail: email,
  });
}

/**
 * Log slow API requests (performance monitoring)
 */
export function logSlowRequest(
  route: string,
  duration: number,
  threshold: number = 1000
): void {
  if (duration > threshold) {
    serverLogger.warn(
      {
        type: 'slow_request',
        route,
        duration,
        durationMs: duration,
        threshold,
      },
      `Slow API request: ${route} took ${duration}ms (threshold: ${threshold}ms)`
    );
  }
}
