/**
 * Retry Utilities
 *
 * Provides retry logic with exponential backoff for handling transient failures.
 * Useful for network requests, API calls, and other operations that may fail temporarily.
 *
 * @module lib/utils/retryUtils
 */

import { browserLogger } from '../browserLogger';

/**
 * Options for retry behavior
 */
export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Base delay in milliseconds (default: 1000) */
  baseDelay?: number;
  /** Maximum delay in milliseconds (default: 30000 = 30 seconds) */
  maxDelay?: number;
  /** Multiplier for exponential backoff (default: 2) */
  backoffMultiplier?: number;
  /** Whether to add random jitter to delays (default: true) */
  useJitter?: boolean;
  /** Function to determine if error is retryable (default: retry all) */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  /** Callback when retry occurs */
  onRetry?: (error: unknown, attempt: number, delay: number) => void;
  /** Enable debug logging */
  enableLogging?: boolean;
  /** Enable circuit breaker pattern (default: false) */
  enableCircuitBreaker?: boolean;
  /** Number of consecutive failures to open circuit (default: 5) */
  circuitBreakerThreshold?: number;
  /** Time in ms to wait before retrying after circuit opens (default: 60000 = 1 minute) */
  circuitBreakerTimeout?: number;
}

/**
 * Default retry options
 */
const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  useJitter: true,
  shouldRetry: () => true,
  onRetry: () => {},
  enableLogging: false,
};

/**
 * Calculate delay for exponential backoff
 *
 * @param attempt - Current attempt number (0-based)
 * @param options - Retry options
 * @returns Delay in milliseconds
 */
function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
  const exponentialDelay = options.baseDelay * Math.pow(options.backoffMultiplier, attempt);
  const cappedDelay = Math.min(exponentialDelay, options.maxDelay);

  if (options.useJitter) {
    // Add random jitter between 0% and 25% of the delay
    const jitter = Math.random() * cappedDelay * 0.25;
    return cappedDelay + jitter;
  }

  return cappedDelay;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 *
 * @param fn - Async function to retry
 * @param options - Retry configuration options
 * @returns Promise resolving to function result
 * @throws Last error if all retries fail
 *
 * @example
 * ```typescript
 * // Retry API call with default options
 * const data = await retryWithBackoff(async () => {
 *   const response = await fetch('/api/data');
 *   if (!response.ok) throw new Error('Request failed');
 *   return response.json();
 * });
 *
 * // Retry with custom options
 * const result = await retryWithBackoff(
 *   async () => await riskyOperation(),
 *   {
 *     maxRetries: 5,
 *     baseDelay: 2000,
 *     shouldRetry: (error) => error.message !== 'Fatal error',
 *     onRetry: (error, attempt, delay) => {
 *       console.log(`Retry ${attempt} after ${delay}ms: ${error.message}`);
 *     }
 *   }
 * );
 * ```
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts: Required<RetryOptions> = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      if (opts.enableLogging && attempt > 0) {
        browserLogger.debug(
          {
            event: 'retry.attempt',
            attempt,
            maxRetries: opts.maxRetries,
          },
          `Retry attempt ${attempt}/${opts.maxRetries}`
        );
      }

      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry this error
      if (!opts.shouldRetry(error, attempt)) {
        if (opts.enableLogging) {
          browserLogger.warn(
            {
              event: 'retry.not_retryable',
              error,
              attempt,
            },
            'Error is not retryable'
          );
        }
        throw error;
      }

      // If this was the last attempt, throw the error
      if (attempt >= opts.maxRetries) {
        if (opts.enableLogging) {
          browserLogger.error(
            {
              event: 'retry.exhausted',
              error,
              attempts: attempt + 1,
              maxRetries: opts.maxRetries,
            },
            'All retry attempts exhausted'
          );
        }
        break;
      }

      // Calculate delay and wait before next attempt
      const delay = calculateDelay(attempt, opts);

      if (opts.enableLogging) {
        browserLogger.warn(
          {
            event: 'retry.scheduled',
            error,
            attempt: attempt + 1,
            delay,
            nextAttempt: attempt + 2,
          },
          `Retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${opts.maxRetries})`
        );
      }

      // Call onRetry callback
      opts.onRetry(error, attempt + 1, delay);

      await sleep(delay);
    }
  }

  // All retries exhausted, throw last error
  throw lastError;
}

/**
 * Standard retry options for network requests
 */
export const NETWORK_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  shouldRetry: (error: unknown) => {
    // Retry on network errors or 5xx status codes
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return true; // Network error
    }
    if (error && typeof error === 'object' && 'status' in error) {
      const status = (error as { status: number }).status;
      return status >= 500 && status < 600; // Server errors
    }
    return true; // Default to retry
  },
  enableLogging: process.env.NODE_ENV === 'development',
};

/**
 * Standard retry options for asset operations
 */
export const ASSET_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 15000,
  shouldRetry: (error: unknown, attempt: number) => {
    // Don't retry on 404 (asset not found) or 403 (forbidden)
    if (error && typeof error === 'object' && 'status' in error) {
      const status = (error as { status: number }).status;
      if (status === 404 || status === 403) {
        return false; // Don't retry auth/not found errors
      }
      // Retry on 5xx and 429 (rate limit)
      return status >= 500 || status === 429;
    }
    // For other errors, limit retries
    return attempt < 2;
  },
  enableLogging: process.env.NODE_ENV === 'development',
};

/**
 * Wrap a fetch call with retry logic
 *
 * @param url - URL to fetch
 * @param init - Fetch options
 * @param options - Retry options
 * @returns Promise resolving to Response
 *
 * @example
 * ```typescript
 * const response = await retryableFetch('/api/data', {
 *   method: 'POST',
 *   body: JSON.stringify({ key: 'value' })
 * });
 * ```
 */
export async function retryableFetch(
  url: string,
  init?: RequestInit,
  options?: RetryOptions
): Promise<Response> {
  return retryWithBackoff(async () => {
    const response = await fetch(url, init);

    // Attach status to error for retry logic
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`) as Error & {
        status: number;
        response: Response;
      };
      error.status = response.status;
      error.response = response;
      throw error;
    }

    return response;
  }, options);
}
