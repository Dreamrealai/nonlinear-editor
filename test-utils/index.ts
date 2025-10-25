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
 *
 * @example API Route Testing
 * ```ts
 * import { createTestAuthHandler, createAuthenticatedRequest } from '@/test-utils';
 *
 * describe('POST /api/projects', () => {
 *   it('creates project', async () => {
 *     const handler = createTestAuthHandler(POST);
 *     const { request } = createAuthenticatedRequest({
 *       method: 'POST',
 *       url: '/api/projects',
 *       body: { title: 'Test' }
 *     });
 *     const response = await handler(request, { params: Promise.resolve({}) });
 *     expect(response.status).toBe(200);
 *   });
 * });
 * ```
 *
 * @example FormData Testing
 * ```ts
 * import { createTestFormData, createAuthFormDataRequest } from '@/test-utils';
 *
 * const formData = createTestFormData({ message: 'Hello', model: 'gpt-4' });
 * const { request } = createAuthFormDataRequest(formData);
 * ```
 */

// ============================================================================
// React Testing Library
// ============================================================================
// Re-export all @testing-library/react utilities
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';

// ============================================================================
// Custom Render Functions
// ============================================================================
// Re-export custom render with providers (for component tests)
export { render, renderHook } from './render';

// ============================================================================
// Supabase Mocking Utilities
// ============================================================================
// Comprehensive Supabase client mocking with chainable query builder
// Use these for all Supabase-related testing
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

// ============================================================================
// Auth Testing Utilities
// ============================================================================
// Test-friendly auth utilities with in-memory database
// Use these for API route testing that requires authentication
export {
  createTestAuthHandler,
  createAuthenticatedRequest,
  createUnauthenticatedRequest,
  createTestUser,
  createTestSupabaseClient,
  getTestDatabase,
  clearTestDatabase,
  type TestUserData,
} from './testWithAuth';

// withAuth middleware mock (for mocking @/lib/api/withAuth)
export { mockWithAuth } from './mockWithAuth';

// ============================================================================
// FormData Testing Utilities
// ============================================================================
// Helpers for testing API routes that accept FormData
export {
  createTestFormData,
  createAuthFormDataRequest,
  createUnauthFormDataRequest,
  createTestFile,
  createFormDataWithFiles,
  type FormDataValue,
  type FormDataFields,
} from './formDataHelpers';

// ============================================================================
// General Test Helpers
// ============================================================================
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

// ============================================================================
// Stripe Mocking Utilities
// ============================================================================
export {
  createMockCheckoutSession,
  createMockSubscription,
  createMockCustomer,
  createMockWebhookEvent,
  createMockStripeClient,
} from './mockStripe';

// ============================================================================
// API Response Mocking
// ============================================================================
export { mockApiResponse, createApiResponseMock } from './mockApiResponse';

// ============================================================================
// Environment Variable Mocking
// ============================================================================
export {
  mockEnv,
  restoreEnv,
  setTestEnv,
  getTestEnv,
  assertTestEnv,
  withTestEnv,
  withTestEnvAsync,
} from './mockEnv';

// ============================================================================
// Fetch API Mocking
// ============================================================================
export {
  mockFetch,
  mockFetchSuccess,
  mockFetchError,
  mockFetchReject,
  mockFetchWith,
  mockFetchSequence,
  mockFetchByUrl,
  resetFetchMocks,
  createFetchSpy,
  waitForFetchCalls,
  type MockFetchResponse,
} from './mockFetch';
