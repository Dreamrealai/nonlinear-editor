/**
 * Test Reliability Utilities
 *
 * Provides utilities to improve test reliability, prevent flakiness,
 * and track resource cleanup.
 *
 * Usage:
 * - Use ResourceTracker to track timers, listeners, and cleanup
 * - Use withFakeTimers() for consistent timer testing
 * - Use waitForAsync() for reliable async assertions
 * - Use resetAllStores() to prevent state pollution
 */

/// <reference types="jest" />

import { waitFor } from '@testing-library/react';

// Define waitFor options type
interface WaitForOptions {
  timeout?: number;
  interval?: number;
  onTimeout?: (error: Error) => Error;
  container?: HTMLElement;
  mutationObserverOptions?: MutationObserverInit;
}

/**
 * Resource Tracker - Track and validate cleanup of timers, listeners, etc.
 *
 * Example:
 * ```ts
 * let tracker: ResourceTracker;
 *
 * beforeEach(() => {
 *   tracker = new ResourceTracker();
 * });
 *
 * afterEach(async () => {
 *   await tracker.cleanup();
 *   tracker.validate(); // Warns if resources weren't cleaned up
 * });
 *
 * test('example', () => {
 *   const timerId = setTimeout(() => {}, 1000);
 *   tracker.trackTimer(timerId, 'polling timer');
 *
 *   const listener = () => {};
 *   window.addEventListener('resize', listener);
 *   tracker.trackListener('resize', listener, 'resize handler');
 * });
 * ```
 */
export class ResourceTracker {
  private timers = new Map<NodeJS.Timeout | number, string>();
  private listeners = new Map<
    string,
    { target: EventTarget; type: string; listener: EventListener; description: string }
  >();
  private customCleanups = new Map<string, () => void | Promise<void>>();

  /**
   * Track a timer for cleanup validation
   */
  trackTimer(timerId: NodeJS.Timeout | number, description: string = 'timer'): void {
    this.timers.set(timerId, description);
  }

  /**
   * Untrack a timer (call this when you clear it manually)
   */
  untrackTimer(timerId: NodeJS.Timeout | number): void {
    this.timers.delete(timerId);
  }

  /**
   * Track an event listener for cleanup validation
   */
  trackListener(
    target: EventTarget,
    type: string,
    listener: EventListener,
    description: string = 'listener'
  ): void {
    const key = `${type}-${description}`;
    this.listeners.set(key, { target, type, listener, description });
  }

  /**
   * Untrack a listener (call this when you remove it manually)
   */
  untrackListener(type: string, description: string = 'listener'): void {
    const key = `${type}-${description}`;
    this.listeners.delete(key);
  }

  /**
   * Track a custom cleanup function
   */
  trackCleanup(key: string, cleanup: () => void | Promise<void>): void {
    this.customCleanups.set(key, cleanup);
  }

  /**
   * Cleanup all tracked resources
   */
  async cleanup(): Promise<void> {
    // Clear timers
    const timerEntries = Array.from(this.timers.entries());
    for (const [timerId] of timerEntries) {
      clearTimeout(timerId as NodeJS.Timeout);
    }
    this.timers.clear();

    // Remove listeners
    const listenerEntries = Array.from(this.listeners.entries());
    for (const [, { target, type, listener }] of listenerEntries) {
      target.removeEventListener(type, listener);
    }
    this.listeners.clear();

    // Run custom cleanups
    const cleanupPromises: Promise<void>[] = [];
    const cleanupEntries = Array.from(this.customCleanups.entries());
    for (const [, cleanup] of cleanupEntries) {
      const result = cleanup();
      if (result instanceof Promise) {
        cleanupPromises.push(result);
      }
    }
    await Promise.all(cleanupPromises);
    this.customCleanups.clear();
  }

  /**
   * Validate that all resources were cleaned up
   * Logs warnings if resources are still active
   */
  validate(): void {
    if (this.timers.size > 0) {
      console.warn(
        `[ResourceTracker] ${this.timers.size} timer(s) not cleaned up:`,
        Array.from(this.timers.values())
      );
    }

    if (this.listeners.size > 0) {
      console.warn(
        `[ResourceTracker] ${this.listeners.size} listener(s) not cleaned up:`,
        Array.from(this.listeners.values()).map((l) => l.description)
      );
    }

    if (this.customCleanups.size > 0) {
      console.warn(
        `[ResourceTracker] ${this.customCleanups.size} custom cleanup(s) not run:`,
        Array.from(this.customCleanups.keys())
      );
    }
  }

  /**
   * Get count of active resources
   */
  getActiveCount(): { timers: number; listeners: number; cleanups: number } {
    return {
      timers: this.timers.size,
      listeners: this.listeners.size,
      cleanups: this.customCleanups.size,
    };
  }
}

/**
 * Fake Timers Helper - Simplifies using fake timers in tests
 *
 * Example:
 * ```ts
 * test('debounce behavior', async () => {
 *   const timers = withFakeTimers();
 *
 *   const fn = jest.fn();
 *   const debounced = debounce(fn, 500);
 *
 *   debounced('test');
 *   expect(fn).not.toHaveBeenCalled();
 *
 *   await timers.advance(500);
 *   expect(fn).toHaveBeenCalledWith('test');
 * });
 * ```
 */
export function withFakeTimers() {
  jest.useFakeTimers();

  return {
    /**
     * Advance timers by specified milliseconds
     */
    async advance(ms: number): Promise<void> {
      jest.advanceTimersByTime(ms);
      await flushPromises();
    },

    /**
     * Run all pending timers
     */
    async runAll(): Promise<void> {
      jest.runAllTimers();
      await flushPromises();
    },

    /**
     * Run only pending timers (not newly scheduled)
     */
    async runPending(): Promise<void> {
      jest.runOnlyPendingTimers();
      await flushPromises();
    },

    /**
     * Restore real timers
     */
    restore(): void {
      jest.useRealTimers();
    },

    /**
     * Get current timestamp
     */
    now(): number {
      return Date.now();
    },
  };
}

/**
 * Flush all pending promises
 */
export async function flushPromises(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));
}

/**
 * Wait for async operations with better defaults than waitFor
 *
 * Example:
 * ```ts
 * await waitForAsync(() => {
 *   expect(screen.getByText(/success/i)).toBeInTheDocument();
 * });
 * ```
 */
export async function waitForAsync(
  callback: () => void | Promise<void>,
  options?: WaitForOptions
): Promise<void> {
  await waitFor(callback, {
    timeout: 5000, // 5s default (vs 1s in waitFor)
    interval: 50, // Check every 50ms
    ...options,
  });
}

/**
 * Wait for a specific amount of time (use only when absolutely necessary)
 * Prefer waitForAsync with a condition instead
 */
export async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Reset all Zustand stores to initial state
 * This is automatically called in afterEach, but can be called manually if needed
 */
export function resetAllStores(): void {
  try {
    const {
      useTimelineStore,
      usePlaybackStore,
      useSelectionStore,
      useHistoryStore,
      useClipboardStore,
    } = require('@/state/index');

    // Reset each store
    useTimelineStore.getState()?.setTimeline?.(null);
    usePlaybackStore.getState()?.setCurrentTime?.(0);
    usePlaybackStore.getState()?.setZoom?.(1);
    usePlaybackStore.getState()?.pause?.();
    useSelectionStore.getState()?.clearSelection?.();
    useHistoryStore.getState()?.clearHistory?.();
    useClipboardStore.getState()?.clearClipboard?.();
  } catch (error) {
    // Stores may not be available in all test environments
    // This is expected and safe to ignore
  }
}

/**
 * Retry a test assertion multiple times (for known flaky tests)
 *
 * Example:
 * ```ts
 * await retryAssertion(
 *   () => expect(result).toBe(expected),
 *   { attempts: 3, delay: 100 }
 * );
 * ```
 */
export async function retryAssertion(
  assertion: () => void | Promise<void>,
  options: { attempts?: number; delay?: number } = {}
): Promise<void> {
  const { attempts = 3, delay = 100 } = options;
  let lastError: Error | undefined;

  for (let i = 0; i < attempts; i++) {
    try {
      await assertion();
      return; // Success
    } catch (error) {
      lastError = error as Error;
      if (i < attempts - 1) {
        await wait(delay * (i + 1)); // Exponential backoff
      }
    }
  }

  throw lastError;
}

/**
 * Create a promise that rejects after a timeout
 * Useful for racing against slow operations
 */
export function timeoutPromise(ms: number, message?: string): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(message || `Timeout after ${ms}ms`));
    }, ms);
  });
}

/**
 * Run a test with a timeout
 * If the test doesn't complete in time, it will fail with a clear message
 *
 * Example:
 * ```ts
 * await withTimeout(
 *   async () => {
 *     // Test code
 *   },
 *   5000,
 *   'API call took too long'
 * );
 * ```
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  ms: number,
  message?: string
): Promise<T> {
  return Promise.race([fn(), timeoutPromise(ms, message)]);
}

/**
 * Track async operations to ensure they complete
 *
 * Example:
 * ```ts
 * const tracker = new AsyncTracker();
 *
 * const promise = tracker.track(fetchData());
 * // ... do other things
 * await tracker.waitForAll(); // Ensures all tracked promises complete
 * ```
 */
export class AsyncTracker {
  private pending = new Set<Promise<unknown>>();

  /**
   * Track a promise
   */
  track<T>(promise: Promise<T>): Promise<T> {
    this.pending.add(promise);
    promise.finally(() => {
      this.pending.delete(promise);
    });
    return promise;
  }

  /**
   * Wait for all tracked promises to complete
   */
  async waitForAll(timeout: number = 10000): Promise<void> {
    if (this.pending.size === 0) {
      return;
    }

    await withTimeout(
      () => Promise.all(Array.from(this.pending)),
      timeout,
      `${this.pending.size} async operation(s) did not complete in ${timeout}ms`
    );
  }

  /**
   * Get count of pending promises
   */
  getPendingCount(): number {
    return this.pending.size;
  }

  /**
   * Check if all promises have completed
   */
  isComplete(): boolean {
    return this.pending.size === 0;
  }
}

/**
 * Measure test execution time
 *
 * Example:
 * ```ts
 * const timer = new TestTimer();
 * // ... test code
 * const duration = timer.stop();
 * console.log(`Test took ${duration}ms`);
 * ```
 */
export class TestTimer {
  private startTime: number;
  private endTime?: number;

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Stop the timer and return duration in milliseconds
   */
  stop(): number {
    this.endTime = Date.now();
    return this.getDuration();
  }

  /**
   * Get duration (stops timer if not already stopped)
   */
  getDuration(): number {
    const end = this.endTime || Date.now();
    return end - this.startTime;
  }

  /**
   * Check if duration exceeds threshold
   */
  exceeds(ms: number): boolean {
    return this.getDuration() > ms;
  }
}

/**
 * Helper to track flaky test behavior
 * Runs a test multiple times and reports success rate
 *
 * Example:
 * ```ts
 * const result = await measureFlakiness(
 *   () => {
 *     // Test code that might be flaky
 *   },
 *   { runs: 10 }
 * );
 * console.log(`Success rate: ${result.successRate}%`);
 * ```
 */
export async function measureFlakiness(
  testFn: () => void | Promise<void>,
  options: { runs?: number } = {}
): Promise<{ successes: number; failures: number; successRate: number; errors: Error[] }> {
  const { runs = 10 } = options;
  let successes = 0;
  const errors: Error[] = [];

  for (let i = 0; i < runs; i++) {
    try {
      await testFn();
      successes++;
    } catch (error) {
      errors.push(error as Error);
    }
  }

  const failures = runs - successes;
  const successRate = (successes / runs) * 100;

  return {
    successes,
    failures,
    successRate,
    errors,
  };
}
