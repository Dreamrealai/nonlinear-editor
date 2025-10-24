/**
 * Request Deduplication Utility
 *
 * Prevents duplicate concurrent API calls by caching in-flight requests.
 * Uses AbortController to cancel duplicate requests when the original completes.
 *
 * @module lib/requestDeduplication
 */

import { browserLogger } from './browserLogger';

/**
 * Configuration for request deduplication
 */
export interface DeduplicationOptions {
  /** Unique key for this request (defaults to URL + method + body hash) */
  key?: string;
  /** Whether to enable logging for debugging */
  enableLogging?: boolean;
  /** Context for logging */
  logContext?: Record<string, unknown>;
}

/**
 * In-flight request tracker
 */
interface InFlightRequest<T> {
  promise: Promise<T>;
  abortController: AbortController;
  timestamp: number;
}

/**
 * Request deduplication manager
 * Singleton pattern to track all in-flight requests
 */
class RequestDeduplicationManager {
  private inFlightRequests = new Map<string, InFlightRequest<unknown>>();
  private requestCounts = new Map<string, number>();

  /**
   * Generate a cache key from request parameters
   */
  private generateKey(url: string, options?: RequestInit): string {
    const method = options?.method ?? 'GET';
    const body = options?.body ? String(options.body) : '';
    // Simple hash for body to avoid long keys
    const bodyHash = body ? this.simpleHash(body) : '';
    return `${method}:${url}${bodyHash ? ':' + bodyHash : ''}`;
  }

  /**
   * Simple string hash function
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  /**
   * Deduplicate a fetch request
   *
   * If an identical request is already in-flight, returns the existing promise.
   * Otherwise, initiates a new request and tracks it.
   *
   * @param url - URL to fetch
   * @param options - Fetch options (including signal)
   * @param deduplicationOptions - Deduplication configuration
   * @returns Promise resolving to the Response
   */
  async deduplicate<T = Response>(
    url: string,
    options?: RequestInit,
    deduplicationOptions?: DeduplicationOptions
  ): Promise<T> {
    const {
      key = this.generateKey(url, options),
      enableLogging = false,
      logContext = {},
    } = deduplicationOptions ?? {};

    // Check if an identical request is already in-flight
    const existing = this.inFlightRequests.get(key) as InFlightRequest<T> | undefined;

    if (existing) {
      // Increment duplicate request count
      const count = (this.requestCounts.get(key) ?? 0) + 1;
      this.requestCounts.set(key, count);

      if (enableLogging) {
        browserLogger.debug({
          event: 'request.deduplicated',
          key,
          duplicateCount: count,
          age: Date.now() - existing.timestamp,
          ...logContext,
        }, 'Request deduplicated - reusing in-flight request');
      }

      // Return the existing promise
      return existing.promise;
    }

    // Create new AbortController for this request
    const abortController = new AbortController();

    // Merge abort signals if one was provided
    if (options?.signal) {
      const originalSignal = options.signal;
      originalSignal.addEventListener('abort', (): void => {
        abortController.abort();
      });
    }

    // Create the request promise
    const promise = (async (): Promise<T> => {
      try {
        if (enableLogging) {
          browserLogger.debug({
            event: 'request.started',
            key,
            url,
            method: options?.method ?? 'GET',
            ...logContext,
          }, 'Starting new request');
        }

        const response = await fetch(url, {
          ...options,
          signal: abortController.signal,
        });

        if (enableLogging) {
          const duplicateCount = this.requestCounts.get(key) ?? 0;
          browserLogger.debug({
            event: 'request.completed',
            key,
            status: response.status,
            duplicatesAvoided: duplicateCount,
            ...logContext,
          }, `Request completed (avoided ${duplicateCount} duplicate calls)`);
        }

        return response as T;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          if (enableLogging) {
            browserLogger.debug({
              event: 'request.aborted',
              key,
              ...logContext,
            }, 'Request aborted');
          }
        }
        throw error;
      } finally {
        // Clean up tracking
        this.inFlightRequests.delete(key);
        this.requestCounts.delete(key);
      }
    })();

    // Track the in-flight request
    this.inFlightRequests.set(key, {
      promise,
      abortController,
      timestamp: Date.now(),
    });

    return promise;
  }

  /**
   * Cancel all in-flight requests matching a pattern
   *
   * @param pattern - Regular expression to match request keys
   */
  cancelMatching(pattern: RegExp): number {
    let cancelled = 0;
    this.inFlightRequests.forEach((request, key): void => {
      if (pattern.test(key)) {
        request.abortController.abort();
        this.inFlightRequests.delete(key);
        this.requestCounts.delete(key);
        cancelled++;
      }
    });
    return cancelled;
  }

  /**
   * Cancel all in-flight requests
   */
  cancelAll(): number {
    const count = this.inFlightRequests.size;
    this.inFlightRequests.forEach((request): void => {
      request.abortController.abort();
    });
    this.inFlightRequests.clear();
    this.requestCounts.clear();
    return count;
  }

  /**
   * Get statistics about request deduplication
   */
  getStats(): {
    inFlightCount: number;
    totalDuplicatesAvoided: number;
  } {
    let totalDuplicates = 0;
    this.requestCounts.forEach((count): void => {
      totalDuplicates += count;
    });

    return {
      inFlightCount: this.inFlightRequests.size,
      totalDuplicatesAvoided: totalDuplicates,
    };
  }

  /**
   * Clear all tracking (useful for testing)
   */
  clear(): void {
    this.inFlightRequests.clear();
    this.requestCounts.clear();
  }
}

// Singleton instance
const manager = new RequestDeduplicationManager();

/**
 * Deduplicate a fetch request
 *
 * If an identical request is already in-flight, returns the existing promise.
 * This prevents duplicate API calls and reduces server load.
 *
 * @example
 * ```typescript
 * // Multiple components calling the same API
 * const response1 = await deduplicatedFetch('/api/assets');
 * const response2 = await deduplicatedFetch('/api/assets'); // Reuses response1
 * ```
 *
 * @param url - URL to fetch
 * @param options - Fetch options
 * @param deduplicationOptions - Deduplication configuration
 * @returns Promise resolving to the Response
 */
export async function deduplicatedFetch(
  url: string,
  options?: RequestInit,
  deduplicationOptions?: DeduplicationOptions
): Promise<Response> {
  return manager.deduplicate<Response>(url, options, deduplicationOptions);
}

/**
 * Deduplicate a fetch request and parse JSON response
 *
 * @param url - URL to fetch
 * @param options - Fetch options
 * @param deduplicationOptions - Deduplication configuration
 * @returns Promise resolving to the parsed JSON
 */
export async function deduplicatedFetchJSON<T = unknown>(
  url: string,
  options?: RequestInit,
  deduplicationOptions?: DeduplicationOptions
): Promise<T> {
  const response = await deduplicatedFetch(url, options, deduplicationOptions);
  return response.json() as Promise<T>;
}

/**
 * Cancel all in-flight requests matching a pattern
 *
 * @param pattern - Regular expression to match request URLs
 * @returns Number of requests cancelled
 */
export function cancelRequestsMatching(pattern: RegExp): number {
  return manager.cancelMatching(pattern);
}

/**
 * Cancel all in-flight requests
 *
 * @returns Number of requests cancelled
 */
export function cancelAllRequests(): number {
  return manager.cancelAll();
}

/**
 * Get request deduplication statistics
 */
export function getRequestStats(): {
  inFlightCount: number;
  totalDuplicatesAvoided: number;
} {
  return manager.getStats();
}

/**
 * Clear all request tracking (for testing)
 */
export function clearRequestTracking(): void {
  manager.clear();
}
