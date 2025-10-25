/**
 * Common Mock Utilities
 *
 * @deprecated This legacy mock utilities module is deprecated.
 * Please migrate to modern utilities:
 * - `mockFetch` → Use `/test-utils/mockFetch.ts`
 * - `createMockFile` → Use `/test-utils/testHelpers.ts`
 * - `mockLocalStorage`, `mockIntersectionObserver`, etc. → Use `/test-utils/testHelpers.ts` `setupTestEnvironment()`
 *
 * **Migration Guide:** See `/docs/TESTING_UTILITIES.md` section "Migrating from Legacy Test Utilities"
 * **Issue:** #83
 *
 * General-purpose mocking utilities for browser APIs, files, and
 * common global objects. These mocks help simulate browser environments
 * and external dependencies in tests.
 *
 * @module __tests__/helpers/mocks
 * @example
 * ```typescript
 * // DEPRECATED:
 * import { mockFetch, createMockFile } from '@/test-utils/legacy-helpers/mocks';
 *
 * // NEW:
 * import { mockFetch, createMockFile } from '@/test-utils';
 * ```
 */

/**
 * Response configuration for mockFetch.
 */
export interface MockFetchResponse {
  /**
   * Response data (will be JSON stringified)
   */
  data: any;

  /**
   * HTTP status code
   */
  status?: number;

  /**
   * Whether the response is successful
   */
  ok?: boolean;

  /**
   * Optional delay in milliseconds before resolving
   */
  delay?: number;

  /**
   * Optional headers
   */
  headers?: Record<string, string>;
}

/**
 * Mocks global fetch with predefined responses.
 *
 * Can provide single or multiple responses. For multiple responses,
 * they will be returned in order for consecutive calls.
 *
 * @param responses - Array of mock responses or single response
 *
 * @example
 * ```typescript
 * // Single response
 * mockFetch([{ data: { success: true } }]);
 *
 * // Multiple responses in sequence
 * mockFetch([
 *   { data: { id: '1' }, status: 200 },
 *   { data: { error: 'Failed' }, status: 500, ok: false }
 * ]);
 *
 * // With delay
 * mockFetch([{ data: { success: true }, delay: 1000 }]);
 * ```
 */
export function mockFetch(responses: MockFetchResponse[]): jest.Mock {
  const mockFn = jest.fn();

  responses.forEach((response, index) => {
    const {
      data,
      status = 200,
      ok = status >= 200 && status < 300,
      delay = 0,
      headers = {},
    } = response;

    const mockResponse = Promise.resolve({
      ok,
      status,
      statusText: ok ? 'OK' : 'Error',
      json: async () => data,
      text: async () => JSON.stringify(data),
      headers: new Headers({
        'Content-Type': 'application/json',
        ...headers,
      }),
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

    if (delay > 0) {
      const delayedResponse = new Promise<Response>((resolve) => {
        setTimeout(() => resolve(mockResponse as unknown as Response), delay);
      });
      mockFn.mockResolvedValueOnce(delayedResponse);
    } else {
      mockFn.mockResolvedValueOnce(mockResponse);
    }
  });

  global.fetch = mockFn;
  return mockFn;
}

/**
 * Creates a mock File object for testing file uploads.
 *
 * @param name - File name
 * @param type - MIME type
 * @param size - File size in bytes (default: 1024)
 * @param lastModified - Last modified timestamp
 * @returns Mock File object
 *
 * @example
 * ```typescript
 * const videoFile = createMockFile('video.mp4', 'video/mp4', 1024 * 1024);
 * const imageFile = createMockFile('image.jpg', 'image/jpeg', 512 * 1024);
 * ```
 */
export function createMockFile(
  name: string = 'test.txt',
  type: string = 'text/plain',
  size: number = 1024,
  lastModified: number = Date.now()
): File {
  const content = 'x'.repeat(size);
  const blob = new Blob([content], { type });

  return new File([blob], name, {
    type,
    lastModified,
  });
}

/**
 * Creates multiple mock files.
 *
 * @param files - Array of file configurations
 * @returns Array of mock File objects
 *
 * @example
 * ```typescript
 * const files = createMockFiles([
 *   { name: 'video1.mp4', type: 'video/mp4', size: 1024 * 1024 },
 *   { name: 'video2.mp4', type: 'video/mp4', size: 2048 * 1024 }
 * ]);
 * ```
 */
export function createMockFiles(
  files: Array<{ name: string; type: string; size?: number }>
): File[] {
  return files.map((file) => createMockFile(file.name, file.type, file.size || 1024));
}

/**
 * Mocks localStorage with a simple in-memory implementation.
 *
 * @returns Mock localStorage object
 *
 * @example
 * ```typescript
 * const storage = mockLocalStorage();
 *
 * storage.setItem('key', 'value');
 * expect(storage.getItem('key')).toBe('value');
 * ```
 */
export function mockLocalStorage(): Storage {
  const store: Record<string, string> = {};

  const mockStorage: Storage = {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach((key) => delete store[key]);
    }),
    key: jest.fn((index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    }),
    get length() {
      return Object.keys(store).length;
    },
  };

  Object.defineProperty(window, 'localStorage', {
    value: mockStorage,
    writable: true,
  });

  return mockStorage;
}

/**
 * Mocks sessionStorage with a simple in-memory implementation.
 *
 * @returns Mock sessionStorage object
 *
 * @example
 * ```typescript
 * const storage = mockSessionStorage();
 *
 * storage.setItem('session-key', 'value');
 * expect(storage.getItem('session-key')).toBe('value');
 * ```
 */
export function mockSessionStorage(): Storage {
  const store: Record<string, string> = {};

  const mockStorage: Storage = {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach((key) => delete store[key]);
    }),
    key: jest.fn((index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    }),
    get length() {
      return Object.keys(store).length;
    },
  };

  Object.defineProperty(window, 'sessionStorage', {
    value: mockStorage,
    writable: true,
  });

  return mockStorage;
}

/**
 * Mocks IntersectionObserver for testing components that use it.
 *
 * @param intersecting - Whether elements should be intersecting (default: true)
 * @returns Mock IntersectionObserver class
 *
 * @example
 * ```typescript
 * mockIntersectionObserver();
 * // Now components using IntersectionObserver won't fail
 * ```
 */
export function mockIntersectionObserver(
  intersecting: boolean = true
): typeof IntersectionObserver {
  const MockIntersectionObserver = class {
    root: Element | null = null;
    rootMargin: string = '';
    thresholds: ReadonlyArray<number> = [];

    constructor(
      public callback: IntersectionObserverCallback,
      public options?: IntersectionObserverInit
    ) {
      this.root = options?.root || null;
      this.rootMargin = options?.rootMargin || '';
      this.thresholds = options?.threshold
        ? Array.isArray(options.threshold)
          ? options.threshold
          : [options.threshold]
        : [];
    }

    observe(target: Element): void {
      // Immediately trigger callback with mocked entry
      this.callback(
        [
          {
            target,
            isIntersecting: intersecting,
            intersectionRatio: intersecting ? 1 : 0,
            boundingClientRect: target.getBoundingClientRect(),
            intersectionRect: target.getBoundingClientRect(),
            rootBounds: null,
            time: Date.now(),
          } as IntersectionObserverEntry,
        ],
        this as unknown as IntersectionObserver
      );
    }

    unobserve(): void {}

    disconnect(): void {}

    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  };

  global.IntersectionObserver = MockIntersectionObserver as any;
  return MockIntersectionObserver as any;
}

/**
 * Mocks ResizeObserver for testing components that use it.
 *
 * @returns Mock ResizeObserver class
 *
 * @example
 * ```typescript
 * mockResizeObserver();
 * // Now components using ResizeObserver won't fail
 * ```
 */
export function mockResizeObserver(): typeof ResizeObserver {
  const MockResizeObserver = class {
    constructor(public callback: ResizeObserverCallback) {}

    observe(target: Element): void {
      // Immediately trigger callback with mocked entry
      this.callback(
        [
          {
            target,
            contentRect: target.getBoundingClientRect(),
            borderBoxSize: [],
            contentBoxSize: [],
            devicePixelContentBoxSize: [],
          } as ResizeObserverEntry,
        ],
        this as unknown as ResizeObserver
      );
    }

    unobserve(): void {}

    disconnect(): void {}
  };

  global.ResizeObserver = MockResizeObserver as any;
  return MockResizeObserver as any;
}

/**
 * Mocks window.matchMedia for responsive design tests.
 *
 * @param matches - Whether the media query should match (default: false)
 * @returns Mock matchMedia function
 *
 * @example
 * ```typescript
 * mockMatchMedia(true); // Simulate mobile viewport
 * mockMatchMedia(false); // Simulate desktop viewport
 * ```
 */
export function mockMatchMedia(matches: boolean = false): jest.Mock {
  const mockFn = jest.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: mockFn,
  });

  return mockFn;
}

/**
 * Mocks URL.createObjectURL and URL.revokeObjectURL.
 *
 * @example
 * ```typescript
 * const { createObjectURL, revokeObjectURL } = mockURL();
 *
 * const url = createObjectURL(new Blob(['test']));
 * expect(url).toMatch(/^blob:mock-/);
 *
 * revokeObjectURL(url);
 * expect(revokeObjectURL).toHaveBeenCalledWith(url);
 * ```
 */
export function mockURL(): {
  createObjectURL: jest.Mock;
  revokeObjectURL: jest.Mock;
} {
  const createObjectURL = jest.fn(() => `blob:mock-${Math.random().toString(36).substring(7)}`);
  const revokeObjectURL = jest.fn();

  URL.createObjectURL = createObjectURL;
  URL.revokeObjectURL = revokeObjectURL;

  return { createObjectURL, revokeObjectURL };
}

/**
 * Mocks console methods to suppress logs during tests.
 *
 * @param methods - Which console methods to mock (default: all)
 * @returns Object with mocked console methods
 *
 * @example
 * ```typescript
 * const { log, error } = mockConsole();
 *
 * // Logs are now suppressed
 * console.log('test'); // Silent
 *
 * expect(log).toHaveBeenCalledWith('test');
 * ```
 */
export function mockConsole(
  methods: Array<'log' | 'error' | 'warn' | 'info' | 'debug'> = [
    'log',
    'error',
    'warn',
    'info',
    'debug',
  ]
): Record<string, jest.Mock> {
  const mocks: Record<string, jest.Mock> = {};

  methods.forEach((method) => {
    mocks[method] = jest.fn();
    (console as any)[method] = mocks[method];
  });

  return mocks;
}

/**
 * Restores original console methods.
 *
 * @param original - Original console object to restore
 *
 * @example
 * ```typescript
 * const original = { ...console };
 * mockConsole();
 * // ... tests ...
 * restoreConsole(original);
 * ```
 */
export function restoreConsole(
  original: Record<string, any> = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug,
  }
): void {
  Object.entries(original).forEach(([method, fn]) => {
    (console as any)[method] = fn;
  });
}

/**
 * Mocks setTimeout and setInterval for controlled timing tests.
 *
 * @returns Control functions for fake timers
 *
 * @example
 * ```typescript
 * const timers = mockTimers();
 *
 * const callback = jest.fn();
 * setTimeout(callback, 1000);
 *
 * timers.advanceTimersByTime(1000);
 * expect(callback).toHaveBeenCalled();
 *
 * timers.restore();
 * ```
 */
export function mockTimers(): {
  advanceTimersByTime: (ms: number) => void;
  runAllTimers: () => void;
  runOnlyPendingTimers: () => void;
  clearAllTimers: () => void;
  restore: () => void;
} {
  jest.useFakeTimers();

  return {
    advanceTimersByTime: (ms: number) => jest.advanceTimersByTime(ms),
    runAllTimers: () => jest.runAllTimers(),
    runOnlyPendingTimers: () => jest.runOnlyPendingTimers(),
    clearAllTimers: () => jest.clearAllTimers(),
    restore: () => jest.useRealTimers(),
  };
}

/**
 * Creates a mock Blob object.
 *
 * @param content - Blob content
 * @param type - MIME type
 * @returns Mock Blob
 *
 * @example
 * ```typescript
 * const blob = createMockBlob('test content', 'text/plain');
 * expect(blob.size).toBeGreaterThan(0);
 * ```
 */
export function createMockBlob(content: string, type: string = 'text/plain'): Blob {
  return new Blob([content], { type });
}

/**
 * Creates a mock FileList object.
 *
 * @param files - Array of File objects
 * @returns Mock FileList
 *
 * @example
 * ```typescript
 * const file1 = createMockFile('test1.txt');
 * const file2 = createMockFile('test2.txt');
 * const fileList = createMockFileList([file1, file2]);
 *
 * expect(fileList.length).toBe(2);
 * expect(fileList.item(0)).toBe(file1);
 * ```
 */
export function createMockFileList(files: File[]): FileList {
  const fileList = {
    length: files.length,
    item: (index: number) => files[index] || null,
    [Symbol.iterator]: function* () {
      for (const file of files) {
        yield file;
      }
    },
  };

  // Add indexed properties
  files.forEach((file, index) => {
    (fileList as any)[index] = file;
  });

  return fileList as FileList;
}

/**
 * Waits for the next tick in the event loop.
 *
 * @example
 * ```typescript
 * await nextTick();
 * // Now all synchronous operations have completed
 * ```
 */
export function nextTick(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

/**
 * Flushes all pending promises.
 *
 * @example
 * ```typescript
 * await flushPromises();
 * // Now all promises have resolved/rejected
 * ```
 */
export async function flushPromises(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}
