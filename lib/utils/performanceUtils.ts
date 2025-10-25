/**
 * Performance Utilities
 *
 * Collection of utilities for performance optimization:
 * - Debouncing and throttling
 * - Batch updates
 * - RAF scheduling
 * - Memory-efficient data structures
 */

/**
 * Debounce function calls to reduce execution frequency
 *
 * @param fn Function to debounce
 * @param delay Delay in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function debounced(...args: Parameters<T>): void {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout((): void => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * Throttle function calls to limit execution rate
 *
 * @param fn Function to throttle
 * @param limit Minimum time between calls in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function throttled(...args: Parameters<T>): void {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;

    if (timeSinceLastCall >= limit) {
      lastCall = now;
      fn(...args);
    } else if (timeoutId === null) {
      // Schedule the next call
      timeoutId = setTimeout((): void => {
        lastCall = Date.now();
        fn(...args);
        timeoutId = null;
      }, limit - timeSinceLastCall);
    }
  };
}

/**
 * Schedule a function to run on the next animation frame
 *
 * @param fn Function to schedule
 * @returns Cancel function
 */
export function scheduleRAF(fn: () => void): () => void {
  let rafId: number | null = requestAnimationFrame(fn);

  return (): void => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };
}

/**
 * Batch multiple updates into a single RAF cycle
 */
export class RAFBatcher {
  private pending = new Set<() => void>();
  private rafId: number | null = null;

  /**
   * Schedule a function to run on next RAF
   */
  schedule(fn: () => void): void {
    this.pending.add(fn);

    if (this.rafId === null) {
      this.rafId = requestAnimationFrame((): void => {
        this.flush();
      });
    }
  }

  /**
   * Execute all pending functions
   */
  private flush(): void {
    const fns = Array.from(this.pending);
    this.pending.clear();
    this.rafId = null;

    for (const fn of fns) {
      try {
        fn();
      } catch (error) {
        console.error('Error in RAF batch:', error);
      }
    }
  }

  /**
   * Cancel all pending updates
   */
  cancel(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.pending.clear();
  }
}

/**
 * Measure execution time of a function
 */
export async function measure<T>(
  name: string,
  fn: () => T | Promise<T>
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;

  console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);

  return { result, duration };
}

/**
 * Memory-efficient LRU cache
 */
export class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private readonly maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    // Remove if exists to update position
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Add to end
    this.cache.set(key, value);

    // Evict oldest if over capacity
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value as K;
      this.cache.delete(firstKey);
    }
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

/**
 * Lazy initializer for expensive computations
 */
export class Lazy<T> {
  private value: T | undefined = undefined;
  private initialized = false;
  private readonly factory: () => T;

  constructor(factory: () => T) {
    this.factory = factory;
  }

  get(): T {
    if (!this.initialized) {
      this.value = this.factory();
      this.initialized = true;
    }
    return this.value as T;
  }

  reset(): void {
    this.value = undefined;
    this.initialized = false;
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

/**
 * Batch processor for bulk operations
 */
export class BatchProcessor<T, R> {
  private batch: T[] = [];
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private readonly processor: (items: T[]) => Promise<R[]>;
  private readonly batchSize: number;
  private readonly batchDelay: number;
  private resolvers: Array<{
    resolve: (value: R) => void;
    reject: (error: unknown) => void;
  }> = [];

  constructor(
    processor: (items: T[]) => Promise<R[]>,
    options: { batchSize?: number; batchDelay?: number } = {}
  ) {
    this.processor = processor;
    this.batchSize = options.batchSize ?? 100;
    this.batchDelay = options.batchDelay ?? 50;
  }

  /**
   * Add item to batch and return a promise for the result
   */
  async add(item: T): Promise<R> {
    return new Promise<R>((resolve, reject): void => {
      this.batch.push(item);
      this.resolvers.push({ resolve, reject });

      // Process immediately if batch is full
      if (this.batch.length >= this.batchSize) {
        this.flush();
      } else if (this.timeoutId === null) {
        // Schedule batch processing
        this.timeoutId = setTimeout((): void => {
          this.flush();
        }, this.batchDelay);
      }
    });
  }

  /**
   * Process all pending items
   */
  private async flush(): Promise<void> {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    if (this.batch.length === 0) {
      return;
    }

    const batch = this.batch;
    const resolvers = this.resolvers;
    this.batch = [];
    this.resolvers = [];

    try {
      const results = await this.processor(batch);

      for (let i = 0; i < resolvers.length; i++) {
        const result = results[i];
        if (result !== undefined) {
          resolvers[i]?.resolve(result);
        } else {
          resolvers[i]?.reject(new Error('No result for batch item'));
        }
      }
    } catch (error) {
      // Reject all pending promises
      for (const { reject } of resolvers) {
        reject(error);
      }
    }
  }

  /**
   * Get current batch size
   */
  get pendingCount(): number {
    return this.batch.length;
  }
}

/**
 * Memoize function results
 */
export function memoize<Args extends unknown[], Result>(
  fn: (...args: Args) => Result,
  options: { maxSize?: number; keyFn?: (...args: Args) => string } = {}
): (...args: Args) => Result {
  const cache = new LRUCache<string, Result>(options.maxSize ?? 100);
  const keyFn = options.keyFn ?? ((...args: Args): string => JSON.stringify(args));

  return (...args: Args): Result => {
    const key = keyFn(...args);
    const cached = cache.get(key);

    if (cached !== undefined) {
      return cached;
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

/**
 * Once function - execute only once
 */
export function once<T extends (...args: unknown[]) => unknown>(fn: T): T {
  let called = false;
  let result: ReturnType<T>;

  return ((...args: Parameters<T>): ReturnType<T> => {
    if (!called) {
      called = true;
      result = fn(...args) as ReturnType<T>;
    }
    return result;
  }) as T;
}
