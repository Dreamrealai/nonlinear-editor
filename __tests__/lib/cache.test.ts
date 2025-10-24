import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cache, CacheKeys, CacheTTL } from '@/lib/cache';

describe('cache', () => {
  beforeEach(() => {
    // Clear cache before each test
    cache.clear();
  });

  afterEach(() => {
    cache.stop();
  });

  describe('set and get', () => {
    it('should set and retrieve values', async () => {
      const key = 'test-key';
      const value = { name: 'John', age: 30 };

      await cache.set(key, value, 60);
      const result = await cache.get<typeof value>(key);

      expect(result).toEqual(value);
    });

    it('should return null for non-existent keys', async () => {
      const result = await cache.get('non-existent');

      expect(result).toBeNull();
    });

    it('should handle different data types', async () => {
      await cache.set('string', 'hello', 60);
      await cache.set('number', 42, 60);
      await cache.set('boolean', true, 60);
      await cache.set('array', [1, 2, 3], 60);
      await cache.set('object', { a: 1 }, 60);

      expect(await cache.get('string')).toBe('hello');
      expect(await cache.get('number')).toBe(42);
      expect(await cache.get('boolean')).toBe(true);
      expect(await cache.get('array')).toEqual([1, 2, 3]);
      expect(await cache.get('object')).toEqual({ a: 1 });
    });
  });

  describe('TTL expiration', () => {
    it('should expire entries after TTL', async () => {
      const key = 'expiring-key';
      const value = 'test-value';

      // Set with 1 second TTL
      await cache.set(key, value, 1);

      // Value should be available immediately
      expect(await cache.get(key)).toBe(value);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Value should be null after expiration
      expect(await cache.get(key)).toBeNull();
    });

    it('should not return expired values', async () => {
      await cache.set('key1', 'value1', 1);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const result = await cache.get('key1');
      expect(result).toBeNull();
    });
  });

  describe('del', () => {
    it('should delete a single key', async () => {
      await cache.set('key1', 'value1', 60);
      await cache.set('key2', 'value2', 60);

      await cache.del('key1');

      expect(await cache.get('key1')).toBeNull();
      expect(await cache.get('key2')).toBe('value2');
    });

    it('should handle deleting non-existent keys', async () => {
      await expect(cache.del('non-existent')).resolves.not.toThrow();
    });
  });

  describe('delPattern', () => {
    it('should delete keys matching pattern', async () => {
      await cache.set('user:123:profile', { id: '123' }, 60);
      await cache.set('user:123:settings', { theme: 'dark' }, 60);
      await cache.set('user:456:profile', { id: '456' }, 60);
      await cache.set('project:789', { name: 'test' }, 60);

      const deleted = await cache.delPattern('user:123:*');

      expect(deleted).toBe(2);
      expect(await cache.get('user:123:profile')).toBeNull();
      expect(await cache.get('user:123:settings')).toBeNull();
      expect(await cache.get('user:456:profile')).not.toBeNull();
      expect(await cache.get('project:789')).not.toBeNull();
    });

    it('should return 0 when no keys match pattern', async () => {
      await cache.set('key1', 'value1', 60);

      const deleted = await cache.delPattern('nomatch:*');

      expect(deleted).toBe(0);
    });
  });

  describe('clear', () => {
    it('should clear all cache entries', async () => {
      await cache.set('key1', 'value1', 60);
      await cache.set('key2', 'value2', 60);
      await cache.set('key3', 'value3', 60);

      await cache.clear();

      expect(await cache.get('key1')).toBeNull();
      expect(await cache.get('key2')).toBeNull();
      expect(await cache.get('key3')).toBeNull();
    });
  });

  describe('getStats', () => {
    it('should track cache hits and misses', async () => {
      await cache.set('key1', 'value1', 60);

      // Generate hits
      await cache.get('key1');
      await cache.get('key1');

      // Generate misses
      await cache.get('key2');
      await cache.get('key3');

      const stats = cache.getStats();

      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(2);
      expect(stats.hitRate).toBe(0.5);
    });

    it('should track sets and deletes', async () => {
      await cache.set('key1', 'value1', 60);
      await cache.set('key2', 'value2', 60);
      await cache.del('key1');

      const stats = cache.getStats();

      expect(stats.sets).toBe(2);
      expect(stats.deletes).toBe(1);
    });

    it('should report cache size', async () => {
      await cache.set('key1', 'value1', 60);
      await cache.set('key2', 'value2', 60);
      await cache.set('key3', 'value3', 60);

      const stats = cache.getStats();

      expect(stats.size).toBe(3);
    });
  });

  describe('LRU eviction', () => {
    it('should evict least recently used entries when cache is full', async () => {
      // This test assumes maxSize is set in environment or defaults to 1000
      // For testing, we need to set many entries to trigger eviction
      const maxSize = 1000;

      // Fill cache to max
      for (let i = 0; i < maxSize; i++) {
        await cache.set(`key${i}`, `value${i}`, 60);
      }

      // Access some entries to make them recently used
      await cache.get('key999');

      // Add one more entry, should evict LRU (likely key0)
      await cache.set('newKey', 'newValue', 60);

      const stats = cache.getStats();
      expect(stats.size).toBeLessThanOrEqual(maxSize);
    });
  });

  describe('CacheKeys helpers', () => {
    it('should generate consistent cache keys', () => {
      const userId = 'user-123';
      const projectId = 'project-456';
      const assetId = 'asset-789';

      expect(CacheKeys.userProfile(userId)).toBe('user:profile:user-123');
      expect(CacheKeys.userSettings(userId)).toBe('user:settings:user-123');
      expect(CacheKeys.userSubscription(userId)).toBe('user:subscription:user-123');
      expect(CacheKeys.projectMetadata(projectId)).toBe('project:metadata:project-456');
      expect(CacheKeys.userProjects(userId)).toBe('user:projects:user-123');
      expect(CacheKeys.asset(assetId)).toBe('asset:asset-789');
      expect(CacheKeys.userAssets(userId, projectId)).toBe(
        'user:user-123:project:project-456:assets'
      );
    });
  });

  describe('CacheTTL presets', () => {
    it('should provide TTL constants in seconds', () => {
      expect(CacheTTL.userProfile).toBe(5 * 60);
      expect(CacheTTL.userSettings).toBe(10 * 60);
      expect(CacheTTL.userSubscription).toBe(1 * 60);
      expect(CacheTTL.projectMetadata).toBe(2 * 60);
      expect(CacheTTL.userProjects).toBe(2 * 60);
      expect(CacheTTL.asset).toBe(5 * 60);
      expect(CacheTTL.short).toBe(60);
      expect(CacheTTL.medium).toBe(5 * 60);
      expect(CacheTTL.long).toBe(15 * 60);
    });
  });

  describe('concurrent operations', () => {
    it('should handle concurrent gets and sets', async () => {
      const operations = [];

      // Concurrent sets
      for (let i = 0; i < 10; i++) {
        operations.push(cache.set(`key${i}`, `value${i}`, 60));
      }

      await Promise.all(operations);

      // Concurrent gets
      const getOperations = [];
      for (let i = 0; i < 10; i++) {
        getOperations.push(cache.get(`key${i}`));
      }

      const results = await Promise.all(getOperations);

      expect(results).toHaveLength(10);
      results.forEach((result, i) => {
        expect(result).toBe(`value${i}`);
      });
    });
  });
});
