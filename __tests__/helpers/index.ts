/**
 * Test Helpers - Main Export
 *
 * Central export point for all test utilities. Import helpers from this file
 * to access the full suite of testing utilities.
 *
 * @module __tests__/helpers
 * @example
 * ```typescript
 * // Import specific helpers
 * import { createMockSupabaseClient, mockFetch } from '@/__tests__/helpers';
 *
 * // Or import by category
 * import * as supabaseHelpers from '@/__tests__/helpers/supabase';
 * import * as apiHelpers from '@/__tests__/helpers/api';
 * ```
 */

// Export all Supabase helpers
export {
  createMockSupabaseClient,
  createMockQueryBuilder,
  createMockAuthUser,
  createMockSession,
  createMockStorageClient,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  mockQuerySuccess,
  mockQueryError,
  mockStorageUploadSuccess,
  mockStorageUploadError,
  resetAllMocks,
  type MockSupabaseClient,
} from './supabase';

// Export all API helpers
export {
  createAuthenticatedRequest,
  createMockResponse,
  createMockFetchResponse,
  createJSONRequest,
  createFormDataRequest,
  expectSuccessResponse,
  expectErrorResponse,
  expectUnauthorized,
  expectNotFound,
  expectBadRequest,
  expectInternalServerError,
  mockFetchResponses,
  parseResponse,
  expectHeaders,
  expectHeaderContains,
} from './api';

// Export all component helpers
export {
  renderWithProviders,
  waitForLoadingToFinish,
  createMockRouter,
  setupUserEvent,
  waitForElement,
  waitForElementToDisappear,
  fillForm,
  clickButton,
  submitForm,
  wait,
  expectToHaveClasses,
  expectToBeInteractive,
  expectToBeDisabled,
  expectTextContent,
  getErrorMessages,
  expectNoErrors,
  expectErrorMessage,
  mockAlert,
  mockConfirm,
  mockPrompt,
  type RenderWithProvidersOptions,
} from './components';

// Export all mock utilities
export {
  mockFetch,
  createMockFile,
  createMockFiles,
  mockLocalStorage,
  mockSessionStorage,
  mockIntersectionObserver,
  mockResizeObserver,
  mockMatchMedia,
  mockURL,
  mockConsole,
  restoreConsole,
  mockTimers,
  createMockBlob,
  createMockFileList,
  nextTick,
  flushPromises,
  type MockFetchResponse,
} from './mocks';

/**
 * Common test data generators.
 *
 * @example
 * ```typescript
 * import { testData } from '@/__tests__/helpers';
 *
 * const user = testData.user({ email: 'custom@example.com' });
 * const project = testData.project({ title: 'My Project' });
 * ```
 */
export const testData = {
  /**
   * Generate mock user
   */
  user: (overrides?: Record<string, any>) => ({
    id: 'test-user-id',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  }),

  /**
   * Generate mock project
   */
  project: (overrides?: Record<string, any>) => ({
    id: 'test-project-id',
    user_id: 'test-user-id',
    title: 'Test Project',
    timeline_state_jsonb: {},
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  }),

  /**
   * Generate mock asset
   */
  asset: (overrides?: Record<string, any>) => ({
    id: 'test-asset-id',
    project_id: 'test-project-id',
    user_id: 'test-user-id',
    storage_url: 'supabase://assets/test-user-id/test-project-id/image/test.jpg',
    type: 'image',
    mime_type: 'image/jpeg',
    width: 1920,
    height: 1080,
    source: 'upload',
    metadata: {
      filename: 'test.jpg',
      mimeType: 'image/jpeg',
      size: 1024,
    },
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
  }),

  /**
   * Generate mock user profile
   */
  userProfile: (overrides?: Record<string, any>) => ({
    id: 'test-user-id',
    email: 'test@example.com',
    tier: 'free',
    video_minutes_used: 0,
    video_minutes_limit: 10,
    ai_requests_used: 0,
    ai_requests_limit: 100,
    storage_gb_used: 0,
    storage_gb_limit: 2,
    usage_reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    subscription_status: null,
    subscription_current_period_start: null,
    subscription_current_period_end: null,
    subscription_cancel_at_period_end: false,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    stripe_price_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }),

  /**
   * Generate mock chat message
   */
  message: (overrides?: Record<string, any>) => ({
    id: 'msg-1',
    role: 'user' as const,
    content: 'Test message',
    created_at: new Date().toISOString(),
    model: 'gemini-flash-latest',
    ...overrides,
  }),

  /**
   * Generate mock activity history entry
   */
  activity: (overrides?: Record<string, any>) => ({
    id: 'activity-1',
    activity_type: 'video_generation',
    title: 'Test Activity',
    description: 'Test description',
    model: 'veo-2.0',
    metadata: {},
    created_at: new Date().toISOString(),
    ...overrides,
  }),

  /**
   * Generate mock video generation job
   */
  videoJob: (overrides?: Record<string, any>) => ({
    id: 'job-1',
    user_id: 'test-user-id',
    project_id: 'test-project-id',
    prompt: 'Test video prompt',
    status: 'pending',
    model: 'veo-2.0',
    external_job_id: 'ext-job-1',
    result_url: null,
    error: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }),

  /**
   * Generate mock Stripe checkout session
   */
  checkoutSession: (overrides?: Record<string, any>) => ({
    id: 'cs_test_123',
    url: 'https://checkout.stripe.com/test',
    customer: 'cus_test_123',
    status: 'open',
    payment_status: 'unpaid',
    mode: 'subscription',
    ...overrides,
  }),

  /**
   * Generate mock Stripe subscription
   */
  subscription: (overrides?: Record<string, any>) => ({
    id: 'sub_test_123',
    customer: 'cus_test_123',
    status: 'active',
    current_period_start: Math.floor(Date.now() / 1000),
    current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    cancel_at_period_end: false,
    items: {
      data: [
        {
          id: 'si_test_123',
          price: {
            id: 'price_test_123',
            product: 'prod_test_123',
            unit_amount: 999,
            currency: 'usd',
            recurring: {
              interval: 'month',
            },
          },
        },
      ],
    },
    ...overrides,
  }),
};

/**
 * Setup functions for common test scenarios.
 *
 * @example
 * ```typescript
 * import { setup } from '@/__tests__/helpers';
 *
 * beforeEach(() => {
 *   setup.mockBrowserAPIs();
 * });
 * ```
 */
export const setup = {
  /**
   * Mock all common browser APIs (IntersectionObserver, ResizeObserver, etc.)
   */
  mockBrowserAPIs: () => {
    mockIntersectionObserver();
    mockResizeObserver();
    mockMatchMedia();
    mockURL();
  },

  /**
   * Mock all storage APIs (localStorage, sessionStorage)
   */
  mockStorage: () => {
    mockLocalStorage();
    mockSessionStorage();
  },

  /**
   * Setup a complete authenticated test environment
   */
  authenticatedEnvironment: () => {
    const mockSupabase = createMockSupabaseClient();
    const user = mockAuthenticatedUser(mockSupabase);
    const router = createMockRouter();

    return {
      mockSupabase,
      user,
      router,
    };
  },

  /**
   * Setup a complete unauthenticated test environment
   */
  unauthenticatedEnvironment: () => {
    const mockSupabase = createMockSupabaseClient();
    mockUnauthenticatedUser(mockSupabase);
    const router = createMockRouter();

    return {
      mockSupabase,
      router,
    };
  },
};

/**
 * Cleanup functions to reset test state.
 *
 * @example
 * ```typescript
 * import { cleanup } from '@/__tests__/helpers';
 *
 * afterEach(() => {
 *   cleanup.all();
 * });
 * ```
 */
export const cleanup = {
  /**
   * Reset all mocks
   */
  mocks: () => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  },

  /**
   * Clear all storage
   */
  storage: () => {
    if (typeof window !== 'undefined') {
      window.localStorage?.clear();
      window.sessionStorage?.clear();
    }
  },

  /**
   * Reset all timers
   */
  timers: () => {
    jest.useRealTimers();
  },

  /**
   * Full cleanup - reset everything
   */
  all: () => {
    cleanup.mocks();
    cleanup.storage();
    cleanup.timers();
  },
};
