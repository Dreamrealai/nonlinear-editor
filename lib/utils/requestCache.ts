/**
 * Request Caching and Deduplication Utility
 *
 * Provides intelligent caching and deduplication for API requests to improve performance.
 *
 * Features:
 * - In-memory cache with TTL support
 * - Request deduplication to prevent concurrent identical requests
 * - Automatic cache invalidation
 * - Configurable cache size and TTL
 * - Type-safe API with generics
 *
 * Usage:
 * ```typescript
 * const cache = new RequestCache<UserData>({ ttl: 60000, maxSize: 100 });
 *
 * // Fetch with automatic caching and deduplication
 * const user = await cache.fetch('user-123', () => fetchUser('123'));
 *
 * // Manually set cache
 * cache.set('user-123', userData, 30000);
 *
 * // Invalidate cache
 * cache.invalidate('user-123');
 * cache.invalidatePattern(/^user-/);
 * ```
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface RequestCacheOptions {
  /** Default time-to-live in milliseconds (default: 5 minutes) */
  ttl?: number;
  /** Maximum number of entries (default: 500) */
  maxSize?: number;
  /** Enable console logging for debugging (default: false) */
  debug?: boolean;
}

export class RequestCache<T = unknown> {
  private cache = new Map<string, CacheEntry<T>>();
  private pendingRequests = new Map<string, Promise<T>>();
  private readonly options: Required<RequestCacheOptions>;

  constructor(options: RequestCacheOptions = {}) {
    this.options = {
      ttl: options.ttl ?? 5 * 60 * 1000, // 5 minutes default
      maxSize: options.maxSize ?? 500,
      debug: options.debug ?? false,
    };
  }

  /**
   * Get value from cache if valid, otherwise return null
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Check if expired
    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      this.cache.delete(key);
      if (this.options.debug) {
        console.log(`[RequestCache] Expired: ${key} (age: ${age}ms, ttl: ${entry.ttl}ms)`);
      }
      return null;
    }

    if (this.options.debug) {
      console.log(`[RequestCache] Hit: ${key} (age: ${age}ms)`);
    }

    return entry.data;
  }

  /**
   * Set value in cache with optional custom TTL
   */
  set(key: string, data: T, ttl?: number): void {
    // Enforce max size by removing oldest entries
    if (this.cache.size >= this.options.maxSize) {
      const oldestKey = this.cache.keys().next().value as string;
      this.cache.delete(oldestKey);
      if (this.options.debug) {
        console.log(`[RequestCache] Evicted oldest: ${oldestKey}`);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.options.ttl,
    });

    if (this.options.debug) {
      console.log(`[RequestCache] Set: ${key} (ttl: ${ttl ?? this.options.ttl}ms)`);
    }
  }

  /**
   * Fetch with automatic caching and deduplication
   *
   * If data is in cache and valid, returns cached data.
   * If request is already pending, returns the same promise.
   * Otherwise, executes fetcher and caches result.
   */
  async fetch(key: string, fetcher: () => Promise<T>, ttl?: number): Promise<T> {
    // Check cache first
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }

    // Check for pending request (deduplication)
    const pending = this.pendingRequests.get(key);
    if (pending) {
      if (this.options.debug) {
        console.log(`[RequestCache] Deduplicating: ${key}`);
      }
      return pending;
    }

    // Execute fetcher
    if (this.options.debug) {
      console.log(`[RequestCache] Miss: ${key} - fetching...`);
    }

    const promise = fetcher()
      .then((data): T => {
        this.set(key, data, ttl);
        this.pendingRequests.delete(key);
        return data;
      })
      .catch((error): never => {
        this.pendingRequests.delete(key);
        throw error;
      });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  /**
   * Invalidate a single cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
    if (this.options.debug) {
      console.log(`[RequestCache] Invalidated: ${key}`);
    }
  }

  /**
   * Invalidate all cache entries matching a pattern
   */
  invalidatePattern(pattern: RegExp): void {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    if (this.options.debug) {
      console.log(`[RequestCache] Invalidated ${count} entries matching pattern: ${pattern}`);
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.pendingRequests.clear();
    if (this.options.debug) {
      console.log(`[RequestCache] Cleared ${size} entries`);
    }
  }

  /**
   * Get current cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get cache statistics
   */
  stats(): {
    size: number;
    maxSize: number;
    pendingRequests: number;
    entries: Array<{ key: string; age: number; ttl: number }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(
      ([key, entry]): {
        key: string;
        age: number;
        ttl: number;
      } => ({
        key,
        age: now - entry.timestamp,
        ttl: entry.ttl,
      })
    );

    return {
      size: this.cache.size,
      maxSize: this.options.maxSize,
      pendingRequests: this.pendingRequests.size,
      entries,
    };
  }
}

/**
 * Global request cache instances for common use cases
 */

// User data cache (5 minute TTL)
export const userCache = new RequestCache<unknown>({
  ttl: 5 * 60 * 1000,
  maxSize: 100,
});

// Project data cache (2 minute TTL)
export const projectCache = new RequestCache<unknown>({
  ttl: 2 * 60 * 1000,
  maxSize: 200,
});

// Asset data cache (10 minute TTL)
export const assetCache = new RequestCache<unknown>({
  ttl: 10 * 60 * 1000,
  maxSize: 500,
});

// API response cache (1 minute TTL)
export const apiCache = new RequestCache<unknown>({
  ttl: 60 * 1000,
  maxSize: 300,
});

/**
 * Helper function to create cache keys
 */
export function createCacheKey(
  ...parts: Array<string | number | boolean | undefined | null>
): string {
  return parts.filter((p): boolean => p != null).join(':');
}

/**
 * Decorator for caching function results
 */
export function cached<Args extends unknown[], Result>(
  cache: RequestCache<Result>,
  keyFn: (...args: Args) => string,
  ttl?: number
): (fn: (...args: Args) => Promise<Result>) => (...args: Args) => Promise<Result> {
  return (fn: (...args: Args) => Promise<Result>): ((...args: Args) => Promise<Result>) => {
    return async (...args: Args): Promise<Result> => {
      const key = keyFn(...args);
      return cache.fetch(key, (): Promise<Result> => fn(...args), ttl);
    };
  };
}
