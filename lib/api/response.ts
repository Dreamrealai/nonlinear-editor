/**
 * API Response Utilities
 *
 * Standardized response utilities for API routes to ensure consistent
 * error handling, status codes, and response formats across the application.
 *
 * @module lib/api/response
 */

import { NextResponse } from 'next/server';
import { HttpStatusCode } from '../errors/errorCodes';
import {
  errorResponse as coreErrorResponse,
  ErrorResponses,
  getErrorMessage,
} from './errorResponse';
import type { ErrorContext } from './errorResponse';

// Re-export core utilities for convenience
export type { ErrorContext };
export { ErrorResponses, getErrorMessage };

/**
 * Standard error response format
 * Extended to support field and details for backward compatibility
 */
export interface ErrorResponse {
  error: string;
  field?: string;
  details?: unknown;
}

/**
 * Standard success response format with data
 */
export interface SuccessResponse<T = unknown> {
  success: true;
  data?: T;
  message?: string;
}

/**
 * Rate limit response format
 */
export interface RateLimitResponse {
  error: string;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfter: number;
}

/**
 * Creates a standardized error response
 *
 * This is a wrapper around the core errorResponse that maintains backward
 * compatibility with field and details parameters while using the new
 * context-based logging system.
 *
 * @param message - Error message to return
 * @param status - HTTP status code (default: 500)
 * @param field - Optional field name for validation errors
 * @param details - Optional additional details
 * @returns NextResponse with error
 *
 * @example
 * return errorResponse('Unauthorized', 401);
 * return errorResponse('Invalid project ID', 400, 'projectId');
 * return errorResponse('Validation failed', 400, 'email', { pattern: /^.+@.+$/ });
 */
export function errorResponse(
  message: string,
  status: number = HttpStatusCode.INTERNAL_SERVER_ERROR,
  field?: string,
  details?: unknown
): NextResponse<ErrorResponse> {
  // Build context for structured logging
  const context: ErrorContext = {};
  if (field) {
    context.field = field;
  }
  if (details) {
    context.details = details;
  }

  // Use core errorResponse for consistent logging
  const response = coreErrorResponse(message, status, context);

  // Extend response body with field and details for backward compatibility
  if (field || details) {
    const errorBody: ErrorResponse = {
      error: message,
    };
    if (field) {
      errorBody.field = field;
    }
    if (details !== undefined) {
      errorBody.details = details;
    }
    return NextResponse.json(errorBody, { status });
  }

  return response as NextResponse<ErrorResponse>;
}

/**
 * Creates a standardized success response
 *
 * @param data - Data to return
 * @param message - Optional success message
 * @param status - HTTP status code (default: 200)
 * @returns NextResponse with success data
 *
 * @example
 * return successResponse({ id: '123', title: 'Project' });
 * return successResponse(null, 'Project deleted', 200);
 */
export function successResponse<T = unknown>(
  data?: T,
  message?: string,
  status: number = HttpStatusCode.OK
): NextResponse<T | SuccessResponse<T>> {
  // If only data is provided, return it directly (backward compatible)
  if (data !== undefined && data !== null && !message) {
    return NextResponse.json(data, { status });
  }

  // Return structured success response
  const response: SuccessResponse<T> = { success: true };

  if (data !== undefined) {
    response.data = data;
  }

  if (message) {
    response.message = message;
  }

  return NextResponse.json(response, { status });
}

/**
 * Creates an unauthorized (401) error response
 *
 * @param message - Custom error message (default: 'Unauthorized')
 * @returns NextResponse with 401 status
 *
 * @example
 * if (!user) return unauthorizedResponse();
 */
export function unauthorizedResponse(
  message: string = 'Unauthorized'
): NextResponse<ErrorResponse> {
  return errorResponse(message, HttpStatusCode.UNAUTHORIZED);
}

/**
 * Creates a forbidden (403) error response
 *
 * @param message - Custom error message (default: 'Forbidden')
 * @returns NextResponse with 403 status
 *
 * @example
 * if (!isAdmin) return forbiddenResponse('Admin access required');
 */
export function forbiddenResponse(message: string = 'Forbidden'): NextResponse<ErrorResponse> {
  return errorResponse(message, HttpStatusCode.FORBIDDEN);
}

/**
 * Creates a not found (404) error response
 *
 * @param resource - Resource name (e.g., 'Project', 'User')
 * @returns NextResponse with 404 status
 *
 * @example
 * if (!project) return notFoundResponse('Project');
 */
export function notFoundResponse(resource: string = 'Resource'): NextResponse<ErrorResponse> {
  return errorResponse(`${resource} not found`, HttpStatusCode.NOT_FOUND);
}

/**
 * Creates a validation error (400) response
 *
 * @param message - Validation error message
 * @param field - Optional field name that failed validation
 * @returns NextResponse with 400 status
 *
 * @example
 * if (!prompt) return validationError('Prompt is required', 'prompt');
 */
export function validationError(message: string, field?: string): NextResponse<ErrorResponse> {
  return errorResponse(message, HttpStatusCode.BAD_REQUEST, field);
}

/**
 * Creates a rate limit (429) error response with headers
 *
 * @param limit - Rate limit maximum
 * @param remaining - Remaining requests
 * @param resetAt - Timestamp when limit resets
 * @returns NextResponse with 429 status and rate limit headers
 *
 * @example
 * return rateLimitResponse(result.limit, result.remaining, result.resetAt);
 */
export function rateLimitResponse(
  limit: number,
  remaining: number,
  resetAt: number
): NextResponse<RateLimitResponse> {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);

  return NextResponse.json(
    {
      error: 'Rate limit exceeded',
      limit,
      remaining,
      resetAt,
      retryAfter,
    },
    {
      status: HttpStatusCode.RATE_LIMITED,
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': new Date(resetAt).toISOString(),
        'Retry-After': retryAfter.toString(),
      },
    }
  );
}

/**
 * Creates an internal server error (500) response
 *
 * @param message - Custom error message (default: 'Internal server error')
 * @param details - Optional error details (not exposed to client in production)
 * @returns NextResponse with 500 status
 *
 * @example
 * return internalServerError('Database connection failed');
 */
export function internalServerError(
  message: string = 'Internal server error',
  details?: unknown
): NextResponse<ErrorResponse> {
  // In production, don't expose error details to clients
  const isDevelopment = process.env.NODE_ENV === 'development';

  return errorResponse(
    message,
    HttpStatusCode.INTERNAL_SERVER_ERROR,
    undefined,
    isDevelopment ? details : undefined
  );
}

/**
 * Creates a bad request (400) error response
 *
 * @param message - Error message
 * @param field - Optional field name
 * @returns NextResponse with 400 status
 *
 * @example
 * return badRequestResponse('Invalid request format');
 */
export function badRequestResponse(message: string, field?: string): NextResponse<ErrorResponse> {
  return errorResponse(message, HttpStatusCode.BAD_REQUEST, field);
}

/**
 * Creates a conflict (409) error response
 *
 * @param message - Error message
 * @returns NextResponse with 409 status
 *
 * @example
 * return conflictResponse('Resource already exists');
 */
export function conflictResponse(message: string): NextResponse<ErrorResponse> {
  return errorResponse(message, HttpStatusCode.CONFLICT);
}

/**
 * Creates a service unavailable (503) error response
 *
 * @param message - Error message
 * @param details - Optional error details
 * @returns NextResponse with 503 status
 *
 * @example
 * return serviceUnavailableResponse('AI service not configured');
 */
export function serviceUnavailableResponse(
  message: string,
  details?: unknown
): NextResponse<ErrorResponse> {
  return errorResponse(message, HttpStatusCode.SERVICE_UNAVAILABLE, undefined, details);
}

/**
 * Wraps an async handler with try-catch and returns proper error responses
 *
 * @param handler - Async function to wrap
 * @returns Wrapped handler that catches errors
 *
 * @example
 * export const POST = withErrorHandling(async (req) => {
 *   const data = await processRequest(req);
 *   return successResponse(data);
 * });
 */
export function withErrorHandling<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>
): (...args: T) => Promise<NextResponse> {
  return async (...args: T) => {
    try {
      return await handler(...args);
    } catch (error) {
      // Log error using structured logging (server-side only)
      if (typeof process !== 'undefined' && process.env) {
        const { serverLogger } = await import('../serverLogger');
        serverLogger.error({ error }, 'Handler error');
      }
      // Note: If this somehow runs in browser (shouldn't happen), error will be caught
      // by global error handlers in browserLogger

      if (error instanceof Error) {
        const isDevelopment = process?.env?.NODE_ENV !== 'production';
        const publicMessage = isDevelopment ? error.message : undefined;
        const details = isDevelopment ? { name: error.name, stack: error.stack } : undefined;
        return internalServerError(publicMessage, details);
      }

      return internalServerError();
    }
  };
}
