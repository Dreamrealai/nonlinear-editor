/**
 * Test Utilities and Helpers
 *
 * Common utilities, mocks, and helpers for testing React components.
 * Use these to reduce duplication and maintain consistency across tests.
 */

import { type UserProfile } from '@/lib/types/subscription';

/**
 * Mock Supabase client builder
 * Creates a mock Supabase client with common methods
 */
export function createMockSupabaseClient(overrides = {}) {
  const defaultMock = {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    }),
    channel: jest.fn().mockReturnValue({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
    }),
    removeChannel: jest.fn(),
  };

  return {
    ...defaultMock,
    ...overrides,
  };
}

/**
 * Mock Next.js router
 */
export function createMockRouter(overrides = {}) {
  return {
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn(),
    ...overrides,
  };
}

/**
 * Create mock user profile for testing
 */
export function createMockUserProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'user-123',
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
  };
}

/**
 * Wait for async operations to complete
 */
export function waitForAsync(ms = 0) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create mock fetch response
 */
export function createMockFetchResponse<T>(data: T, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
    headers: new Headers(),
    redirected: false,
    statusText: ok ? 'OK' : 'Error',
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
 * Create mock file for upload testing
 */
export function createMockFile(name = 'test.mp4', type = 'video/mp4', size = 1024): File {
  const blob = new Blob(['x'.repeat(size)], { type });
  return new File([blob], name, { type });
}

/**
 * Mock console methods to suppress logs during tests
 */
export function mockConsole() {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  beforeEach(() => {
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
  });

  afterEach(() => {
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
  });
}

/**
 * Common test data generators
 */
export const testData = {
  /**
   * Generate mock asset
   */
  asset: (overrides = {}) => ({
    id: 'asset-1',
    storage_url: 'supabase://project/videos/test.mp4',
    duration_seconds: 30,
    metadata: {
      filename: 'test.mp4',
      mimeType: 'video/mp4',
      thumbnail: 'https://example.com/thumb.jpg',
    },
    rawMetadata: null,
    created_at: new Date().toISOString(),
    type: 'video' as const,
    ...overrides,
  }),

  /**
   * Generate mock project
   */
  project: (overrides = {}) => ({
    id: 'project-1',
    title: 'Test Project',
    user_id: 'user-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }),

  /**
   * Generate mock chat message
   */
  message: (overrides = {}) => ({
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
  activity: (overrides = {}) => ({
    id: 'activity-1',
    activity_type: 'video_generation',
    title: 'Test Activity',
    description: 'Test description',
    model: 'veo-2.0',
    metadata: {},
    created_at: new Date().toISOString(),
    ...overrides,
  }),
};

/**
 * Custom matchers for common assertions
 */
export const customMatchers = {
  /**
   * Check if element has specific Tailwind classes
   */
  toHaveTailwindClasses(element: HTMLElement, ...classes: string[]) {
    const classList = Array.from(element.classList);
    const missingClasses = classes.filter((cls) => !classList.includes(cls));

    if (missingClasses.length > 0) {
      return {
        pass: false,
        message: () =>
          `Expected element to have classes: ${classes.join(', ')}\n` +
          `Missing classes: ${missingClasses.join(', ')}\n` +
          `Actual classes: ${classList.join(', ')}`,
      };
    }

    return {
      pass: true,
      message: () => `Expected element not to have classes: ${classes.join(', ')}`,
    };
  },
};

/**
 * Setup global test environment
 */
export function setupTestEnvironment() {
  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });

  // Mock IntersectionObserver
  global.IntersectionObserver = class IntersectionObserver {
    root = null;
    rootMargin = '';
    thresholds = [];

    constructor() {}
    disconnect() {}
    observe() {}
    takeRecords() {
      return [];
    }
    unobserve() {}
  } as unknown as typeof IntersectionObserver;

  // Mock ResizeObserver
  global.ResizeObserver = class ResizeObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    unobserve() {}
  };

  // Mock URL.createObjectURL and revokeObjectURL
  if (typeof URL.createObjectURL === 'undefined') {
    URL.createObjectURL = jest.fn(() => 'blob:mock-url');
  }
  if (typeof URL.revokeObjectURL === 'undefined') {
    URL.revokeObjectURL = jest.fn();
  }
}

/**
 * Clean up after tests
 */
export function cleanupTestEnvironment() {
  jest.clearAllMocks();
  jest.restoreAllMocks();
}

/**
 * Async utilities
 */
export const asyncUtils = {
  /**
   * Flush all pending promises
   */
  flushPromises: () => new Promise((resolve) => setImmediate(resolve)),

  /**
   * Wait for condition to be true
   */
  waitForCondition: async (condition: () => boolean, timeout = 5000, interval = 50) => {
    const startTime = Date.now();
    while (!condition()) {
      if (Date.now() - startTime > timeout) {
        throw new Error('Timeout waiting for condition');
      }
      await waitForAsync(interval);
    }
  },
};
