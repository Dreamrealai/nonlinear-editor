/**
 * Test Utilities - Main Entry Point
 *
 * This module exports all test utilities, helpers, and custom render functions
 * for use across the test suite. Import from this file for consistent testing setup.
 *
 * @example
 * ```ts
 * import { render, screen, waitFor, createMockSupabaseClient } from '@/test-utils';
 *
 * test('my component', () => {
 *   const mockSupabase = createMockSupabaseClient();
 *   render(<MyComponent />, { mockSupabase });
 *   expect(screen.getByText('Hello')).toBeInTheDocument();
 * });
 * ```
 */

// Re-export all @testing-library/react utilities
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';

// Re-export custom render with providers
export { render, renderHook } from './render';

// Re-export Supabase mocking utilities
export {
  createMockSupabaseClient,
  createMockUser,
  createMockProject,
  createMockAsset,
  createMockUserProfile,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  mockQuerySuccess,
  mockQueryError,
  mockStorageUploadSuccess,
  mockStorageUploadError,
  resetAllMocks,
  type MockSupabaseChain,
} from './mockSupabase';

// Re-export test helpers
export {
  createMockRouter,
  createMockFetchResponse,
  createMockFile,
  mockConsole,
  testData,
  customMatchers,
  setupTestEnvironment,
  cleanupTestEnvironment,
  asyncUtils,
  waitForAsync,
} from './testHelpers';

// Re-export Stripe mocking utilities
export {
  createMockCheckoutSession,
  createMockSubscription,
  createMockCustomer,
  createMockWebhookEvent,
  createMockStripeClient,
} from './mockStripe';

// Re-export API response mocking
export { mockApiResponse, createApiResponseMock } from './mockApiResponse';

// Re-export environment mocking
export { mockEnv, restoreEnv, setTestEnv } from './mockEnv';

// Re-export fetch mocking
export { mockFetch, mockFetchSuccess, mockFetchError, resetFetchMocks } from './mockFetch';
