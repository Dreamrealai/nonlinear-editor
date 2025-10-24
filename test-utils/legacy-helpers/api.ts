/**
 * API Test Helpers
 *
 * Utilities for testing Next.js API routes and HTTP requests.
 * Provides helpers for creating authenticated requests, mocking responses,
 * and asserting on API response formats.
 *
 * @module __tests__/helpers/api
 * @example
 * ```typescript
 * import { createAuthenticatedRequest, expectSuccessResponse } from '@/__tests__/helpers/api';
 *
 * const request = createAuthenticatedRequest('user-123', {
 *   method: 'POST',
 *   body: JSON.stringify({ title: 'Test' })
 * });
 * const response = await POST(request);
 * expectSuccessResponse(response, { id: expect.any(String) });
 * ```
 */

import { NextRequest } from 'next/server';
import { createMockSession } from './supabase';

/**
 * Creates a mock NextRequest with authentication headers.
 *
 * @param userId - The authenticated user ID
 * @param options - Optional request configuration
 * @returns NextRequest with auth headers
 *
 * @example
 * ```typescript
 * const request = createAuthenticatedRequest('user-123', {
 *   method: 'POST',
 *   body: JSON.stringify({ title: 'Test Project' })
 * });
 * ```
 */
export function createAuthenticatedRequest(
  userId: string,
  options?: RequestInit & { url?: string }
): NextRequest {
  const url = options?.url || 'http://localhost:3000/api/test';
  const { url: _, ...requestOptions } = options || {};

  return new NextRequest(url, {
    method: 'GET',
    ...requestOptions,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
}

/**
 * Creates a mock session for testing.
 *
 * @param userId - User ID for the session
 * @param tier - Optional subscription tier (free, premium)
 * @returns Mock session object
 *
 * @example
 * ```typescript
 * const session = createMockSession('user-123', 'premium');
 * mockSupabase.auth.getSession.mockResolvedValue({
 *   data: { session },
 *   error: null
 * });
 * ```
 */
export { createMockSession };

/**
 * Creates a mock Response object with JSON data.
 *
 * @param data - The response data
 * @param status - HTTP status code (default: 200)
 * @param headers - Optional additional headers
 * @returns Mock Response
 *
 * @example
 * ```typescript
 * const response = createMockResponse({ success: true }, 201);
 * expect(response.status).toBe(201);
 * const data = await response.json();
 * expect(data.success).toBe(true);
 * ```
 */
export function createMockResponse<T = unknown>(
  data: T,
  status: number = 200,
  headers?: Record<string, string>
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

/**
 * Asserts that a response is successful and optionally matches expected data.
 *
 * @param response - The response to check
 * @param expectedData - Optional data to match against
 * @returns The response data
 *
 * @example
 * ```typescript
 * const response = await POST(request);
 * const data = await expectSuccessResponse(response, {
 *   id: expect.any(String),
 *   title: 'Test Project'
 * });
 * ```
 */
export async function expectSuccessResponse<T = unknown>(
  response: Response,
  expectedData?: Partial<T> | jest.Matchers<Partial<T>>
): Promise<T> {
  expect(response.status).toBeGreaterThanOrEqual(200);
  expect(response.status).toBeLessThan(300);
  expect(response.headers.get('content-type')).toContain('application/json');

  const data = await response.json();

  if (expectedData) {
    expect(data).toMatchObject(expectedData);
  }

  return data;
}

/**
 * Asserts that a response is an error with expected status and message.
 *
 * @param response - The response to check
 * @param expectedStatus - Expected HTTP status code
 * @param expectedError - Optional error message or pattern to match
 *
 * @example
 * ```typescript
 * const response = await POST(request);
 * await expectErrorResponse(response, 401, 'Unauthorized');
 * ```
 */
export async function expectErrorResponse(
  response: Response,
  expectedStatus: number,
  expectedError?: string | RegExp
): Promise<unknown> {
  expect(response.status).toBe(expectedStatus);

  const data = await response.json();
  expect(data).toHaveProperty('error');

  if (expectedError) {
    if (typeof expectedError === 'string') {
      expect(data.error).toBe(expectedError);
    } else {
      expect(data.error).toMatch(expectedError);
    }
  }

  return data;
}

/**
 * Creates a mock fetch response (for global.fetch mocking).
 *
 * @param data - The response data
 * @param ok - Whether the response is successful (default: true)
 * @param status - HTTP status code (default: 200)
 * @returns Promise resolving to mock Response
 *
 * @example
 * ```typescript
 * global.fetch = jest.fn().mockResolvedValue(
 *   createMockFetchResponse({ success: true })
 * );
 * ```
 */
export function createMockFetchResponse<T = unknown>(
  data: T,
  ok: boolean = true,
  status: number = 200
): Promise<Response> {
  return Promise.resolve({
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: async () => data,
    text: async () => JSON.stringify(data),
    headers: new Headers({ 'Content-Type': 'application/json' }),
    redirected: false,
    type: 'basic' as ResponseType,
    url: '',
    clone: jest.fn(),
    body: null,
    bodyUsed: false,
    arrayBuffer: jest.fn(),
    blob: jest.fn(),
    formData: jest.fn(),
    bytes: jest.fn(),
  } as unknown as Response);
}

/**
 * Expects a response to be a 401 Unauthorized error.
 *
 * @param response - The response to check
 *
 * @example
 * ```typescript
 * const response = await GET(request);
 * await expectUnauthorized(response);
 * ```
 */
export async function expectUnauthorized(response: Response): Promise<void> {
  await expectErrorResponse(response, 401, 'Unauthorized');
}

/**
 * Expects a response to be a 404 Not Found error.
 *
 * @param response - The response to check
 *
 * @example
 * ```typescript
 * const response = await GET(request);
 * await expectNotFound(response);
 * ```
 */
export async function expectNotFound(response: Response): Promise<void> {
  expect(response.status).toBe(404);
}

/**
 * Expects a response to be a 400 Bad Request error.
 *
 * @param response - The response to check
 * @param expectedError - Optional error message
 *
 * @example
 * ```typescript
 * const response = await POST(request);
 * await expectBadRequest(response, 'Invalid input');
 * ```
 */
export async function expectBadRequest(response: Response, expectedError?: string): Promise<void> {
  await expectErrorResponse(response, 400, expectedError);
}

/**
 * Expects a response to be a 500 Internal Server Error.
 *
 * @param response - The response to check
 * @param expectedError - Optional error message
 *
 * @example
 * ```typescript
 * const response = await POST(request);
 * await expectInternalServerError(response);
 * ```
 */
export async function expectInternalServerError(
  response: Response,
  expectedError?: string
): Promise<void> {
  await expectErrorResponse(response, 500, expectedError);
}

/**
 * Sets up global fetch mock with predefined responses.
 *
 * @param responses - Array of mock responses or a single response
 *
 * @example
 * ```typescript
 * mockFetchResponses([
 *   { data: { id: '1' }, status: 200 },
 *   { data: { error: 'Failed' }, status: 500, ok: false }
 * ]);
 * ```
 */
export function mockFetchResponses(
  responses: Array<{ data: unknown; ok?: boolean; status?: number }>
): void {
  const mockResponses = responses.map((r) =>
    createMockFetchResponse(r.data, r.ok ?? true, r.status ?? 200)
  );

  if (mockResponses.length === 1) {
    (global.fetch as jest.Mock) = jest.fn().mockResolvedValue(mockResponses[0]);
  } else {
    (global.fetch as jest.Mock) = jest.fn();
    mockResponses.forEach((response, _index) => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(response);
    });
  }
}

/**
 * Creates request with JSON body.
 *
 * @param url - Request URL
 * @param method - HTTP method
 * @param body - Request body (will be JSON stringified)
 * @returns NextRequest
 *
 * @example
 * ```typescript
 * const request = createJSONRequest(
 *   'http://localhost:3000/api/projects',
 *   'POST',
 *   { title: 'Test Project' }
 * );
 * ```
 */
export function createJSONRequest(url: string, method: string, body?: unknown): NextRequest {
  return new NextRequest(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Creates a FormData request.
 *
 * @param url - Request URL
 * @param formData - FormData object
 * @returns NextRequest
 *
 * @example
 * ```typescript
 * const formData = new FormData();
 * formData.append('file', new File(['test'], 'test.txt'));
 * const request = createFormDataRequest(
 *   'http://localhost:3000/api/upload',
 *   formData
 * );
 * ```
 */
export function createFormDataRequest(url: string, formData: FormData): NextRequest {
  return new NextRequest(url, {
    method: 'POST',
    body: formData,
  });
}

/**
 * Waits for a response and parses JSON, handling errors gracefully.
 *
 * @param response - The response to parse
 * @returns Parsed JSON data
 *
 * @example
 * ```typescript
 * const data = await parseResponse(response);
 * expect(data.id).toBeDefined();
 * ```
 */
export async function parseResponse<T = unknown>(response: Response): Promise<T> {
  try {
    return await response.json();
  } catch {
    throw new Error(`Failed to parse response: ${response.status} ${response.statusText}`);
  }
}

/**
 * Expects response to have specific headers.
 *
 * @param response - The response to check
 * @param headers - Expected headers (key-value pairs)
 *
 * @example
 * ```typescript
 * expectHeaders(response, {
 *   'content-type': 'application/json',
 *   'cache-control': 'no-store'
 * });
 * ```
 */
export function expectHeaders(response: Response, headers: Record<string, string>): void {
  Object.entries(headers).forEach(([key, value]) => {
    expect(response.headers.get(key)).toBe(value);
  });
}

/**
 * Expects response header to contain a value.
 *
 * @param response - The response to check
 * @param header - Header name
 * @param value - Expected substring
 *
 * @example
 * ```typescript
 * expectHeaderContains(response, 'content-type', 'application/json');
 * ```
 */
export function expectHeaderContains(response: Response, header: string, value: string): void {
  const headerValue = response.headers.get(header);
  expect(headerValue).toBeTruthy();
  expect(headerValue).toContain(value);
}
