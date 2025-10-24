/**
 * Mock API Response Utilities
 * Provides mock implementations of response helpers for testing
 */

/**
 * Creates a JSON response with proper headers
 * Uses native Response with json() method
 */
const createJsonResponse = (payload: unknown, status: number, headers?: Record<string, string>) => {
  const response = new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
  // Ensure json() method works
  const originalJson = response.json.bind(response);
  return Object.assign(response, {
    json: () => originalJson(),
  });
};

/**
 * Implementation functions
 */
const errorResponseImpl = (message: string, status = 500, field?: string, details?: unknown) => {
  const response: any = { error: message };
  if (field) response.field = field;
  if (details) response.details = details;
  return createJsonResponse(response, status);
};

const successResponseImpl = (data?: unknown, message?: string, status = 200) => {
  if (data !== undefined && data !== null && !message) {
    return createJsonResponse(data, status);
  }
  const response: any = { success: true };
  if (data !== undefined) response.data = data;
  if (message) response.message = message;
  return createJsonResponse(response, status);
};

/**
 * Mock error response
 */
export const errorResponse = jest.fn(errorResponseImpl);

/**
 * Mock success response
 */
export const successResponse = jest.fn(successResponseImpl);

const unauthorizedResponseImpl = (message = 'Unauthorized') =>
  createJsonResponse({ error: message }, 401);

const forbiddenResponseImpl = (message = 'Forbidden') =>
  createJsonResponse({ error: message }, 403);

const notFoundResponseImpl = (resource = 'Resource') =>
  createJsonResponse({ error: `${resource} not found` }, 404);

const validationErrorImpl = (message: string, field?: string) => {
  const response: any = { error: message };
  if (field) response.field = field;
  return createJsonResponse(response, 400);
};

const badRequestResponseImpl = (message: string, field?: string) =>
  validationErrorImpl(message, field);

const rateLimitResponseImpl = (limit: number, remaining: number, resetAt: number) => {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
  return createJsonResponse(
    { error: 'Rate limit exceeded', limit, remaining, resetAt, retryAfter },
    429,
    {
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': new Date(resetAt).toISOString(),
      'Retry-After': retryAfter.toString(),
    }
  );
};

const internalServerErrorImpl = (message = 'Internal server error', details?: unknown) =>
  createJsonResponse(
    { error: message, details: process.env.NODE_ENV === 'development' ? details : undefined },
    500
  );

const conflictResponseImpl = (message: string) => createJsonResponse({ error: message }, 409);

const serviceUnavailableResponseImpl = (message: string, details?: unknown) =>
  createJsonResponse({ error: message, details }, 503);

/**
 * Mock unauthorized response (401)
 */
export const unauthorizedResponse = jest.fn(unauthorizedResponseImpl);

/**
 * Mock forbidden response (403)
 */
export const forbiddenResponse = jest.fn(forbiddenResponseImpl);

/**
 * Mock not found response (404)
 */
export const notFoundResponse = jest.fn(notFoundResponseImpl);

/**
 * Mock validation error response (400)
 */
export const validationError = jest.fn(validationErrorImpl);

/**
 * Mock bad request response (400)
 */
export const badRequestResponse = jest.fn(badRequestResponseImpl);

/**
 * Mock rate limit response (429)
 */
export const rateLimitResponse = jest.fn(rateLimitResponseImpl);

/**
 * Mock internal server error response (500)
 */
export const internalServerError = jest.fn(internalServerErrorImpl);

/**
 * Mock conflict response (409)
 */
export const conflictResponse = jest.fn(conflictResponseImpl);

/**
 * Mock service unavailable response (503)
 */
export const serviceUnavailableResponse = jest.fn(serviceUnavailableResponseImpl);

/**
 * Mock error handling wrapper (pass-through in tests)
 */
export const withErrorHandling = jest.fn((handler: any) => handler);

/**
 * Reset all response mocks
 */
export function resetResponseMocks() {
  errorResponse.mockClear();
  successResponse.mockClear();
  unauthorizedResponse.mockClear();
  forbiddenResponse.mockClear();
  notFoundResponse.mockClear();
  validationError.mockClear();
  badRequestResponse.mockClear();
  rateLimitResponse.mockClear();
  internalServerError.mockClear();
  conflictResponse.mockClear();
  serviceUnavailableResponse.mockClear();
  withErrorHandling.mockClear();
}
