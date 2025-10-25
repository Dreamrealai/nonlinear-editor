/**
 * Mock for requestDeduplication module
 * Used in tests to prevent actual network requests
 */

export const deduplicatedFetch = jest.fn(
  async (url: string, options?: RequestInit): Promise<Response> => {
    // Default mock implementation returns a successful response
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
);

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
