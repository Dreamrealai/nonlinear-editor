/**
 * Mock setup for @/lib/api/response module
 *
 * Use this in your tests instead of manually mocking the response module:
 *
 * @example
 * import { mockApiResponse } from '@/test-utils/mockApiResponse';
 * mockApiResponse();
 */

/**
 * Sets up proper mocking for the @/lib/api/response module.
 * This uses the actual implementations but allows mocking withErrorHandling.
 */
export function mockApiResponse() {
  jest.mock('@/lib/api/response', () => {
    const actual = jest.requireActual('@/lib/api/response');
    return {
      ...actual,
      withErrorHandling: jest.fn((handler) => handler),
    };
  });
}

/**
 * Factory function to create the mock configuration.
 * Use this if you need to customize the mock behavior.
 */
export function createApiResponseMock(overrides?: Record<string, any>) {
  const actual = jest.requireActual('@/lib/api/response');
  return {
    ...actual,
    withErrorHandling: jest.fn((handler) => handler),
    ...overrides,
  };
}
