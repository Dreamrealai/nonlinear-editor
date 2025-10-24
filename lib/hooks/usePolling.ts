/**
 * usePolling Hook
 *
 * Generic polling hook for asynchronous operations.
 * Eliminates duplicate polling logic across components.
 *
 * @module lib/hooks/usePolling
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { browserLogger } from '@/lib/browserLogger';

/**
 * Polling configuration options
 */
export interface PollingOptions<T> {
  /** Polling interval in milliseconds (default: 10000ms / 10s) */
  interval?: number;
  /** Maximum number of retries before giving up (default: 100) */
  maxRetries?: number;
  /** Function to call on each poll */
  pollFn: () => Promise<T>;
  /** Function to check if polling should continue (return false to stop) */
  shouldContinue: (result: T) => boolean;
  /** Function to extract result when polling is complete */
  onComplete: (result: T) => void;
  /** Function to handle errors */
  onError?: (error: Error) => void;
  /** Whether to log polling activity (default: true) */
  enableLogging?: boolean;
  /** Context for logging */
  logContext?: Record<string, unknown>;
}

/**
 * Polling state
 */
export interface PollingState {
  /** Whether polling is currently active */
  isPolling: boolean;
  /** Current retry count */
  retryCount: number;
  /** Last error that occurred */
  lastError: Error | null;
}

/**
 * Return type for usePolling hook
 */
export interface UsePollingReturn {
  /** Current polling state */
  state: PollingState;
  /** Start polling */
  startPolling: () => void;
  /** Stop polling */
  stopPolling: () => void;
  /** Reset polling state */
  reset: () => void;
}

/**
 * Generic polling hook for asynchronous operations
 *
 * @param options - Polling configuration
 * @returns Polling control functions and state
 *
 * @example
 * const { state, startPolling, stopPolling } = usePolling({
 *   pollFn: async () => {
 *     const res = await fetch(`/api/status?id=${operationId}`);
 *     return res.json();
 *   },
 *   shouldContinue: (result) => !result.done,
 *   onComplete: (result) => {
 *     if (result.error) {
 *       toast.error(result.error);
 *     } else {
 *       toast.success('Operation complete!');
 *       handleResult(result.data);
 *     }
 *   },
 *   interval: 10000,
 *   maxRetries: 100,
 * });
 *
 * // Start polling when operation begins
 * const startOperation = async () => {
 *   const res = await fetch('/api/start-operation', { method: 'POST' });
 *   const data = await res.json();
 *   setOperationId(data.operationId);
 *   startPolling();
 * };
 */
export function usePolling<T>(options: PollingOptions<T>): UsePollingReturn {
  const {
    interval = 10000,
    maxRetries = 100,
    pollFn,
    shouldContinue,
    onComplete,
    onError,
    enableLogging = true,
    logContext = {},
  } = options;

  const [isPolling, setIsPolling] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<Error | null>(null);

  // Track polling state with refs to ensure proper cleanup
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef<number>(0);

  // Cleanup function to stop polling and cancel requests
  const cleanup = useCallback((): void => {
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Reset state
  const reset = useCallback((): void => {
    cleanup();
    setIsPolling(false);
    setRetryCount(0);
    setLastError(null);
    retryCountRef.current = 0;
  }, [cleanup]);

  // Main polling function
  const poll = useCallback(async (): Promise<void> => {
    // Check if we've exceeded max retries
    if (retryCountRef.current >= maxRetries) {
      cleanup();
      const error = new Error(`Polling timed out after ${maxRetries} attempts`);
      setLastError(error);
      setIsPolling(false);

      if (enableLogging) {
        browserLogger.warn(
          {
            event: 'polling.timeout',
            retries: maxRetries,
            ...logContext,
          },
          `Polling timed out after ${maxRetries} attempts`
        );
      }

      if (onError) {
        onError(error);
      }
      return;
    }

    retryCountRef.current++;
    setRetryCount(retryCountRef.current);

    try {
      // Create new AbortController for this request
      abortControllerRef.current = new AbortController();

      if (enableLogging && retryCountRef.current % 10 === 0) {
        // Log every 10th poll to avoid spam
        browserLogger.debug(
          {
            event: 'polling.progress',
            attempt: retryCountRef.current,
            maxRetries,
            ...logContext,
          },
          `Polling attempt ${retryCountRef.current}/${maxRetries}`
        );
      }

      // Execute poll function
      const result = await pollFn();

      // Check if we should continue polling
      if (shouldContinue(result)) {
        // Continue polling
        pollingTimeoutRef.current = setTimeout(poll, interval);
      } else {
        // Polling complete
        cleanup();
        setIsPolling(false);

        if (enableLogging) {
          browserLogger.info(
            {
              event: 'polling.complete',
              attempts: retryCountRef.current,
              ...logContext,
            },
            `Polling completed after ${retryCountRef.current} attempts`
          );
        }

        onComplete(result);
      }
    } catch (error) {
      // Ignore abort errors (they're intentional)
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }

      cleanup();
      setIsPolling(false);

      const pollError = error instanceof Error ? error : new Error('Polling failed');
      setLastError(pollError);

      if (enableLogging) {
        browserLogger.error(
          {
            event: 'polling.error',
            error: pollError,
            attempts: retryCountRef.current,
            ...logContext,
          },
          'Polling failed with error'
        );
      }

      if (onError) {
        onError(pollError);
      }
    }
  }, [
    maxRetries,
    interval,
    pollFn,
    shouldContinue,
    onComplete,
    onError,
    enableLogging,
    logContext,
    cleanup,
  ]);

  // Start polling
  const startPolling = useCallback((): void => {
    // Clean up any existing polling
    cleanup();

    // Reset state
    retryCountRef.current = 0;
    setRetryCount(0);
    setLastError(null);
    setIsPolling(true);

    if (enableLogging) {
      browserLogger.info(
        {
          event: 'polling.started',
          interval,
          maxRetries,
          ...logContext,
        },
        'Polling started'
      );
    }

    // Start polling with initial delay
    pollingTimeoutRef.current = setTimeout(poll, interval);
  }, [poll, cleanup, interval, maxRetries, enableLogging, logContext]);

  // Stop polling
  const stopPolling = useCallback((): void => {
    cleanup();
    setIsPolling(false);

    if (enableLogging) {
      browserLogger.info(
        {
          event: 'polling.stopped',
          attempts: retryCountRef.current,
          ...logContext,
        },
        'Polling stopped manually'
      );
    }
  }, [cleanup, enableLogging, logContext]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    state: {
      isPolling,
      retryCount,
      lastError,
    },
    startPolling,
    stopPolling,
    reset,
  };
}

/**
 * Simplified polling hook with sensible defaults
 * For quick implementation of common polling patterns
 *
 * @param pollFn - Function to call on each poll
 * @param isDone - Function to check if operation is complete
 * @param onComplete - Callback when operation completes
 * @returns Polling control functions and state
 *
 * @example
 * const { state, startPolling } = useSimplePolling(
 *   async () => fetchStatus(operationId),
 *   (result) => result.status === 'complete',
 *   (result) => handleComplete(result.data)
 * );
 */
export function useSimplePolling<T>(
  pollFn: () => Promise<T>,
  isDone: (result: T) => boolean,
  onComplete: (result: T) => void,
  onError?: (error: Error) => void
): UsePollingReturn {
  return usePolling({
    pollFn,
    shouldContinue: (result) => !isDone(result),
    onComplete,
    onError,
    interval: 10000,
    maxRetries: 100,
  });
}
