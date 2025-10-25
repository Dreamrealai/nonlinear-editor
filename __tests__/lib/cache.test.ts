/**
 * Tests for LRU Cache
 *
 * Validates cache operations, expiration, eviction, and statistics tracking
 */

import { cache, CacheKeys, CacheTTL } from '@/lib/cache';

// Mock serverLogger to avoid actual logging in tests
jest.mock('@/lib/serverLogger', (): Record<string, unknown> => ({
  serverLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Cache', () => {
  beforeEach((): void => {
    // Clear cache before each test
    cache.clear();
  });

  afterAll((): void => {
    // Stop cleanup interval
    cache.stop();
  });

  describe('Basic Operations', () => {
    it('should set and get values', async () => {
      // Arrange
      const key = 'test:key';
      const value = { id: 1, name: 'Test' };

      // Act
      await cache.set(key, value, 60);
      const result = await cache.get<typeof value>(key);

      // Assert
      expect(result).toEqual(value);
    });

    it('should return null for non-existent keys', async () => {
      // Act
      const result = await cache.get('nonexistent');

      // Assert
      expect(result).toBeNull();
    });

    it('should delete values', async () => {
      // Arrange
      const key = 'test:key';
      await cache.set(key, 'value', 60);

      // Act
      await cache.del(key);
      const result = await cache.get(key);

      // Assert
      expect(result).toBeNull();
    });

    it('should clear all values', async () => {
      // Arrange
      await cache.set('key1', 'value1', 60);
      await cache.set('key2', 'value2', 60);

      // Act
      await cache.clear();
      const result1 = await cache.get('key1');
      const result2 = await cache.get('key2');

      // Assert
      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });
  });

  describe('Expiration', () => {
    it('should expire values after TTL', async () => {
      // Arrange
      const key = 'test:key';
      const shortTTL = 0.1; // 100ms

      // Act
      await cache.set(key, 'value', shortTTL);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 200));

      const result = await cache.get(key);

      // Assert
      expect(result).toBeNull();
    });

    it('should not expire values before TTL', async () => {
      // Arrange
      const key = 'test:key';
      const value = 'test-value';

      // Act
      await cache.set(key, value, 10); // 10 seconds
      const result = await cache.get(key);

      // Assert
      expect(result).toBe(value);
    });

    it('should handle different TTLs for different keys', async () => {
      // Arrange
      await cache.set('key1', 'value1', 0.1); // 100ms
      await cache.set('key2', 'value2', 10); // 10 seconds

      // Act
      await new Promise((resolve) => setTimeout(resolve, 200));
      const result1 = await cache.get('key1');
      const result2 = await cache.get('key2');

      // Assert
      expect(result1).toBeNull();
      expect(result2).toBe('value2');
    });
  });

  describe('Pattern Deletion', () => {
    it('should delete keys matching pattern', async () => {
      // Arrange
      await cache.set('user:1', 'alice', 60);
      await cache.set('user:2', 'bob', 60);
      await cache.set('project:1', 'project', 60);

      // Act
      const deleted = await cache.delPattern('user:*');

      // Assert
      expect(deleted).toBe(2);
      expect(await cache.get('user:1')).toBeNull();
      expect(await cache.get('user:2')).toBeNull();
      expect(await cache.get('project:1')).toBe('project');
    });

    it('should return 0 when no keys match pattern', async () => {
      // Arrange
      await cache.set('key1', 'value1', 60);

      // Act
      const deleted = await cache.delPattern('nonexistent:*');

      // Assert
      expect(deleted).toBe(0);
    });
  });

  describe('Statistics', () => {
    it('should track hits and misses', async () => {
      // Arrange
      await cache.set('key', 'value', 60);

      // Act
      await cache.get('key'); // hit
      await cache.get('key'); // hit
      await cache.get('nonexistent'); // miss

      const stats = cache.getStats();

      // Assert
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.67, 1);
    });

    it('should track sets and deletes', async () => {
      // Arrange & Act
      await cache.set('key1', 'value1', 60);
      await cache.set('key2', 'value2', 60);
      await cache.del('key1');

      const stats = cache.getStats();

      // Assert
      expect(stats.sets).toBe(2);
      expect(stats.deletes).toBe(1);
      expect(stats.size).toBe(1);
    });

    it('should calculate correct hit rate', async () => {
      // Arrange
      await cache.set('key', 'value', 60);

      // Act
      await cache.get('key'); // hit
      await cache.get('miss1'); // miss
      await cache.get('miss2'); // miss

      const stats = cache.getStats();

      // Assert
      expect(stats.hitRate).toBeCloseTo(0.33, 1);
    });

    it('should handle hit rate with no requests', () => {
      // Act
      const stats = cache.getStats();

      // Assert
      expect(stats.hitRate).toBe(0);
    });
  });

  describe('Type Safety', () => {
    it('should preserve complex types', async () => {
      // Arrange
      interface User {
        id: number;
        name: string;
        settings: {
          theme: string;
          notifications: boolean;
        };
      }

      const user: User = {
        id: 1,
        name: 'Alice',
        settings: {
          theme: 'dark',
          notifications: true,
        },
      };

      // Act
      await cache.set('user', user, 60);
      const result = await cache.get<User>('user');

      // Assert
      expect(result).toEqual(user);
      expect(result?.settings.theme).toBe('dark');
    });

    it('should handle arrays', async () => {
      // Arrange
      const items = [1, 2, 3, 4, 5];

      // Act
      await cache.set('items', items, 60);
      const result = await cache.get<number[]>('items');

      // Assert
      expect(result).toEqual(items);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Cache Keys Helpers', () => {
    it('should generate consistent cache keys', () => {
      // Act
      const key1 = CacheKeys.userProfile('user123');
      const key2 = CacheKeys.userProfile('user123');
      const key3 = CacheKeys.userProfile('user456');

      // Assert
      expect(key1).toBe(key2);
      expect(key1).not.toBe(key3);
      expect(key1).toBe('user:profile:user123');
    });

    it('should generate project keys', () => {
      // Act
      const key = CacheKeys.projectMetadata('proj1');

      // Assert
      expect(key).toBe('project:metadata:proj1');
    });

    it('should generate user assets keys', () => {
      // Act
      const key = CacheKeys.userAssets('user1', 'proj1');

      // Assert
      expect(key).toBe('user:user1:project:proj1:assets');
    });
  });

  describe('Cache TTL Presets', () => {
    it('should have consistent TTL values', () => {
      // Assert
      expect(CacheTTL.userProfile).toBe(5 * 60);
      expect(CacheTTL.userSettings).toBe(10 * 60);
      expect(CacheTTL.short).toBe(60);
      expect(CacheTTL.medium).toBe(5 * 60);
      expect(CacheTTL.long).toBe(15 * 60);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty strings', async () => {
      // Act
      await cache.set('key', '', 60);
      const result = await cache.get('key');

      // Assert
      expect(result).toBe('');
    });

    it('should handle null values', async () => {
      // Act
      await cache.set('key', null, 60);
      const result = await cache.get('key');

      // Assert
      expect(result).toBeNull();
    });

    it('should handle undefined values', async () => {
      // Act
      await cache.set('key', undefined, 60);
      const result = await cache.get('key');

      // Assert
      expect(result).toBeUndefined();
    });

    it('should handle numeric values', async () => {
      // Act
      await cache.set('zero', 0, 60);
      await cache.set('negative', -1, 60);
      await cache.set('float', 3.14, 60);

      // Assert
      expect(await cache.get('zero')).toBe(0);
      expect(await cache.get('negative')).toBe(-1);
      expect(await cache.get('float')).toBe(3.14);
    });

    it('should handle boolean values', async () => {
      // Act
      await cache.set('true', true, 60);
      await cache.set('false', false, 60);

      // Assert
      expect(await cache.get('true')).toBe(true);
      expect(await cache.get('false')).toBe(false);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent sets', async () => {
      // Act
      await Promise.all([
        cache.set('key1', 'value1', 60),
        cache.set('key2', 'value2', 60),
        cache.set('key3', 'value3', 60),
      ]);

      // Assert
      const stats = cache.getStats();
      expect(stats.size).toBe(3);
    });

    it('should handle concurrent gets', async () => {
      // Arrange
      await cache.set('key', 'value', 60);

      // Act
      const results = await Promise.all([cache.get('key'), cache.get('key'), cache.get('key')]);

      // Assert
      expect(results).toEqual(['value', 'value', 'value']);
    });
  });
});
