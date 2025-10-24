/**
 * Fetch with timeout and retry logic
 */

import { HttpStatusCode, shouldRetryOnStatus } from './errors/errorCodes';

/**
 * Timeout constants (in milliseconds)
 */
export const TIMEOUT = {
  DEFAULT: 60000, // 60 seconds
  SHORT: 30000, // 30 seconds
  LONG: 90000, // 90 seconds
  VERY_LONG: 120000, // 2 minutes
} as const;

/**
 * Retry constants
 */
export const RETRY = {
  DEFAULT_MAX_RETRIES: 3,
  DEFAULT_BASE_DELAY: 1000, // 1 second
} as const;

export interface FetchWithTimeoutOptions extends RequestInit {
  timeout?: number;
  maxRetries?: number;
}

/**
 * Fetch with automatic timeout handling
 * @param url - URL to fetch
 * @param options - Fetch options with timeout
 * @returns Response
 */
export async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  const { timeout = TIMEOUT.DEFAULT, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout((): void => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms: ${url}`);
    }
    throw error;
  }
}

/**
 * Fetch with retry logic and exponential backoff
 * @param url - URL to fetch
 * @param options - Fetch options with retry config
 * @returns Response
 */
export async function fetchWithRetry(
  url: string,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  const {
    maxRetries = RETRY.DEFAULT_MAX_RETRIES,
    timeout = TIMEOUT.DEFAULT,
    ...fetchOptions
  } = options;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, {
        ...fetchOptions,
        timeout,
      });

      // Handle rate limiting
      if (response.status === HttpStatusCode.RATE_LIMITED) {
        const retryAfter = response.headers.get('Retry-After');
        const delay = retryAfter
          ? parseInt(retryAfter) * 1000
          : Math.pow(2, attempt) * RETRY.DEFAULT_BASE_DELAY;

        if (attempt < maxRetries - 1) {
          await new Promise((resolve): NodeJS.Timeout => setTimeout(resolve, delay));
          continue;
        }
      }

      // Handle server errors with retry
      if (shouldRetryOnStatus(response.status) && attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * RETRY.DEFAULT_BASE_DELAY;
        await new Promise((resolve): NodeJS.Timeout => setTimeout(resolve, delay));
        continue;
      }

      return response;
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;

      const delay = Math.pow(2, attempt) * RETRY.DEFAULT_BASE_DELAY;
      await new Promise((resolve): NodeJS.Timeout => setTimeout(resolve, delay));
    }
  }

  throw new Error('Max retries exceeded');
}
