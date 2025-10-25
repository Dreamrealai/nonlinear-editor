/**
 * Signed URL Cache Manager
 *
 * Manages caching of signed URLs with TTL and automatic invalidation.
 * Prevents redundant signed URL requests and ensures URLs are refreshed before expiry.
 *
 * @module lib/signedUrlCache
 */

import { browserLogger } from './browserLogger';
import { deduplicatedFetch } from './requestDeduplication';

/**
 * Signed URL cache entry
 */
interface CacheEntry {
  /** The signed URL */
  signedUrl: string;
  /** Timestamp when the URL expires (milliseconds) */
  expiresAt: number;
  /** TTL in seconds */
  ttl: number;
  /** Timestamp when the entry was created */
  createdAt: number;
}

/**
 * Cache configuration options
 */
export interface SignedUrlCacheOptions {
  /** Default TTL in seconds (default: 3600 = 1 hour) */
  defaultTTL?: number;
  /** Buffer time before expiry to trigger refresh (default: 300000 = 5 minutes) */
  expiryBuffer?: number;
  /** Maximum cache size (default: 1000 entries) */
  maxCacheSize?: number;
  /** Whether to enable logging */
  enableLogging?: boolean;
}

/**
 * Response from the /api/assets/sign endpoint
 */
interface SignedUrlResponse {
  signedUrl: string;
  expiresIn: number;
}

/**
 * Signed URL Cache Manager
 * Manages client-side caching of signed URLs with automatic expiry and refresh
 */
class SignedUrlCacheManager {
  private cache = new Map<string, CacheEntry>();
  private config: Required<SignedUrlCacheOptions>;

  constructor(options: SignedUrlCacheOptions = {}) {
    this.config = {
      defaultTTL: options.defaultTTL ?? 3600,
      expiryBuffer: options.expiryBuffer ?? 300000, // 5 minutes
      maxCacheSize: options.maxCacheSize ?? 1000,
      enableLogging: options.enableLogging ?? false,
    };
  }

  /**
   * Generate cache key from asset ID or storage URL
   */
  private getCacheKey(assetId?: string, storageUrl?: string): string {
    if (assetId) return `asset:${assetId}`;
    if (storageUrl) return `storage:${storageUrl}`;
    throw new Error('Either assetId or storageUrl must be provided');
  }

  /**
   * Check if a cache entry is still valid
   */
  private isValid(entry: CacheEntry): boolean {
    const now = Date.now();
    const expiresWithBuffer = entry.expiresAt - this.config.expiryBuffer;
    return now < expiresWithBuffer;
  }

  /**
   * Enforce cache size limit using LRU strategy
   */
  private enforceCacheLimit(): void {
    if (this.cache.size <= this.config.maxCacheSize) {
      return;
    }

    // Find oldest entry by creation time
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    this.cache.forEach((entry, key): void => {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      this.cache.delete(oldestKey);
      if (this.config.enableLogging) {
        browserLogger.debug(
          {
            event: 'signed_url_cache.eviction',
            key: oldestKey,
            cacheSize: this.cache.size,
          },
          'Evicted oldest cache entry'
        );
      }
    }
  }

  /**
   * Get a signed URL from cache or fetch a new one
   *
   * @param assetId - Asset ID to sign
   * @param storageUrl - Storage URL to sign (alternative to assetId)
   * @param ttl - TTL in seconds (optional, uses default if not provided)
   * @returns Promise resolving to the signed URL, or null if asset not found (404)
   */
  async get(assetId?: string, storageUrl?: string, ttl?: number): Promise<string | null> {
    const cacheKey = this.getCacheKey(assetId, storageUrl);
    const cached = this.cache.get(cacheKey);

    // Check if cached entry is still valid
    if (cached && this.isValid(cached)) {
      if (this.config.enableLogging) {
        const timeToExpiry = cached.expiresAt - Date.now();
        browserLogger.debug(
          {
            event: 'signed_url_cache.hit',
            key: cacheKey,
            timeToExpiry,
          },
          `Cache hit (expires in ${Math.round(timeToExpiry / 1000)}s)`
        );
      }
      return cached.signedUrl;
    }

    // Cache miss or expired - fetch new signed URL
    if (this.config.enableLogging) {
      browserLogger.debug(
        {
          event: 'signed_url_cache.miss',
          key: cacheKey,
          reason: cached ? 'expired' : 'not_found',
        },
        'Cache miss - fetching new signed URL'
      );
    }

    return this.fetch(assetId, storageUrl, ttl);
  }

  /**
   * Fetch a signed URL and update cache
   *
   * @param assetId - Asset ID to sign
   * @param storageUrl - Storage URL to sign
   * @param ttl - TTL in seconds
   * @returns Promise resolving to the signed URL, or null if asset not found (404)
   */
  private async fetch(assetId?: string, storageUrl?: string, ttl?: number): Promise<string | null> {
    const cacheKey = this.getCacheKey(assetId, storageUrl);
    const effectiveTTL = ttl ?? this.config.defaultTTL;

    // Build query parameters
    const params = new URLSearchParams();
    if (assetId) params.set('assetId', assetId);
    if (storageUrl) params.set('storageUrl', storageUrl);
    params.set('ttl', String(effectiveTTL));

    try {
      // Use request deduplication to prevent duplicate sign requests
      const fetchResponse = await deduplicatedFetch(
        `/api/assets/sign?${params.toString()}`,
        undefined,
        {
          enableLogging: this.config.enableLogging,
          logContext: { assetId, storageUrl },
        }
      );

      // Handle non-OK responses gracefully
      if (!fetchResponse.ok) {
        const errorData = await fetchResponse.json().catch(() => ({ error: 'Unknown error' }));

        // 404 is expected for deleted assets - log as warning, not error
        if (fetchResponse.status === 404) {
          browserLogger.warn(
            {
              event: 'signed_url_cache.asset_not_found',
              key: cacheKey,
              assetId,
              status: 404,
            },
            'Asset not found - may have been deleted'
          );

          // Return null to indicate asset doesn't exist
          return null;
        }

        // For other errors, throw
        throw new Error(
          `Failed to sign URL (${fetchResponse.status}): ${errorData.error || 'Unknown error'}`
        );
      }

      const response = (await fetchResponse.json()) as SignedUrlResponse;

      if (!response.signedUrl) {
        throw new Error('Invalid response: missing signedUrl');
      }

      const now = Date.now();
      const expiresIn = response.expiresIn ?? effectiveTTL;
      const expiresAt = now + expiresIn * 1000;

      // Store in cache
      const entry: CacheEntry = {
        signedUrl: response.signedUrl,
        expiresAt,
        ttl: expiresIn,
        createdAt: now,
      };

      this.cache.set(cacheKey, entry);
      this.enforceCacheLimit();

      if (this.config.enableLogging) {
        browserLogger.debug(
          {
            event: 'signed_url_cache.stored',
            key: cacheKey,
            ttl: expiresIn,
            cacheSize: this.cache.size,
          },
          `Stored signed URL (TTL: ${expiresIn}s)`
        );
      }

      return response.signedUrl;
    } catch (error) {
      browserLogger.error(
        {
          event: 'signed_url_cache.error',
          key: cacheKey,
          error,
        },
        'Failed to fetch signed URL'
      );
      throw error;
    }
  }

  /**
   * Invalidate a specific cache entry
   *
   * @param assetId - Asset ID to invalidate
   * @param storageUrl - Storage URL to invalidate
   * @returns True if an entry was invalidated
   */
  invalidate(assetId?: string, storageUrl?: string): boolean {
    const cacheKey = this.getCacheKey(assetId, storageUrl);
    const deleted = this.cache.delete(cacheKey);

    if (deleted && this.config.enableLogging) {
      browserLogger.debug(
        {
          event: 'signed_url_cache.invalidated',
          key: cacheKey,
        },
        'Cache entry invalidated'
      );
    }

    return deleted;
  }

  /**
   * Invalidate all cache entries matching a pattern
   *
   * @param pattern - Regular expression to match cache keys
   * @returns Number of entries invalidated
   */
  invalidateMatching(pattern: RegExp): number {
    let count = 0;
    this.cache.forEach((_, key): void => {
      if (pattern.test(key)) {
        this.cache.delete(key);
        count++;
      }
    });

    if (count > 0 && this.config.enableLogging) {
      browserLogger.debug(
        {
          event: 'signed_url_cache.bulk_invalidated',
          count,
          pattern: pattern.source,
        },
        `Invalidated ${count} cache entries`
      );
    }

    return count;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const count = this.cache.size;
    this.cache.clear();

    if (this.config.enableLogging) {
      browserLogger.debug(
        {
          event: 'signed_url_cache.cleared',
          count,
        },
        `Cleared ${count} cache entries`
      );
    }
  }

  /**
   * Prune expired entries from cache
   *
   * @returns Number of entries pruned
   */
  prune(): number {
    let count = 0;
    const now = Date.now();

    this.cache.forEach((entry, key): void => {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
        count++;
      }
    });

    if (count > 0 && this.config.enableLogging) {
      browserLogger.debug(
        {
          event: 'signed_url_cache.pruned',
          count,
          remainingSize: this.cache.size,
        },
        `Pruned ${count} expired entries`
      );
    }

    return count;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    entries: Array<{
      key: string;
      ttl: number;
      age: number;
      timeToExpiry: number;
    }>;
  } {
    const now = Date.now();
    const entries: Array<{
      key: string;
      ttl: number;
      age: number;
      timeToExpiry: number;
    }> = [];

    this.cache.forEach((entry, key): void => {
      entries.push({
        key,
        ttl: entry.ttl,
        age: now - entry.createdAt,
        timeToExpiry: Math.max(0, entry.expiresAt - now),
      });
    });

    return {
      size: this.cache.size,
      maxSize: this.config.maxCacheSize,
      entries,
    };
  }

  /**
   * Prefetch signed URLs for multiple assets
   *
   * @param assets - Array of assets to prefetch
   * @param ttl - TTL in seconds
   */
  async prefetch(
    assets: Array<{ assetId?: string; storageUrl?: string }>,
    ttl?: number
  ): Promise<void> {
    if (this.config.enableLogging) {
      browserLogger.debug(
        {
          event: 'signed_url_cache.prefetch_started',
          count: assets.length,
        },
        `Prefetching ${assets.length} signed URLs`
      );
    }

    await Promise.allSettled(
      assets.map(
        ({ assetId, storageUrl }): Promise<string | null> => this.get(assetId, storageUrl, ttl)
      )
    );

    if (this.config.enableLogging) {
      browserLogger.debug(
        {
          event: 'signed_url_cache.prefetch_completed',
          cacheSize: this.cache.size,
        },
        'Prefetch completed'
      );
    }
  }
}

// Singleton instance with default configuration
const defaultCacheManager = new SignedUrlCacheManager({
  enableLogging: process.env.NODE_ENV === 'development',
});

// Export singleton for common usage
export const signedUrlCache = defaultCacheManager;

// Export class for custom instances
export { SignedUrlCacheManager };
