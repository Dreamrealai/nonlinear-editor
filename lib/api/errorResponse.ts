/**
 * Standardized Error Response Utilities
 *
 * Provides consistent error response formatting across all API routes.
 * All error responses follow the format: { error: string }
 *
 * Benefits:
 * - Consistent error handling on frontend
 * - Standardized HTTP status codes
 * - Type-safe error responses
 * - Centralized error logging
 */

import { NextResponse } from 'next/server';
import { serverLogger } from '@/lib/serverLogger';

/**
 * Standard error response format
 */
export interface ErrorResponse {
  error: string;
}

/**
 * Creates a standardized error response with proper logging
 *
 * @param message - User-friendly error message
 * @param status - HTTP status code (default: 500)
 * @param context - Additional context for logging
 * @returns NextResponse with standardized error format
 *
 * @example
 * ```ts
 * return errorResponse('Invalid project ID', 400, { projectId });
 * ```
 */
export function errorResponse(
  message: string,
  status: number = 500,
  context?: Record<string, unknown>
): NextResponse<ErrorResponse> {
  // Log error with context
  const logLevel = status >= 500 ? 'error' : 'warn';
  serverLogger[logLevel](
    {
      event: 'api.error_response',
      statusCode: status,
      ...context,
    },
    message
  );

  return NextResponse.json<ErrorResponse>({ error: message }, { status });
}

/**
 * Common error response creators for frequent use cases
 */
export const ErrorResponses = {
  /**
   * 400 Bad Request - Invalid input
   */
  badRequest: (message: string = 'Invalid request', context?: Record<string, unknown>) =>
    errorResponse(message, 400, context),

  /**
   * 401 Unauthorized - Authentication required
   */
  unauthorized: (message: string = 'Unauthorized', context?: Record<string, unknown>) =>
    errorResponse(message, 401, context),

  /**
   * 403 Forbidden - Insufficient permissions
   */
  forbidden: (message: string = 'Forbidden', context?: Record<string, unknown>) =>
    errorResponse(message, 403, context),

  /**
   * 404 Not Found - Resource not found
   */
  notFound: (message: string = 'Not found', context?: Record<string, unknown>) =>
    errorResponse(message, 404, context),

  /**
   * 409 Conflict - Resource conflict
   */
  conflict: (message: string = 'Conflict', context?: Record<string, unknown>) =>
    errorResponse(message, 409, context),

  /**
   * 429 Too Many Requests - Rate limit exceeded
   */
  tooManyRequests: (message: string = 'Too many requests', context?: Record<string, unknown>) =>
    errorResponse(message, 429, context),

  /**
   * 500 Internal Server Error - Unexpected error
   */
  internal: (message: string = 'Internal server error', context?: Record<string, unknown>) =>
    errorResponse(message, 500, context),

  /**
   * 503 Service Unavailable - Service temporarily unavailable
   */
  serviceUnavailable: (
    message: string = 'Service unavailable',
    context?: Record<string, unknown>
  ) => errorResponse(message, 503, context),
};

/**
 * Helper to extract error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}
