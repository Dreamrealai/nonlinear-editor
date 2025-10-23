/**
 * Comprehensive tests for array utility functions
 */

import {
  safeArrayGet,
  safeArrayGetWithDefault,
  safeArrayFirst,
  safeArrayLast,
  isValidArrayIndex,
  safeArraySlice,
  safeArrayFind,
  safeArrayMax,
  safeArrayMin,
} from '@/lib/utils/arrayUtils';

describe('Array Utility Functions', () => {
  describe('safeArrayGet', () => {
    const testArray = [1, 2, 3, 4, 5];

    it('should return element at valid index', () => {
      expect(safeArrayGet(testArray, 0)).toBe(1);
      expect(safeArrayGet(testArray, 2)).toBe(3);
      expect(safeArrayGet(testArray, 4)).toBe(5);
    });

    it('should return undefined for negative index', () => {
      expect(safeArrayGet(testArray, -1)).toBeUndefined();
      expect(safeArrayGet(testArray, -10)).toBeUndefined();
    });

    it('should return undefined for index out of bounds', () => {
      expect(safeArrayGet(testArray, 5)).toBeUndefined();
      expect(safeArrayGet(testArray, 100)).toBeUndefined();
    });

    it('should return undefined for non-integer index', () => {
      expect(safeArrayGet(testArray, 1.5)).toBeUndefined();
      expect(safeArrayGet(testArray, NaN)).toBeUndefined();
      expect(safeArrayGet(testArray, Infinity)).toBeUndefined();
    });

    it('should return undefined for non-array input', () => {
      expect(safeArrayGet(null as any, 0)).toBeUndefined();
      expect(safeArrayGet(undefined as any, 0)).toBeUndefined();
      expect(safeArrayGet('string' as any, 0)).toBeUndefined();
      expect(safeArrayGet(123 as any, 0)).toBeUndefined();
    });

    it('should handle empty array', () => {
      expect(safeArrayGet([], 0)).toBeUndefined();
    });

    it('should work with readonly arrays', () => {
      const readonlyArray: readonly number[] = [1, 2, 3];
      expect(safeArrayGet(readonlyArray, 1)).toBe(2);
    });
  });

  describe('safeArrayGetWithDefault', () => {
    const testArray = [10, 20, 30];

    it('should return element at valid index', () => {
      expect(safeArrayGetWithDefault(testArray, 0, -1)).toBe(10);
      expect(safeArrayGetWithDefault(testArray, 1, -1)).toBe(20);
    });

    it('should return default for invalid index', () => {
      expect(safeArrayGetWithDefault(testArray, -1, 999)).toBe(999);
      expect(safeArrayGetWithDefault(testArray, 10, 999)).toBe(999);
    });

    it('should handle different default types', () => {
      expect(safeArrayGetWithDefault([], 0, 'default')).toBe('default');
      expect(safeArrayGetWithDefault([], 0, null)).toBe(null);
      expect(safeArrayGetWithDefault([], 0, false)).toBe(false);
    });
  });

  describe('safeArrayFirst', () => {
    it('should return first element of array', () => {
      expect(safeArrayFirst([1, 2, 3])).toBe(1);
      expect(safeArrayFirst(['a', 'b', 'c'])).toBe('a');
    });

    it('should return undefined for empty array', () => {
      expect(safeArrayFirst([])).toBeUndefined();
    });

    it('should return undefined for non-array', () => {
      expect(safeArrayFirst(null as any)).toBeUndefined();
      expect(safeArrayFirst(undefined as any)).toBeUndefined();
    });

    it('should handle single-element array', () => {
      expect(safeArrayFirst([42])).toBe(42);
    });

    it('should work with readonly arrays', () => {
      const readonlyArray: readonly string[] = ['first', 'second'];
      expect(safeArrayFirst(readonlyArray)).toBe('first');
    });
  });

  describe('safeArrayLast', () => {
    it('should return last element of array', () => {
      expect(safeArrayLast([1, 2, 3])).toBe(3);
      expect(safeArrayLast(['a', 'b', 'c'])).toBe('c');
    });

    it('should return undefined for empty array', () => {
      expect(safeArrayLast([])).toBeUndefined();
    });

    it('should return undefined for non-array', () => {
      expect(safeArrayLast(null as any)).toBeUndefined();
      expect(safeArrayLast(undefined as any)).toBeUndefined();
    });

    it('should handle single-element array', () => {
      expect(safeArrayLast([42])).toBe(42);
    });

    it('should work with readonly arrays', () => {
      const readonlyArray: readonly string[] = ['first', 'last'];
      expect(safeArrayLast(readonlyArray)).toBe('last');
    });
  });

  describe('isValidArrayIndex', () => {
    const testArray = [1, 2, 3];

    it('should return true for valid indices', () => {
      expect(isValidArrayIndex(testArray, 0)).toBe(true);
      expect(isValidArrayIndex(testArray, 1)).toBe(true);
      expect(isValidArrayIndex(testArray, 2)).toBe(true);
    });

    it('should return false for negative indices', () => {
      expect(isValidArrayIndex(testArray, -1)).toBe(false);
      expect(isValidArrayIndex(testArray, -10)).toBe(false);
    });

    it('should return false for out-of-bounds indices', () => {
      expect(isValidArrayIndex(testArray, 3)).toBe(false);
      expect(isValidArrayIndex(testArray, 100)).toBe(false);
    });

    it('should return false for non-integer indices', () => {
      expect(isValidArrayIndex(testArray, 1.5)).toBe(false);
      expect(isValidArrayIndex(testArray, NaN)).toBe(false);
      expect(isValidArrayIndex(testArray, Infinity)).toBe(false);
    });

    it('should return false for non-array input', () => {
      expect(isValidArrayIndex(null as any, 0)).toBe(false);
      expect(isValidArrayIndex(undefined as any, 0)).toBe(false);
    });

    it('should handle empty array', () => {
      expect(isValidArrayIndex([], 0)).toBe(false);
    });
  });

  describe('safeArraySlice', () => {
    const testArray = [1, 2, 3, 4, 5];

    it('should slice array with valid range', () => {
      expect(safeArraySlice(testArray, 1, 3)).toEqual([2, 3]);
      expect(safeArraySlice(testArray, 0, 2)).toEqual([1, 2]);
    });

    it('should clamp negative start to 0', () => {
      expect(safeArraySlice(testArray, -10, 3)).toEqual([1, 2, 3]);
    });

    it('should clamp end beyond array length', () => {
      expect(safeArraySlice(testArray, 2, 100)).toEqual([3, 4, 5]);
    });

    it('should handle start > end', () => {
      expect(safeArraySlice(testArray, 3, 1)).toEqual([]);
    });

    it('should use array length as default end', () => {
      expect(safeArraySlice(testArray, 2)).toEqual([3, 4, 5]);
      expect(safeArraySlice(testArray)).toEqual([1, 2, 3, 4, 5]);
    });

    it('should return empty array for non-array input', () => {
      expect(safeArraySlice(null as any, 0, 1)).toEqual([]);
      expect(safeArraySlice(undefined as any, 0, 1)).toEqual([]);
    });

    it('should handle empty array', () => {
      expect(safeArraySlice([], 0, 5)).toEqual([]);
    });

    it('should work with readonly arrays', () => {
      const readonlyArray: readonly number[] = [10, 20, 30, 40];
      expect(safeArraySlice(readonlyArray, 1, 3)).toEqual([20, 30]);
    });
  });

  describe('safeArrayFind', () => {
    const testArray = [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
      { id: 3, name: 'Charlie' },
    ];

    it('should find element matching predicate', () => {
      const result = safeArrayFind(testArray, (item) => item.id === 2);
      expect(result).toEqual({ id: 2, name: 'Bob' });
    });

    it('should return undefined when no match found', () => {
      const result = safeArrayFind(testArray, (item) => item.id === 999);
      expect(result).toBeUndefined();
    });

    it('should return undefined for empty array', () => {
      const result = safeArrayFind([], (item) => true);
      expect(result).toBeUndefined();
    });

    it('should return undefined for non-array', () => {
      const result = safeArrayFind(null as any, (item) => true);
      expect(result).toBeUndefined();
    });

    it('should return first matching element', () => {
      const duplicates = [1, 2, 2, 3];
      const result = safeArrayFind(duplicates, (item) => item === 2);
      expect(result).toBe(2);
    });

    it('should pass index and array to predicate', () => {
      const predicate = jest.fn(() => false);
      safeArrayFind([10, 20], predicate);

      expect(predicate).toHaveBeenCalledWith(10, 0, [10, 20]);
      expect(predicate).toHaveBeenCalledWith(20, 1, [10, 20]);
    });
  });

  describe('safeArrayMax', () => {
    it('should return maximum value from array', () => {
      expect(safeArrayMax([1, 5, 3, 9, 2])).toBe(9);
      expect(safeArrayMax([10])).toBe(10);
    });

    it('should return default value for empty array', () => {
      expect(safeArrayMax([])).toBe(0);
      expect(safeArrayMax([], 100)).toBe(100);
    });

    it('should return default for non-array', () => {
      expect(safeArrayMax(null as any)).toBe(0);
      expect(safeArrayMax(undefined as any, -1)).toBe(-1);
    });

    it('should handle negative numbers', () => {
      expect(safeArrayMax([-1, -5, -3])).toBe(-1);
    });

    it('should filter out non-finite numbers', () => {
      expect(safeArrayMax([1, NaN, 5, Infinity, 3])).toBe(5);
    });

    it('should return default when no valid numbers', () => {
      expect(safeArrayMax([NaN, Infinity, -Infinity])).toBe(0);
      expect(safeArrayMax([NaN, Infinity], 999)).toBe(999);
    });

    it('should handle arrays with non-numbers', () => {
      expect(safeArrayMax(['1' as any, 2, '3' as any, 4])).toBe(4);
    });

    it('should handle zero', () => {
      expect(safeArrayMax([0, -5, -10])).toBe(0);
    });
  });

  describe('safeArrayMin', () => {
    it('should return minimum value from array', () => {
      expect(safeArrayMin([1, 5, 3, 9, 2])).toBe(1);
      expect(safeArrayMin([10])).toBe(10);
    });

    it('should return default value for empty array', () => {
      expect(safeArrayMin([])).toBe(0);
      expect(safeArrayMin([], 100)).toBe(100);
    });

    it('should return default for non-array', () => {
      expect(safeArrayMin(null as any)).toBe(0);
      expect(safeArrayMin(undefined as any, -1)).toBe(-1);
    });

    it('should handle negative numbers', () => {
      expect(safeArrayMin([-1, -5, -3])).toBe(-5);
    });

    it('should filter out non-finite numbers', () => {
      expect(safeArrayMin([10, NaN, 5, Infinity, 3])).toBe(3);
    });

    it('should return default when no valid numbers', () => {
      expect(safeArrayMin([NaN, Infinity, -Infinity])).toBe(0);
      expect(safeArrayMin([NaN, Infinity], 999)).toBe(999);
    });

    it('should handle arrays with non-numbers', () => {
      expect(safeArrayMin(['10' as any, 2, '3' as any, 4])).toBe(2);
    });

    it('should handle zero', () => {
      expect(safeArrayMin([0, 5, 10])).toBe(0);
    });
  });

  describe('Edge cases and type safety', () => {
    it('should handle arrays of different types', () => {
      expect(safeArrayFirst<string>(['a', 'b'])).toBe('a');
      expect(safeArrayLast<number>([1, 2, 3])).toBe(3);
      expect(safeArrayGet<boolean>([true, false], 0)).toBe(true);
    });

    it('should preserve undefined in arrays', () => {
      const arrayWithUndefined = [1, undefined, 3];
      expect(safeArrayGet(arrayWithUndefined, 1)).toBeUndefined();
      // But should distinguish from out-of-bounds
      expect(safeArrayGet(arrayWithUndefined, 5)).toBeUndefined();
    });

    it('should handle arrays with null values', () => {
      const arrayWithNull = [null, 1, 2];
      expect(safeArrayFirst(arrayWithNull)).toBeNull();
    });
  });
});
