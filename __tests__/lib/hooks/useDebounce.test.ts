/**
 * Comprehensive tests for useDebounce hooks
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useDebounce, useDebouncedCallback } from '@/lib/hooks/useDebounce';

describe('useDebounce', () => {
  beforeEach((): void => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  afterEach((): void => {
    jest.clearAllMocks();
  });

  describe('Basic Debouncing', () => {
    it('should return initial value immediately', () => {
      const { result } = renderHook(() => useDebounce('initial', 300));
      expect(result.current).toBe('initial');
    });

    it('should debounce value changes', async () => {
      jest.useFakeTimers();
      const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
        initialProps: { value: 'initial', delay: 300 },
      });

      expect(result.current).toBe('initial');

      // Change value
      rerender({ value: 'updated', delay: 300 });

      // Value should not update immediately
      expect(result.current).toBe('initial');

      // Advance time by less than delay
      act(() => {
        jest.advanceTimersByTime(200);
      });

      // Should still be initial value
      expect(result.current).toBe('initial');

      // Advance past delay
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Should now be updated
      expect(result.current).toBe('updated');

      jest.useRealTimers();
    });

    it('should use default delay of 300ms', async () => {
      jest.useFakeTimers();
      const { result, rerender } = renderHook(({ value }) => useDebounce(value), {
        initialProps: { value: 'initial' },
      });

      rerender({ value: 'updated' });

      // Should not update before 300ms
      act(() => {
        jest.advanceTimersByTime(299);
      });
      expect(result.current).toBe('initial');

      // Should update at 300ms
      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(result.current).toBe('updated');

      jest.useRealTimers();
    });
  });

  describe('Multiple Rapid Changes', () => {
    it('should only execute once for multiple rapid changes', async () => {
      jest.useFakeTimers();
      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
        initialProps: { value: 'value1' },
      });

      // Rapid changes
      rerender({ value: 'value2' });
      act(() => {
        jest.advanceTimersByTime(100);
      });

      rerender({ value: 'value3' });
      act(() => {
        jest.advanceTimersByTime(100);
      });

      rerender({ value: 'value4' });
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Should still be initial value (timers keep resetting)
      expect(result.current).toBe('value1');

      // Wait for full delay after last change
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Should now be the last value
      expect(result.current).toBe('value4');

      jest.useRealTimers();
    });

    it('should reset timer on each value change', async () => {
      jest.useFakeTimers();
      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 500), {
        initialProps: { value: 'initial' },
      });

      // First change
      rerender({ value: 'change1' });
      act(() => {
        jest.advanceTimersByTime(400);
      });

      // Second change before first completes
      rerender({ value: 'change2' });
      act(() => {
        jest.advanceTimersByTime(400);
      });

      // Should still be initial (timer was reset)
      expect(result.current).toBe('initial');

      // Complete the delay
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Should be the last value
      expect(result.current).toBe('change2');

      jest.useRealTimers();
    });
  });

  describe('Delay Changes', () => {
    it('should handle changing delay', async () => {
      jest.useFakeTimers();
      const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
        initialProps: { value: 'initial', delay: 300 },
      });

      // Change value with 300ms delay
      rerender({ value: 'updated', delay: 300 });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(result.current).toBe('updated');

      // Change value with 500ms delay
      rerender({ value: 'updated2', delay: 500 });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Should not update yet (need 500ms total)
      expect(result.current).toBe('updated');

      act(() => {
        jest.advanceTimersByTime(200);
      });

      // Should now be updated
      expect(result.current).toBe('updated2');

      jest.useRealTimers();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup timeout on unmount', async () => {
      jest.useFakeTimers();
      const { result, rerender, unmount } = renderHook(({ value }) => useDebounce(value, 300), {
        initialProps: { value: 'initial' },
      });

      rerender({ value: 'updated' });

      // Unmount before delay completes
      unmount();

      // Advance time
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Value should not have updated (component was unmounted)
      expect(result.current).toBe('initial');

      jest.useRealTimers();
    });

    it('should cleanup timeout when value changes', async () => {
      jest.useFakeTimers();
      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
        initialProps: { value: 'initial' },
      });

      rerender({ value: 'change1' });

      // Change again before first completes
      rerender({ value: 'change2' });

      // Advance full delay
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Should only have last value, not intermediate
      expect(result.current).toBe('change2');

      jest.useRealTimers();
    });
  });

  describe('Different Value Types', () => {
    it('should work with numbers', async () => {
      jest.useFakeTimers();
      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
        initialProps: { value: 0 },
      });

      rerender({ value: 42 });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(result.current).toBe(42);

      jest.useRealTimers();
    });

    it('should work with objects', async () => {
      jest.useFakeTimers();
      const initialObj = { name: 'John', age: 30 };
      const updatedObj = { name: 'Jane', age: 25 };

      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
        initialProps: { value: initialObj },
      });

      rerender({ value: updatedObj });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(result.current).toBe(updatedObj);

      jest.useRealTimers();
    });

    it('should work with arrays', async () => {
      jest.useFakeTimers();
      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
        initialProps: { value: [1, 2, 3] },
      });

      rerender({ value: [4, 5, 6] });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(result.current).toEqual([4, 5, 6]);

      jest.useRealTimers();
    });

    it('should work with boolean values', async () => {
      jest.useFakeTimers();
      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
        initialProps: { value: false },
      });

      rerender({ value: true });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(result.current).toBe(true);

      jest.useRealTimers();
    });
  });
});

describe('useDebouncedCallback', () => {
  beforeEach((): void => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  afterEach((): void => {
    jest.clearAllMocks();
  });

  describe('Basic Debouncing', () => {
    it('should debounce callback execution', async () => {
      jest.useFakeTimers();
      const callback = jest.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, 300));

      // Call the debounced function
      act(() => {
        result.current('test');
      });

      // Should not execute immediately
      expect(callback).not.toHaveBeenCalled();

      // Advance time
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Should now be called
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('test');

      jest.useRealTimers();
    });

    it('should use default delay of 300ms', async () => {
      jest.useFakeTimers();
      const callback = jest.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback));

      act(() => {
        result.current();
      });

      // Should not execute before 300ms
      act(() => {
        jest.advanceTimersByTime(299);
      });
      expect(callback).not.toHaveBeenCalled();

      // Should execute at 300ms
      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(callback).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });
  });

  describe('Multiple Rapid Calls', () => {
    it('should only execute once for multiple rapid calls', async () => {
      jest.useFakeTimers();
      const callback = jest.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, 300));

      // Rapid calls
      act(() => {
        result.current('call1');
      });

      act(() => {
        jest.advanceTimersByTime(100);
      });

      act(() => {
        result.current('call2');
      });

      act(() => {
        jest.advanceTimersByTime(100);
      });

      act(() => {
        result.current('call3');
      });

      // Should not have executed yet
      expect(callback).not.toHaveBeenCalled();

      // Complete delay after last call
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Should only execute once with last arguments
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('call3');

      jest.useRealTimers();
    });

    it('should cancel previous timeout on new call', async () => {
      jest.useFakeTimers();
      const callback = jest.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, 500));

      act(() => {
        result.current('first');
      });

      act(() => {
        jest.advanceTimersByTime(400);
      });

      // Call again before first completes
      act(() => {
        result.current('second');
      });

      // First should be canceled
      act(() => {
        jest.advanceTimersByTime(100);
      });
      expect(callback).not.toHaveBeenCalled();

      // Complete second call
      act(() => {
        jest.advanceTimersByTime(400);
      });
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('second');

      jest.useRealTimers();
    });
  });

  describe('Function Arguments', () => {
    it('should pass arguments to callback', async () => {
      jest.useFakeTimers();
      const callback = jest.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, 300));

      act(() => {
        result.current('arg1', 'arg2', 42);
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(callback).toHaveBeenCalledWith('arg1', 'arg2', 42);

      jest.useRealTimers();
    });

    it('should handle callbacks with no arguments', async () => {
      jest.useFakeTimers();
      const callback = jest.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, 300));

      act(() => {
        result.current();
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith();

      jest.useRealTimers();
    });

    it('should handle callbacks with complex arguments', async () => {
      jest.useFakeTimers();
      const callback = jest.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, 300));

      const complexArg = { user: { name: 'John', settings: [1, 2, 3] } };

      act(() => {
        result.current(complexArg);
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(callback).toHaveBeenCalledWith(complexArg);

      jest.useRealTimers();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup timeout on unmount', async () => {
      jest.useFakeTimers();
      const callback = jest.fn();
      const { result, unmount } = renderHook(() => useDebouncedCallback(callback, 300));

      act(() => {
        result.current('test');
      });

      // Unmount before delay completes
      unmount();

      // Advance time
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Should not execute after unmount
      expect(callback).not.toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('should cleanup old timeout when new call is made', async () => {
      jest.useFakeTimers();
      const callback = jest.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, 300));

      act(() => {
        result.current('first');
      });

      act(() => {
        jest.advanceTimersByTime(200);
      });

      // Make another call (should cleanup first timeout)
      act(() => {
        result.current('second');
      });

      // Advance past first call's original completion time
      act(() => {
        jest.advanceTimersByTime(200);
      });

      // Should not have executed yet (timer was reset)
      expect(callback).not.toHaveBeenCalled();

      // Complete second call
      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('second');

      jest.useRealTimers();
    });
  });

  describe('Delay Changes', () => {
    it('should handle changing delay', async () => {
      jest.useFakeTimers();
      const callback = jest.fn();
      const { result, rerender } = renderHook(
        ({ delay }) => useDebouncedCallback(callback, delay),
        { initialProps: { delay: 300 } }
      );

      act(() => {
        result.current('test1');
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(callback).toHaveBeenCalledWith('test1');
      callback.mockClear();

      // Change delay
      rerender({ delay: 500 });

      act(() => {
        result.current('test2');
      });

      // Should not execute at 300ms
      act(() => {
        jest.advanceTimersByTime(300);
      });
      expect(callback).not.toHaveBeenCalled();

      // Should execute at 500ms
      act(() => {
        jest.advanceTimersByTime(200);
      });
      expect(callback).toHaveBeenCalledWith('test2');

      jest.useRealTimers();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero delay', async () => {
      jest.useFakeTimers();
      const callback = jest.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, 0));

      act(() => {
        result.current('test');
      });

      act(() => {
        jest.advanceTimersByTime(0);
      });

      expect(callback).toHaveBeenCalledWith('test');

      jest.useRealTimers();
    });

    it('should handle very large delays', async () => {
      jest.useFakeTimers();
      const callback = jest.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, 10000));

      act(() => {
        result.current('test');
      });

      act(() => {
        jest.advanceTimersByTime(9999);
      });
      expect(callback).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(callback).toHaveBeenCalledWith('test');

      jest.useRealTimers();
    });
  });
});
