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
 * Error context for logging
 */
export interface ErrorContext {
  userId?: string;
  projectId?: string;
  assetId?: string;
  operationName?: string;
  requestId?: string;
  endpoint?: string;
  method?: string;
  [key: string]: unknown;
}

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
  context?: ErrorContext
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
 * Using const assertion for better type inference
 */
export const ErrorResponses = {
  /**
   * 400 Bad Request - Invalid input
   */
  badRequest: (message: string = 'Invalid request', context?: ErrorContext) =>
    errorResponse(message, 400, context),

  /**
   * 401 Unauthorized - Authentication required
   */
  unauthorized: (message: string = 'Unauthorized', context?: ErrorContext) =>
    errorResponse(message, 401, context),

  /**
   * 403 Forbidden - Insufficient permissions
   */
  forbidden: (message: string = 'Forbidden', context?: ErrorContext) =>
    errorResponse(message, 403, context),

  /**
   * 404 Not Found - Resource not found
   */
  notFound: (message: string = 'Not found', context?: ErrorContext) =>
    errorResponse(message, 404, context),

  /**
   * 409 Conflict - Resource conflict
   */
  conflict: (message: string = 'Conflict', context?: ErrorContext) =>
    errorResponse(message, 409, context),

  /**
   * 429 Too Many Requests - Rate limit exceeded
   */
  tooManyRequests: (message: string = 'Too many requests', context?: ErrorContext) =>
    errorResponse(message, 429, context),

  /**
   * 500 Internal Server Error - Unexpected error
   */
  internal: (message: string = 'Internal server error', context?: ErrorContext) =>
    errorResponse(message, 500, context),

  /**
   * 503 Service Unavailable - Service temporarily unavailable
   */
  serviceUnavailable: (message: string = 'Service unavailable', context?: ErrorContext) =>
    errorResponse(message, 503, context),
} as const satisfies Record<
  string,
  (message?: string, context?: ErrorContext) => NextResponse<ErrorResponse>
>;

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
