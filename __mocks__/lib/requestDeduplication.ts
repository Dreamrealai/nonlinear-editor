/**
 * Mock for requestDeduplication module
 * Used in tests to prevent actual network requests
 *
 * IMPORTANT: This mock uses mockImplementation by default to ensure
 * each call gets a fresh Response object with an unconsumed body.
 * This prevents "Body already read" errors in tests.
 */

// Create a default implementation that returns a fresh Response each time
const defaultImplementation = async (url: string, options?: RequestInit): Promise<Response> => {
  // Default mock implementation returns a successful response
  // IMPORTANT: Create a NEW Response object for each call to avoid "Body already read" errors
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const deduplicatedFetch = jest.fn(defaultImplementation);

export const deduplicatedFetchJSON = jest.fn(
  async <T = unknown>(url: string, options?: RequestInit): Promise<T> => {
    const response = await deduplicatedFetch(url, options);
    return response.json() as Promise<T>;
  }
);

export const cancelRequestsMatching = jest.fn((pattern: RegExp): number => {
  return 0;
});

export const cancelAllRequests = jest.fn((): number => {
  return 0;
});

export const getRequestStats = jest.fn(
  (): {
    inFlightCount: number;
    totalDuplicatesAvoided: number;
  } => ({
    inFlightCount: 0,
    totalDuplicatesAvoided: 0,
  })
);

export const clearRequestTracking = jest.fn((): void => {
  // No-op
});
