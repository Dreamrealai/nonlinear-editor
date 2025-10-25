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
  enableCircuitBreaker: false,
  circuitBreakerThreshold: 5,
  circuitBreakerTimeout: 60000,
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
 * Circuit breaker state management
 */
interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  isOpen: boolean;
}

const circuitBreakers = new Map<string, CircuitBreakerState>();

/**
 * Get or create circuit breaker state for a given key
 */
function getCircuitBreakerState(key: string): CircuitBreakerState {
  if (!circuitBreakers.has(key)) {
    circuitBreakers.set(key, {
      failures: 0,
      lastFailureTime: 0,
      isOpen: false,
    });
  }
  return circuitBreakers.get(key)!;
}

/**
 * Check if circuit breaker should allow request
 */
function shouldAllowRequest(key: string, options: Required<RetryOptions>): boolean {
  if (!options.enableCircuitBreaker) {
    return true;
  }

  const state = getCircuitBreakerState(key);

  if (!state.isOpen) {
    return true;
  }

  // Check if timeout has passed
  const now = Date.now();
  if (now - state.lastFailureTime >= options.circuitBreakerTimeout) {
    // Reset circuit breaker
    state.isOpen = false;
    state.failures = 0;
    if (options.enableLogging) {
      browserLogger.info(
        {
          event: 'circuit_breaker.closed',
          key,
        },
        'Circuit breaker closed after timeout'
      );
    }
    return true;
  }

  return false;
}

/**
 * Record failure in circuit breaker
 */
function recordFailure(key: string, options: Required<RetryOptions>): void {
  if (!options.enableCircuitBreaker) {
    return;
  }

  const state = getCircuitBreakerState(key);
  state.failures++;
  state.lastFailureTime = Date.now();

  if (state.failures >= options.circuitBreakerThreshold) {
    state.isOpen = true;
    if (options.enableLogging) {
      browserLogger.warn(
        {
          event: 'circuit_breaker.opened',
          key,
          failures: state.failures,
          threshold: options.circuitBreakerThreshold,
        },
        'Circuit breaker opened due to consecutive failures'
      );
    }
  }
}

/**
 * Record success in circuit breaker
 */
function recordSuccess(key: string): void {
  const state = circuitBreakers.get(key);
  if (state) {
    state.failures = 0;
    state.isOpen = false;
  }
}

/**
 * Extract Retry-After header from error response
 */
function getRetryAfterDelay(error: unknown): number | null {
  if (!error || typeof error !== 'object') {
    return null;
  }

  // Check if error has a response object with headers
  const errorWithResponse = error as { response?: { headers?: Headers | Map<string, string> } };
  const headers = errorWithResponse.response?.headers;

  if (!headers) {
    return null;
  }

  let retryAfter: string | null = null;

  if (headers instanceof Headers) {
    retryAfter = headers.get('retry-after');
  } else if (headers instanceof Map) {
    retryAfter = headers.get('retry-after');
  } else if (typeof headers === 'object') {
    // Handle plain object headers
    retryAfter = (headers as Record<string, string>)['retry-after'] || null;
  }

  if (!retryAfter) {
    return null;
  }

  // Try to parse as seconds (number)
  const seconds = parseInt(retryAfter, 10);
  if (!isNaN(seconds)) {
    return seconds * 1000;
  }

  // Try to parse as HTTP date
  try {
    const date = new Date(retryAfter);
    const delay = date.getTime() - Date.now();
    return delay > 0 ? delay : null;
  } catch {
    return null;
  }
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
  options: RetryOptions = {},
  circuitBreakerKey?: string
): Promise<T> {
  const opts: Required<RetryOptions> = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: unknown;

  // Check circuit breaker before starting
  const cbKey = circuitBreakerKey || 'default';
  if (!shouldAllowRequest(cbKey, opts)) {
    const error = new Error('Circuit breaker is open - too many consecutive failures');
    if (opts.enableLogging) {
      browserLogger.error(
        {
          event: 'retry.circuit_breaker_open',
          key: cbKey,
        },
        'Circuit breaker is open, request blocked'
      );
    }
    throw error;
  }

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

      const result = await fn();

      // Success - record it for circuit breaker
      recordSuccess(cbKey);

      return result;
    } catch (error) {
      lastError = error;

      // Record failure for circuit breaker
      recordFailure(cbKey, opts);

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

      // Check for Retry-After header (especially for 429 errors)
      const retryAfterDelay = getRetryAfterDelay(error);
      let delay: number;

      if (retryAfterDelay !== null) {
        // Use Retry-After header value, but cap it at maxDelay
        delay = Math.min(retryAfterDelay, opts.maxDelay);

        if (opts.enableLogging) {
          browserLogger.info(
            {
              event: 'retry.using_retry_after',
              retryAfterDelay,
              cappedDelay: delay,
            },
            'Using Retry-After header for delay'
          );
        }
      } else {
        // Calculate exponential backoff delay
        delay = calculateDelay(attempt, opts);
      }

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
