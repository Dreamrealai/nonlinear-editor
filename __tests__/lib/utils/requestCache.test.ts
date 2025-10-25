/**
 * Tests for RequestCache utility
 */

import { RequestCache, createCacheKey, cached } from '@/lib/utils/requestCache';

describe('RequestCache', (): void => {
  let cache: RequestCache<string>;

  beforeEach((): void => {
    cache = new RequestCache<string>({ ttl: 1000, maxSize: 3 });
  });

  describe('get and set', (): void => {
    it('should store and retrieve values', (): void => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return null for missing keys', (): void => {
      expect(cache.get('nonexistent')).toBeNull();
    });

    it('should expire old entries', async (): Promise<void> => {
      cache.set('key1', 'value1', 100);
      expect(cache.get('key1')).toBe('value1');

      await new Promise((resolve): NodeJS.Timeout => setTimeout(resolve, 150));
      expect(cache.get('key1')).toBeNull();
    });

    it('should enforce max size', (): void => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.set('key4', 'value4');

      expect(cache.size()).toBe(3);
      expect(cache.get('key1')).toBeNull(); // Oldest should be evicted
      expect(cache.get('key4')).toBe('value4');
    });
  });

  describe('fetch', (): void => {
    it('should fetch and cache results', async (): Promise<void> => {
      const fetcher = jest.fn().mockResolvedValue('fetched-value');

      const result = await cache.fetch('key1', fetcher);
      expect(result).toBe('fetched-value');
      expect(fetcher).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result2 = await cache.fetch('key1', fetcher);
      expect(result2).toBe('fetched-value');
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('should deduplicate concurrent requests', async (): Promise<void> => {
      let resolveCount = 0;
      const fetcher = jest.fn().mockImplementation(
        (): Promise<string> =>
          new Promise((resolve): void => {
            setTimeout((): void => {
              resolveCount++;
              resolve('fetched-value');
            }, 100);
          })
      );

      // Start multiple concurrent requests
      const promises = [
        cache.fetch('key1', fetcher),
        cache.fetch('key1', fetcher),
        cache.fetch('key1', fetcher),
      ];

      const results = await Promise.all(promises);

      expect(results).toEqual(['fetched-value', 'fetched-value', 'fetched-value']);
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(resolveCount).toBe(1);
    });

    it('should handle errors', async (): Promise<void> => {
      const fetcher = jest.fn().mockRejectedValue(new Error('Fetch failed'));

      await expect(cache.fetch('key1', fetcher)).rejects.toThrow('Fetch failed');
      expect(cache.get('key1')).toBeNull();
    });
  });

  describe('invalidate', (): void => {
    it('should invalidate single entries', (): void => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      cache.invalidate('key1');

      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBe('value2');
    });

    it('should invalidate by pattern', (): void => {
      cache.set('user:1', 'user1');
      cache.set('user:2', 'user2');
      cache.set('project:1', 'project1');

      cache.invalidatePattern(/^user:/);

      expect(cache.get('user:1')).toBeNull();
      expect(cache.get('user:2')).toBeNull();
      expect(cache.get('project:1')).toBe('project1');
    });

    it('should clear all entries', (): void => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      cache.clear();

      expect(cache.size()).toBe(0);
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
    });
  });

  describe('stats', (): void => {
    it('should provide cache statistics', (): void => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      const stats = cache.stats();

      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(3);
      expect(stats.entries).toHaveLength(2);
      expect(stats.entries[0]?.key).toBe('key1');
    });
  });
});

describe('createCacheKey', (): void => {
  it('should create cache keys from parts', (): void => {
    expect(createCacheKey('user', 123, 'profile')).toBe('user:123:profile');
    expect(createCacheKey('project', 'abc')).toBe('project:abc');
  });

  it('should filter out null and undefined', (): void => {
    expect(createCacheKey('user', null, 123, undefined, 'profile')).toBe('user:123:profile');
  });
});

describe('cached decorator', (): void => {
  it('should cache function results', async (): Promise<void> => {
    const cache = new RequestCache<number>({ ttl: 1000 });
    const fn = jest.fn().mockImplementation(async (x: number): Promise<number> => x * 2);

    const cachedFn = cached(cache, (x: number): string => `result:${x}`)(fn);

    const result1 = await cachedFn(5);
    expect(result1).toBe(10);
    expect(fn).toHaveBeenCalledTimes(1);

    const result2 = await cachedFn(5);
    expect(result2).toBe(10);
    expect(fn).toHaveBeenCalledTimes(1);

    const result3 = await cachedFn(10);
    expect(result3).toBe(20);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
