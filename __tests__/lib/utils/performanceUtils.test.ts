/**
 * Tests for Performance Utilities
 */

import {
  debounce,
  throttle,
  LRUCache,
  Lazy,
  BatchProcessor,
  memoize,
  once,
} from '@/lib/utils/performanceUtils';

jest.useFakeTimers();

describe('debounce', (): void => {
  it('should debounce function calls', (): void => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100);

    debounced();
    debounced();
    debounced();

    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should pass arguments correctly', (): void => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100);

    debounced('arg1', 'arg2');

    jest.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
  });
});

describe('throttle', (): void => {
  it('should throttle function calls', (): void => {
    const fn = jest.fn();
    const throttled = throttle(fn, 100);

    throttled();
    expect(fn).toHaveBeenCalledTimes(1);

    throttled();
    throttled();
    expect(fn).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(100);
    throttled();
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('LRUCache', (): void => {
  let cache: LRUCache<string, number>;

  beforeEach((): void => {
    cache = new LRUCache<string, number>(3);
  });

  it('should store and retrieve values', (): void => {
    cache.set('a', 1);
    cache.set('b', 2);

    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBe(2);
  });

  it('should evict least recently used items', (): void => {
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    cache.set('d', 4); // Should evict 'a'

    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBe(3);
    expect(cache.get('d')).toBe(4);
  });

  it('should update position on get', (): void => {
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);

    cache.get('a'); // Move 'a' to end

    cache.set('d', 4); // Should evict 'b', not 'a'

    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('c')).toBe(3);
    expect(cache.get('d')).toBe(4);
  });

  it('should track size correctly', (): void => {
    expect(cache.size).toBe(0);

    cache.set('a', 1);
    expect(cache.size).toBe(1);

    cache.set('b', 2);
    cache.set('c', 3);
    expect(cache.size).toBe(3);

    cache.set('d', 4);
    expect(cache.size).toBe(3);
  });
});

describe('Lazy', (): void => {
  it('should initialize value lazily', (): void => {
    const factory = jest.fn().mockReturnValue(42);
    const lazy = new Lazy(factory);

    expect(factory).not.toHaveBeenCalled();
    expect(lazy.isInitialized()).toBe(false);

    const value = lazy.get();
    expect(value).toBe(42);
    expect(factory).toHaveBeenCalledTimes(1);
    expect(lazy.isInitialized()).toBe(true);

    const value2 = lazy.get();
    expect(value2).toBe(42);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('should reset value', (): void => {
    const factory = jest.fn().mockReturnValue(42);
    const lazy = new Lazy(factory);

    lazy.get();
    expect(lazy.isInitialized()).toBe(true);

    lazy.reset();
    expect(lazy.isInitialized()).toBe(false);

    lazy.get();
    expect(factory).toHaveBeenCalledTimes(2);
  });
});

describe('BatchProcessor', (): void => {
  it('should batch items', async (): Promise<void> => {
    const processor = jest
      .fn()
      .mockImplementation(
        async (items: number[]): Promise<number[]> => items.map((x): number => x * 2)
      );

    const batcher = new BatchProcessor(processor, { batchSize: 3, batchDelay: 100 });

    const promises = [batcher.add(1), batcher.add(2), batcher.add(3)];

    const results = await Promise.all(promises);

    expect(results).toEqual([2, 4, 6]);
    expect(processor).toHaveBeenCalledTimes(1);
    expect(processor).toHaveBeenCalledWith([1, 2, 3]);
  });

  it('should flush on delay', async (): Promise<void> => {
    const processor = jest
      .fn()
      .mockImplementation(
        async (items: number[]): Promise<number[]> => items.map((x): number => x * 2)
      );

    const batcher = new BatchProcessor(processor, { batchSize: 10, batchDelay: 100 });

    const promise1 = batcher.add(1);
    const promise2 = batcher.add(2);

    expect(processor).not.toHaveBeenCalled();

    jest.advanceTimersByTime(100);

    const results = await Promise.all([promise1, promise2]);

    expect(results).toEqual([2, 4]);
    expect(processor).toHaveBeenCalledTimes(1);
  });

  it('should track pending count', (): void => {
    const processor = jest
      .fn()
      .mockImplementation(
        async (items: number[]): Promise<number[]> => items.map((x): number => x * 2)
      );

    const batcher = new BatchProcessor(processor, { batchSize: 10, batchDelay: 100 });

    expect(batcher.pendingCount).toBe(0);

    batcher.add(1);
    expect(batcher.pendingCount).toBe(1);

    batcher.add(2);
    expect(batcher.pendingCount).toBe(2);
  });
});

describe('memoize', (): void => {
  it('should memoize function results', (): void => {
    const fn = jest.fn().mockImplementation((x: number, y: number): number => x + y);
    const memoized = memoize(fn);

    expect(memoized(1, 2)).toBe(3);
    expect(fn).toHaveBeenCalledTimes(1);

    expect(memoized(1, 2)).toBe(3);
    expect(fn).toHaveBeenCalledTimes(1);

    expect(memoized(2, 3)).toBe(5);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should use custom key function', (): void => {
    const fn = jest.fn().mockImplementation((obj: { x: number }): number => obj.x * 2);
    const memoized = memoize(fn, {
      keyFn: (obj: { x: number }): string => `key:${obj.x}`,
    });

    expect(memoized({ x: 5 })).toBe(10);
    expect(fn).toHaveBeenCalledTimes(1);

    expect(memoized({ x: 5 })).toBe(10);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should respect max size', (): void => {
    const fn = jest.fn().mockImplementation((x: number): number => x * 2);
    const memoized = memoize(fn, { maxSize: 2 });

    memoized(1);
    memoized(2);
    memoized(3); // Should evict result for 1

    expect(fn).toHaveBeenCalledTimes(3);

    memoized(1); // Should call fn again
    expect(fn).toHaveBeenCalledTimes(4);

    memoized(2); // Should use cache
    expect(fn).toHaveBeenCalledTimes(4);
  });
});

describe('once', (): void => {
  it('should execute function only once', (): void => {
    const fn = jest.fn().mockReturnValue(42);
    const onceFn = once(fn);

    expect(onceFn()).toBe(42);
    expect(fn).toHaveBeenCalledTimes(1);

    expect(onceFn()).toBe(42);
    expect(fn).toHaveBeenCalledTimes(1);

    expect(onceFn()).toBe(42);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should pass arguments to first call', (): void => {
    const fn = jest.fn().mockImplementation((x: number): number => x * 2);
    const onceFn = once(fn);

    expect(onceFn(5)).toBe(10);
    expect(fn).toHaveBeenCalledWith(5);

    expect(onceFn(10)).toBe(10); // Still returns first result
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
