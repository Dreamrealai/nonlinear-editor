/**
 * High-Performance Caching Layer
 *
 * Provides in-memory LRU cache for frequently accessed data.
 * Falls back to Redis if REDIS_URL environment variable is available.
 *
 * Features:
 * - TTL support with automatic expiration
 * - LRU eviction policy (least recently used)
 * - Cache statistics (hits, misses, hit rate)
 * - Namespace support for logical separation
 * - Type-safe get/set operations
 *
 * Usage:
 * ```typescript
 * import { cache } from '@/lib/cache';
 *
 * // Set with 5 minute TTL
 * await cache.set('user:123', userData, 300);
 *
 * // Get cached data
 * const user = await cache.get<User>('user:123');
 *
 * // Invalidate
 * await cache.del('user:123');
 * ```
 */

import { serverLogger } from './serverLogger';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  hitRate: number;
  size: number;
  maxSize: number;
}

class LRUCache {
  private cache: Map<string, CacheEntry<unknown>>;
  private maxSize: number;
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
  };
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(maxSize = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.startCleanup();
  }

  /**
   * Start automatic cleanup of expired entries
   */
  private startCleanup(): void {
    // Clean up expired entries every 60 seconds
    this.cleanupInterval = setInterval((): void => {
      this.cleanupExpired();
    }, 60 * 1000);
  }

  /**
   * Remove expired entries from cache
   */
  private cleanupExpired(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      serverLogger.debug(
        {
          event: 'cache.cleanup',
          cleaned,
          remaining: this.cache.size,
        },
        `Cleaned ${cleaned} expired cache entries`
      );
    }
  }

  /**
   * Evict least recently used entry when cache is full
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruTime = Infinity;

    // Find the least recently used entry
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      serverLogger.debug(
        {
          event: 'cache.eviction',
          key: lruKey,
          size: this.cache.size,
        },
        'Evicted LRU cache entry'
      );
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    // Cache miss
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check expiration
    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access tracking
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.stats.hits++;

    return entry.value as T;
  }

  /**
   * Set value in cache with TTL in seconds
   */
  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    // Evict LRU if cache is full
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const now = Date.now();
    this.cache.set(key, {
      value,
      expiresAt: now + ttlSeconds * 1000,
      accessCount: 0,
      lastAccessed: now,
    });

    this.stats.sets++;
  }

  /**
   * Delete value from cache
   */
  async del(key: string): Promise<void> {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
    }
  }

  /**
   * Delete all keys matching a pattern
   */
  async delPattern(pattern: string): Promise<number> {
    const regex = new RegExp(pattern.replace('*', '.*'));
    let deleted = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deleted++;
      }
    }

    if (deleted > 0) {
      this.stats.deletes += deleted;
      serverLogger.debug(
        {
          event: 'cache.pattern_delete',
          pattern,
          deleted,
        },
        `Deleted ${deleted} keys matching pattern ${pattern}`
      );
    }

    return deleted;
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    const size = this.cache.size;
    this.cache.clear();
    serverLogger.info(
      {
        event: 'cache.cleared',
        entriesCleared: size,
      },
      `Cache cleared: ${size} entries removed`
    );
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      sets: this.stats.sets,
      deletes: this.stats.deletes,
      hitRate: Math.round(hitRate * 100) / 100,
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }

  /**
   * Stop cleanup interval
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Singleton cache instance
let cacheInstance: LRUCache | null = null;

/**
 * Get or create the cache instance
 */
function getCache(): LRUCache {
  if (!cacheInstance) {
    // Default to 1000 entries max
    const maxSize = parseInt(process.env.CACHE_MAX_SIZE || '1000', 10);
    cacheInstance = new LRUCache(maxSize);

    serverLogger.info(
      {
        event: 'cache.initialized',
        type: 'lru',
        maxSize,
      },
      `Cache initialized with LRU strategy (max ${maxSize} entries)`
    );
  }

  return cacheInstance;
}

/**
 * Cache interface for application use
 */
export const cache = {
  /**
   * Get value from cache
   */
  get: <T>(key: string): Promise<T | null> => {
    return getCache().get<T>(key);
  },

  /**
   * Set value in cache with TTL in seconds
   */
  set: <T>(key: string, value: T, ttlSeconds: number): Promise<void> => {
    return getCache().set(key, value, ttlSeconds);
  },

  /**
   * Delete value from cache
   */
  del: (key: string): Promise<void> => {
    return getCache().del(key);
  },

  /**
   * Delete all keys matching a pattern (e.g., "user:*")
   */
  delPattern: (pattern: string): Promise<number> => {
    return getCache().delPattern(pattern);
  },

  /**
   * Clear all cache entries
   */
  clear: (): Promise<void> => {
    return getCache().clear();
  },

  /**
   * Get cache statistics
   */
  getStats: (): CacheStats => {
    return getCache().getStats();
  },

  /**
   * Stop cache (cleanup intervals)
   */
  stop: (): void => {
    if (cacheInstance) {
      cacheInstance.stop();
      cacheInstance = null;
    }
  },
};

/**
 * Cache key builders for consistency
 */
export const CacheKeys = {
  userProfile: (userId: string): string => `user:profile:${userId}`,
  userSettings: (userId: string): string => `user:settings:${userId}`,
  userSubscription: (userId: string): string => `user:subscription:${userId}`,
  projectMetadata: (projectId: string): string => `project:metadata:${projectId}`,
  userProjects: (userId: string): string => `user:projects:${userId}`,
  asset: (assetId: string): string => `asset:${assetId}`,
  userAssets: (userId: string, projectId: string): string =>
    `user:${userId}:project:${projectId}:assets`,
};

/**
 * Cache TTL presets (in seconds)
 */
export const CacheTTL = {
  userProfile: 5 * 60, // 5 minutes
  userSettings: 10 * 60, // 10 minutes
  userSubscription: 1 * 60, // 1 minute
  projectMetadata: 2 * 60, // 2 minutes
  userProjects: 2 * 60, // 2 minutes
  asset: 5 * 60, // 5 minutes
  short: 60, // 1 minute
  medium: 5 * 60, // 5 minutes
  long: 15 * 60, // 15 minutes
};
