/**
 * Fetch API Mocking Utilities
 *
 * Provides utilities for mocking fetch calls in tests without requiring
 * external libraries like MSW. Useful for testing API interactions and
 * external service calls.
 *
 * @example
 * ```ts
 * import { mockFetch, mockFetchSuccess, mockFetchError } from '@/test-utils/mockFetch';
 *
 * describe('API calls', () => {
 *   beforeEach(() => {
 *     mockFetch();
 *   });
 *
 *   afterEach(() => {
 *     resetFetchMocks();
 *   });
 *
 *   test('successful fetch', async () => {
 *     mockFetchSuccess({ data: 'test' });
 *     const response = await fetch('/api/test');
 *     const data = await response.json();
 *     expect(data).toEqual({ data: 'test' });
 *   });
 * });
 * ```
 */

/**
 * Store original fetch implementation
 */
let originalFetch: typeof fetch;

/**
 * Mock fetch response builder
 */
export interface MockFetchResponse {
  ok?: boolean;
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  body?: any;
  json?: any;
  text?: string;
  arrayBuffer?: ArrayBuffer;
  blob?: Blob;
}

/**
 * Create a mock Response object
 */
function createMockResponse(config: MockFetchResponse = {}): Response {
  const {
    ok = true,
    status = 200,
    statusText = 'OK',
    headers = {},
    body = null,
    json,
    text,
    arrayBuffer,
    blob,
  } = config;

  const mockHeaders = new Headers(headers);

  const response = {
    ok,
    status,
    statusText,
    headers: mockHeaders,
    redirected: false,
    type: 'basic' as ResponseType,
    url: '',
    body,
    bodyUsed: false,

    json: async () => {
      if (json !== undefined) return json;
      if (text !== undefined) return JSON.parse(text);
      if (body !== null) return body;
      return null;
    },

    text: async () => {
      if (text !== undefined) return text;
      if (json !== undefined) return JSON.stringify(json);
      if (body !== null) return String(body);
      return '';
    },

    arrayBuffer: async () => {
      if (arrayBuffer !== undefined) return arrayBuffer;
      const textContent = await response.text();
      const encoder = new TextEncoder();
      return encoder.encode(textContent).buffer;
    },

    blob: async () => {
      if (blob !== undefined) return blob;
      const textContent = await response.text();
      return new Blob([textContent], { type: 'text/plain' });
    },

    bytes: async () => {
      const buffer = await response.arrayBuffer();
      return new Uint8Array(buffer);
    },

    formData: async () => {
      throw new Error('FormData not implemented in mock fetch');
    },

    clone: () => createMockResponse(config),
  };

  return response as Response;
}

/**
 * Mock fetch globally
 * Returns a jest mock function that can be configured
 */
export function mockFetch(): jest.Mock {
  if (!originalFetch) {
    originalFetch = global.fetch;
  }

  const mockFn = jest.fn();
  global.fetch = mockFn as any;

  return mockFn;
}

/**
 * Mock a successful fetch response
 */
export function mockFetchSuccess(data: any, options: Partial<MockFetchResponse> = {}): jest.Mock {
  const mockFn = mockFetch();

  mockFn.mockResolvedValue(
    createMockResponse({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: data,
      ...options,
    })
  );

  return mockFn;
}

/**
 * Mock a failed fetch response
 */
export function mockFetchError(
  error: string | Error,
  status = 500,
  options: Partial<MockFetchResponse> = {}
): jest.Mock {
  const mockFn = mockFetch();

  const errorMessage = typeof error === 'string' ? error : error.message;

  mockFn.mockResolvedValue(
    createMockResponse({
      ok: false,
      status,
      statusText: 'Error',
      json: { error: errorMessage },
      ...options,
    })
  );

  return mockFn;
}

/**
 * Mock fetch to reject (network error)
 */
export function mockFetchReject(error: Error | string): jest.Mock {
  const mockFn = mockFetch();

  const errorObj = typeof error === 'string' ? new Error(error) : error;
  mockFn.mockRejectedValue(errorObj);

  return mockFn;
}

/**
 * Mock fetch with custom implementation
 */
export function mockFetchWith(implementation: typeof fetch): jest.Mock {
  const mockFn = mockFetch();
  mockFn.mockImplementation(implementation as any);
  return mockFn;
}

/**
 * Mock multiple fetch responses in sequence
 * Useful for testing retries or multiple API calls
 */
export function mockFetchSequence(responses: MockFetchResponse[]): jest.Mock {
  const mockFn = mockFetch();

  responses.forEach((response) => {
    mockFn.mockResolvedValueOnce(createMockResponse(response));
  });

  return mockFn;
}

/**
 * Mock fetch conditionally based on URL
 */
export function mockFetchByUrl(
  urlPatterns: Record<
    string,
    MockFetchResponse | ((url: string, init?: RequestInit) => MockFetchResponse)
  >
): jest.Mock {
  const mockFn = mockFetch();

  mockFn.mockImplementation(async (url: string | Request, init?: RequestInit) => {
    const urlString = typeof url === 'string' ? url : url.url;

    for (const [pattern, response] of Object.entries(urlPatterns)) {
      const regex = new RegExp(pattern);
      if (regex.test(urlString)) {
        const responseConfig =
          typeof response === 'function' ? response(urlString, init) : response;
        return createMockResponse(responseConfig);
      }
    }

    // Default 404 if no pattern matches
    return createMockResponse({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: { error: 'Not Found' },
    });
  });

  return mockFn;
}

/**
 * Reset fetch mocks and restore original implementation
 */
export function resetFetchMocks(): void {
  if (originalFetch) {
    global.fetch = originalFetch;
  }
  jest.restoreAllMocks();
}

/**
 * Create a mock fetch call spy
 * Allows testing what URLs were called and with what options
 */
export function createFetchSpy(): {
  spy: jest.Mock;
  getCalls: () => Array<{ url: string; init?: RequestInit }>;
  getCallCount: () => number;
  wasCalledWith: (url: string | RegExp, init?: Partial<RequestInit>) => boolean;
} {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const spy = mockFetch();

  spy.mockImplementation(async (url: string | Request, init?: RequestInit) => {
    const urlString = typeof url === 'string' ? url : url.url;
    calls.push({ url: urlString, init });

    return createMockResponse({
      ok: true,
      status: 200,
      json: {},
    });
  });

  return {
    spy,
    getCalls: () => [...calls],
    getCallCount: () => calls.length,
    wasCalledWith: (url: string | RegExp, init?: Partial<RequestInit>) => {
      const urlPattern = typeof url === 'string' ? new RegExp(url) : url;

      return calls.some((call) => {
        const urlMatches = urlPattern.test(call.url);
        if (!init) return urlMatches;

        const initMatches = Object.entries(init).every(([key, value]) => {
          return call.init?.[key as keyof RequestInit] === value;
        });

        return urlMatches && initMatches;
      });
    },
  };
}

/**
 * Wait for all pending fetch calls to complete
 */
export async function waitForFetchCalls(maxWait = 1000, interval = 50): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    // Allow microtasks to complete
    await new Promise((resolve) => setImmediate(resolve));

    // Check if there are any pending promises
    // This is a best-effort check
    await new Promise((resolve) => setTimeout(resolve, interval));

    // If we get here, assume fetch calls have settled
    return;
  }
}
