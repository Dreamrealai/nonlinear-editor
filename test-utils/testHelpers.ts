/**
 * Test Utilities and Helpers
 *
 * Common utilities, mocks, and helpers for testing React components.
 * Use these to reduce duplication and maintain consistency across tests.
 *
 * NOTE: For Supabase mocking, use the utilities from mockSupabase.ts:
 * - createMockSupabaseClient
 * - createMockUser, createMockProject, createMockAsset
 * - mockAuthenticatedUser, mockUnauthenticatedUser
 */

/**
 * Mock Next.js router
 */
export function createMockRouter(overrides = {}): ReturnType<typeof jest.fn> & {
  push: ReturnType<typeof jest.fn>;
  replace: ReturnType<typeof jest.fn>;
  refresh: ReturnType<typeof jest.fn>;
  back: ReturnType<typeof jest.fn>;
  forward: ReturnType<typeof jest.fn>;
  prefetch: ReturnType<typeof jest.fn>;
} {
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
 * Wait for async operations to complete
 */
export function waitForAsync(ms = 0): Promise<unknown> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create mock fetch response
 */
export function createMockFetchResponse<T>(data: T, ok = true, status = 200): Promise<Response> {
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
export function mockConsole(): void {
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
  asset: (overrides = {}): Record<string, unknown> => ({
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
  project: (overrides = {}): Record<string, unknown> => ({
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
  message: (overrides = {}): Record<string, unknown> => ({
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
  activity: (overrides = {}): Record<string, unknown> => ({
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
  toHaveTailwindClasses(
    element: HTMLElement,
    ...classes: string[]
  ): { pass: boolean; message: () => string } {
    const classList = Array.from(element.classList);
    const missingClasses = classes.filter((cls) => !classList.includes(cls));

    if (missingClasses.length > 0) {
      return {
        pass: false,
        message: (): string =>
          `Expected element to have classes: ${classes.join(', ')}\n` +
          `Missing classes: ${missingClasses.join(', ')}\n` +
          `Actual classes: ${classList.join(', ')}`,
      };
    }

    return {
      pass: true,
      message: (): string => `Expected element not to have classes: ${classes.join(', ')}`,
    };
  },
};

/**
 * Setup global test environment
 */
export function setupTestEnvironment(): void {
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
    disconnect(): void {}
    observe(): void {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
    unobserve(): void {}
  } as unknown as typeof IntersectionObserver;

  // Mock ResizeObserver
  global.ResizeObserver = class ResizeObserver {
    constructor() {}
    disconnect(): void {}
    observe(): void {}
    unobserve(): void {}
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
export function cleanupTestEnvironment(): void {
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
  flushPromises: (): Promise<unknown> => new Promise((resolve) => setImmediate(resolve)),

  /**
   * Wait for condition to be true
   */
  waitForCondition: async (
    condition: () => boolean,
    timeout = 5000,
    interval = 50
  ): Promise<void> => {
    const startTime = Date.now();
    while (!condition()) {
      if (Date.now() - startTime > timeout) {
        throw new Error('Timeout waiting for condition');
      }
      await waitForAsync(interval);
    }
  },
};
