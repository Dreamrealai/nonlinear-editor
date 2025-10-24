/**
 * Request Body Size Limits Middleware
 *
 * Provides middleware to enforce request body size limits for API routes.
 * Prevents DoS attacks and resource exhaustion from large payloads.
 *
 * @module lib/api/bodyLimits
 */

import { NextRequest, NextResponse } from 'next/server';
import { serverLogger } from '@/lib/serverLogger';

/**
 * Body size limits in bytes
 */
export const BODY_SIZE_LIMITS = {
  /** Tiny payloads (authentication, simple updates) - 1KB */
  TINY: 1024,
  /** Small payloads (form submissions, metadata) - 10KB */
  SMALL: 10 * 1024,
  /** Medium payloads (JSON data, text content) - 100KB */
  MEDIUM: 100 * 1024,
  /** Large payloads (rich content, configurations) - 1MB */
  LARGE: 1024 * 1024,
  /** Extra large payloads (file metadata, batch operations) - 10MB */
  XLARGE: 10 * 1024 * 1024,
} as const;

/**
 * Default body size limit (100KB - covers most API use cases)
 */
export const DEFAULT_BODY_SIZE_LIMIT = BODY_SIZE_LIMITS.MEDIUM;

/**
 * Formats bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)}GB`;
}

/**
 * Gets content length from request
 */
function getContentLength(request: NextRequest): number | null {
  const contentLength = request.headers.get('content-length');
  if (!contentLength) {
    return null;
  }

  const length = parseInt(contentLength, 10);
  return isNaN(length) ? null : length;
}

/**
 * Validates request body size
 *
 * @param request - Next.js request object
 * @param limit - Maximum body size in bytes
 * @returns Error response if body is too large, null if valid
 *
 * @example
 * const error = validateBodySize(request, BODY_SIZE_LIMITS.SMALL);
 * if (error) return error;
 */
export function validateBodySize(
  request: NextRequest,
  limit: number = DEFAULT_BODY_SIZE_LIMIT
): NextResponse | null {
  const contentLength = getContentLength(request);

  // If content-length header is missing, we can't validate upfront
  // Body will be parsed and checked during JSON parsing
  if (contentLength === null) {
    serverLogger.debug(
      {
        event: 'api.body_size.no_content_length',
        pathname: request.nextUrl.pathname,
      },
      'Content-Length header missing, cannot validate body size upfront'
    );
    return null;
  }

  if (contentLength > limit) {
    serverLogger.warn(
      {
        event: 'api.body_size.exceeded',
        pathname: request.nextUrl.pathname,
        contentLength,
        limit,
        exceededBy: contentLength - limit,
      },
      `Request body size exceeded: ${formatBytes(contentLength)} > ${formatBytes(limit)}`
    );

    return NextResponse.json(
      {
        error: 'Request body too large',
        maxSize: formatBytes(limit),
        actualSize: formatBytes(contentLength),
      },
      {
        status: 413, // Payload Too Large
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

  return null;
}

/**
 * Safe JSON parser with size limit
 *
 * @param request - Next.js request object
 * @param limit - Maximum body size in bytes
 * @returns Parsed JSON or error response
 *
 * @example
 * const result = await safeParseJSON(request, BODY_SIZE_LIMITS.SMALL);
 * if ('error' in result) {
 *   return result.error;
 * }
 * const body = result.data;
 */
export async function safeParseJSON<T = unknown>(
  request: NextRequest,
  limit: number = DEFAULT_BODY_SIZE_LIMIT
): Promise<{ data: T } | { error: NextResponse }> {
  // Check content-length header first
  const sizeError = validateBodySize(request, limit);
  if (sizeError) {
    return { error: sizeError };
  }

  try {
    // Parse JSON with a reasonable timeout
    const body = await Promise.race([
      request.json(),
      new Promise((_, reject): NodeJS.Timeout =>
        setTimeout((): void => reject(new Error('Request body parsing timeout')), 30000)
      ),
    ]);

    // Additional size check on parsed body
    const bodyString = JSON.stringify(body);
    const actualSize = new TextEncoder().encode(bodyString).length;

    if (actualSize > limit) {
      serverLogger.warn(
        {
          event: 'api.body_size.exceeded_after_parse',
          pathname: request.nextUrl.pathname,
          actualSize,
          limit,
        },
        'Parsed body size exceeded limit'
      );

      return {
        error: NextResponse.json(
          {
            error: 'Request body too large',
            maxSize: formatBytes(limit),
            actualSize: formatBytes(actualSize),
          },
          { status: 413 }
        ),
      };
    }

    return { data: body as T };
  } catch (error) {
    serverLogger.warn(
      {
        event: 'api.body_size.parse_error',
        pathname: request.nextUrl.pathname,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'Failed to parse request body'
    );

    return {
      error: NextResponse.json(
        {
          error: 'Invalid request body',
          message: error instanceof Error ? error.message : 'Failed to parse JSON',
        },
        { status: 400 }
      ),
    };
  }
}

/**
 * Higher-order function to wrap API routes with body size limits
 *
 * @param handler - The API route handler function
 * @param limit - Maximum body size in bytes
 * @returns Wrapped handler with body size validation
 *
 * @example
 * export const POST = withBodySizeLimit(
 *   async (request) => {
 *     const body = await request.json();
 *     return NextResponse.json({ success: true });
 *   },
 *   BODY_SIZE_LIMITS.SMALL
 * );
 */
export function withBodySizeLimit(
  handler: (request: NextRequest) => Promise<NextResponse> | NextResponse,
  limit: number = DEFAULT_BODY_SIZE_LIMIT
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Skip body size check for GET, DELETE, and OPTIONS (no body expected)
    if (['GET', 'DELETE', 'OPTIONS', 'HEAD'].includes(request.method)) {
      return handler(request);
    }

    const sizeError = validateBodySize(request, limit);
    if (sizeError) {
      return sizeError;
    }

    return handler(request);
  };
}

/**
 * Preset body size limit configurations for common use cases
 */
export const BodySizeLimitPresets = {
  /** Authentication endpoints (1KB) */
  auth: BODY_SIZE_LIMITS.TINY,
  /** Simple CRUD operations (10KB) */
  crud: BODY_SIZE_LIMITS.SMALL,
  /** API endpoints with JSON data (100KB) */
  api: BODY_SIZE_LIMITS.MEDIUM,
  /** Content-rich endpoints (1MB) */
  content: BODY_SIZE_LIMITS.LARGE,
  /** Batch operations and file metadata (10MB) */
  batch: BODY_SIZE_LIMITS.XLARGE,
} as const;
