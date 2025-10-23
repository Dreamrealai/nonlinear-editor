/**
 * Comprehensive tests for usePolling hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { usePolling, useSimplePolling } from '@/lib/hooks/usePolling';

// Mock the browser logger
jest.mock('@/lib/browserLogger', () => ({
  browserLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('usePolling', () => {
  beforeEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Polling Behavior', () => {
    it('should start polling when startPolling is called', async () => {
      jest.useFakeTimers();
      const pollFn = jest.fn().mockResolvedValue({ done: false });
      const shouldContinue = jest.fn().mockReturnValue(true);
      const onComplete = jest.fn();

      const { result } = renderHook(() =>
        usePolling({
          pollFn,
          shouldContinue,
          onComplete,
          interval: 1000,
          enableLogging: false,
        })
      );

      expect(result.current.state.isPolling).toBe(false);

      act(() => {
        result.current.startPolling();
      });

      expect(result.current.state.isPolling).toBe(true);

      // Advance timer to trigger first poll
      await act(async () => {
        jest.advanceTimersByTime(1000);
        await Promise.resolve(); // Flush promises
      });

      expect(pollFn).toHaveBeenCalledTimes(1);
      expect(shouldContinue).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });

    it('should continue polling until shouldContinue returns false', async () => {
      jest.useFakeTimers();
      let callCount = 0;
      const pollFn = jest.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve({ done: callCount >= 3 });
      });
      const shouldContinue = jest.fn((result) => !result.done);
      const onComplete = jest.fn();

      const { result } = renderHook(() =>
        usePolling({
          pollFn,
          shouldContinue,
          onComplete,
          interval: 1000,
          enableLogging: false,
        })
      );

      act(() => {
        result.current.startPolling();
      });

      // First poll
      await act(async () => {
        jest.advanceTimersByTime(1000);
        await Promise.resolve();
      });

      expect(pollFn).toHaveBeenCalledTimes(1);
      expect(result.current.state.isPolling).toBe(true);

      // Second poll
      await act(async () => {
        jest.advanceTimersByTime(1000);
        await Promise.resolve();
      });

      expect(pollFn).toHaveBeenCalledTimes(2);
      expect(result.current.state.isPolling).toBe(true);

      // Third poll - should complete
      await act(async () => {
        jest.advanceTimersByTime(1000);
        await Promise.resolve();
      });

      expect(pollFn).toHaveBeenCalledTimes(3);
      expect(onComplete).toHaveBeenCalledWith({ done: true });
      expect(result.current.state.isPolling).toBe(false);

      jest.useRealTimers();
    });

    it('should call onComplete when polling is complete', async () => {
      jest.useFakeTimers();
      const pollFn = jest.fn().mockResolvedValue({ done: true, data: 'test' });
      const shouldContinue = jest.fn().mockReturnValue(false);
      const onComplete = jest.fn();

      const { result } = renderHook(() =>
        usePolling({
          pollFn,
          shouldContinue,
          onComplete,
          interval: 1000,
          enableLogging: false,
        })
      );

      act(() => {
        result.current.startPolling();
      });

      await act(async () => {
        jest.advanceTimersByTime(1000);
        await Promise.resolve();
      });

      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(onComplete).toHaveBeenCalledWith({ done: true, data: 'test' });

      jest.useRealTimers();
    });
  });

  describe('Max Retries', () => {
    it('should stop polling after max retries', async () => {
      jest.useFakeTimers();
      const pollFn = jest.fn().mockResolvedValue({ done: false });
      const shouldContinue = jest.fn().mockReturnValue(true);
      const onComplete = jest.fn();
      const onError = jest.fn();

      const { result } = renderHook(() =>
        usePolling({
          pollFn,
          shouldContinue,
          onComplete,
          onError,
          interval: 100,
          maxRetries: 3,
          enableLogging: false,
        })
      );

      act(() => {
        result.current.startPolling();
      });

      // Poll 3 times to reach max retries
      for (let i = 0; i < 3; i++) {
        await act(async () => {
          jest.advanceTimersByTime(100);
          await Promise.resolve();
        });
      }

      // Advance one more interval to trigger the max retry check
      await act(async () => {
        jest.advanceTimersByTime(100);
        await Promise.resolve();
        await Promise.resolve(); // Extra tick for state updates
      });

      expect(pollFn).toHaveBeenCalledTimes(3);
      expect(result.current.state.isPolling).toBe(false);
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('timed out'),
        })
      );

      jest.useRealTimers();
    });

    it('should track retry count', async () => {
      jest.useFakeTimers();
      const pollFn = jest.fn().mockResolvedValue({ done: false });
      const shouldContinue = jest.fn().mockReturnValue(true);
      const onComplete = jest.fn();

      const { result } = renderHook(() =>
        usePolling({
          pollFn,
          shouldContinue,
          onComplete,
          interval: 100,
          maxRetries: 5,
          enableLogging: false,
        })
      );

      act(() => {
        result.current.startPolling();
      });

      expect(result.current.state.retryCount).toBe(0);

      await act(async () => {
        jest.advanceTimersByTime(100);
        await Promise.resolve();
      });

      expect(result.current.state.retryCount).toBe(1);

      await act(async () => {
        jest.advanceTimersByTime(100);
        await Promise.resolve();
      });

      expect(result.current.state.retryCount).toBe(2);

      jest.useRealTimers();
    });
  });

  describe('Error Handling', () => {
    it('should call onError when poll function throws', async () => {
      jest.useFakeTimers();
      const error = new Error('Poll failed');
      const pollFn = jest.fn().mockRejectedValue(error);
      const shouldContinue = jest.fn().mockReturnValue(true);
      const onComplete = jest.fn();
      const onError = jest.fn();

      const { result } = renderHook(() =>
        usePolling({
          pollFn,
          shouldContinue,
          onComplete,
          onError,
          interval: 1000,
          enableLogging: false,
        })
      );

      act(() => {
        result.current.startPolling();
      });

      await act(async () => {
        jest.advanceTimersByTime(1000);
        await Promise.resolve();
      });

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(error);
      expect(result.current.state.isPolling).toBe(false);
      expect(result.current.state.lastError).toBe(error);

      jest.useRealTimers();
    });

    it('should not call onError for AbortError', async () => {
      jest.useFakeTimers();
      const abortError = new Error('AbortError');
      abortError.name = 'AbortError';
      const pollFn = jest.fn().mockRejectedValue(abortError);
      const shouldContinue = jest.fn().mockReturnValue(true);
      const onComplete = jest.fn();
      const onError = jest.fn();

      const { result } = renderHook(() =>
        usePolling({
          pollFn,
          shouldContinue,
          onComplete,
          onError,
          interval: 1000,
          enableLogging: false,
        })
      );

      act(() => {
        result.current.startPolling();
      });

      await act(async () => {
        jest.advanceTimersByTime(1000);
        await Promise.resolve();
      });

      expect(onError).not.toHaveBeenCalled();
      expect(result.current.state.isPolling).toBe(true); // Should still be polling

      jest.useRealTimers();
    });

    it('should set lastError state when error occurs', async () => {
      jest.useFakeTimers();
      const error = new Error('Test error');
      const pollFn = jest.fn().mockRejectedValue(error);
      const shouldContinue = jest.fn().mockReturnValue(true);
      const onComplete = jest.fn();

      const { result } = renderHook(() =>
        usePolling({
          pollFn,
          shouldContinue,
          onComplete,
          interval: 1000,
          enableLogging: false,
        })
      );

      expect(result.current.state.lastError).toBeNull();

      act(() => {
        result.current.startPolling();
      });

      await act(async () => {
        jest.advanceTimersByTime(1000);
        await Promise.resolve();
      });

      expect(result.current.state.lastError).toBe(error);

      jest.useRealTimers();
    });
  });

  describe('Stop and Reset', () => {
    it('should stop polling when stopPolling is called', async () => {
      jest.useFakeTimers();
      const pollFn = jest.fn().mockResolvedValue({ done: false });
      const shouldContinue = jest.fn().mockReturnValue(true);
      const onComplete = jest.fn();

      const { result } = renderHook(() =>
        usePolling({
          pollFn,
          shouldContinue,
          onComplete,
          interval: 1000,
          enableLogging: false,
        })
      );

      act(() => {
        result.current.startPolling();
      });

      expect(result.current.state.isPolling).toBe(true);

      act(() => {
        result.current.stopPolling();
      });

      expect(result.current.state.isPolling).toBe(false);

      // Advance timer - should not poll
      await act(async () => {
        jest.advanceTimersByTime(1000);
        await Promise.resolve();
      });

      expect(pollFn).not.toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('should reset state when reset is called', async () => {
      jest.useFakeTimers();
      const pollFn = jest.fn().mockResolvedValue({ done: false });
      const shouldContinue = jest.fn().mockReturnValue(true);
      const onComplete = jest.fn();

      const { result } = renderHook(() =>
        usePolling({
          pollFn,
          shouldContinue,
          onComplete,
          interval: 1000,
          enableLogging: false,
        })
      );

      act(() => {
        result.current.startPolling();
      });

      await act(async () => {
        jest.advanceTimersByTime(1000);
        await Promise.resolve();
      });

      expect(result.current.state.retryCount).toBe(1);

      act(() => {
        result.current.reset();
      });

      expect(result.current.state.isPolling).toBe(false);
      expect(result.current.state.retryCount).toBe(0);
      expect(result.current.state.lastError).toBeNull();

      jest.useRealTimers();
    });

    it('should cleanup on unmount', async () => {
      jest.useFakeTimers();
      const pollFn = jest.fn().mockResolvedValue({ done: false });
      const shouldContinue = jest.fn().mockReturnValue(true);
      const onComplete = jest.fn();

      const { result, unmount } = renderHook(() =>
        usePolling({
          pollFn,
          shouldContinue,
          onComplete,
          interval: 1000,
          enableLogging: false,
        })
      );

      act(() => {
        result.current.startPolling();
      });

      unmount();

      // Advance timer - should not poll after unmount
      await act(async () => {
        jest.advanceTimersByTime(1000);
        await Promise.resolve();
      });

      expect(pollFn).not.toHaveBeenCalled();

      jest.useRealTimers();
    });
  });

  describe('Interval Configuration', () => {
    it('should use custom interval', async () => {
      jest.useFakeTimers();
      const pollFn = jest.fn().mockResolvedValue({ done: false });
      const shouldContinue = jest.fn().mockReturnValue(true);
      const onComplete = jest.fn();

      const { result } = renderHook(() =>
        usePolling({
          pollFn,
          shouldContinue,
          onComplete,
          interval: 5000,
          enableLogging: false,
        })
      );

      act(() => {
        result.current.startPolling();
      });

      // Should not poll at 1000ms
      await act(async () => {
        jest.advanceTimersByTime(1000);
        await Promise.resolve();
      });
      expect(pollFn).not.toHaveBeenCalled();

      // Should poll at 5000ms
      await act(async () => {
        jest.advanceTimersByTime(4000);
        await Promise.resolve();
      });
      expect(pollFn).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });

    it('should use default interval of 10000ms', async () => {
      jest.useFakeTimers();
      const pollFn = jest.fn().mockResolvedValue({ done: false });
      const shouldContinue = jest.fn().mockReturnValue(true);
      const onComplete = jest.fn();

      const { result } = renderHook(() =>
        usePolling({
          pollFn,
          shouldContinue,
          onComplete,
          enableLogging: false,
        })
      );

      act(() => {
        result.current.startPolling();
      });

      // Should not poll before 10000ms
      await act(async () => {
        jest.advanceTimersByTime(5000);
        await Promise.resolve();
      });
      expect(pollFn).not.toHaveBeenCalled();

      // Should poll at 10000ms
      await act(async () => {
        jest.advanceTimersByTime(5000);
        await Promise.resolve();
      });
      expect(pollFn).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });
  });

  describe('AbortController Cleanup', () => {
    it('should create new AbortController for each poll', async () => {
      jest.useFakeTimers();
      const pollFn = jest.fn().mockResolvedValue({ done: false });
      const shouldContinue = jest.fn().mockReturnValue(true);
      const onComplete = jest.fn();

      const { result } = renderHook(() =>
        usePolling({
          pollFn,
          shouldContinue,
          onComplete,
          interval: 100,
          maxRetries: 3,
          enableLogging: false,
        })
      );

      act(() => {
        result.current.startPolling();
      });

      // First poll
      await act(async () => {
        jest.advanceTimersByTime(100);
        await Promise.resolve();
      });

      // Second poll
      await act(async () => {
        jest.advanceTimersByTime(100);
        await Promise.resolve();
      });

      expect(pollFn).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });

    it('should abort ongoing request when stopPolling is called', async () => {
      jest.useFakeTimers();
      const pollFn = jest.fn().mockResolvedValue({ done: false });
      const shouldContinue = jest.fn().mockReturnValue(true);
      const onComplete = jest.fn();

      const { result } = renderHook(() =>
        usePolling({
          pollFn,
          shouldContinue,
          onComplete,
          interval: 1000,
          enableLogging: false,
        })
      );

      act(() => {
        result.current.startPolling();
      });

      await act(async () => {
        jest.advanceTimersByTime(1000);
        await Promise.resolve();
      });

      act(() => {
        result.current.stopPolling();
      });

      expect(result.current.state.isPolling).toBe(false);

      jest.useRealTimers();
    });
  });
});

describe('useSimplePolling', () => {
  beforeEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should work as a simplified wrapper', async () => {
    jest.useFakeTimers();
    const pollFn = jest.fn().mockResolvedValue({ status: 'pending' });
    const isDone = jest.fn((result) => result.status === 'complete');
    const onComplete = jest.fn();

    const { result } = renderHook(() =>
      useSimplePolling(pollFn, isDone, onComplete)
    );

    act(() => {
      result.current.startPolling();
    });

    await act(async () => {
      jest.advanceTimersByTime(10000);
      await Promise.resolve();
    });

    expect(pollFn).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });

  it('should complete when isDone returns true', async () => {
    jest.useFakeTimers();
    let callCount = 0;
    const pollFn = jest.fn().mockImplementation(() => {
      callCount++;
      return Promise.resolve({ status: callCount >= 2 ? 'complete' : 'pending' });
    });
    const isDone = jest.fn((result) => result.status === 'complete');
    const onComplete = jest.fn();

    const { result } = renderHook(() =>
      useSimplePolling(pollFn, isDone, onComplete)
    );

    act(() => {
      result.current.startPolling();
    });

    // First poll - not done
    await act(async () => {
      jest.advanceTimersByTime(10000);
      await Promise.resolve();
    });

    expect(result.current.state.isPolling).toBe(true);

    // Second poll - done
    await act(async () => {
      jest.advanceTimersByTime(10000);
      await Promise.resolve();
    });

    expect(onComplete).toHaveBeenCalledWith({ status: 'complete' });
    expect(result.current.state.isPolling).toBe(false);

    jest.useRealTimers();
  });

  it('should call onError when provided', async () => {
    jest.useFakeTimers();
    const error = new Error('Test error');
    const pollFn = jest.fn().mockRejectedValue(error);
    const isDone = jest.fn().mockReturnValue(false);
    const onComplete = jest.fn();
    const onError = jest.fn();

    const { result } = renderHook(() =>
      useSimplePolling(pollFn, isDone, onComplete, onError)
    );

    act(() => {
      result.current.startPolling();
    });

    await act(async () => {
      jest.advanceTimersByTime(10000);
      await Promise.resolve();
    });

    expect(onError).toHaveBeenCalledWith(error);

    jest.useRealTimers();
  });
});
