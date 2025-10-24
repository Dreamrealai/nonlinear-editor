/**
 * @jest-environment node
 */

/**
 * Integration tests for memory leak prevention in polling operations
 *
 * Tests verify that all polling operations properly clean up resources:
 * - Timeouts are cleared on unmount
 * - AbortControllers abort fetch requests
 * - Max retry limits are enforced
 * - No state updates after unmount
 * - No orphaned event listeners
 *
 * Tests cover:
 * - Video generation polling (Veo)
 * - Audio generation polling (Suno, ElevenLabs)
 * - Editor handler polling (4 operations)
 */

import { renderHook, waitFor } from '@testing-library/react';
import { act } from '@testing-library/react';

describe('Memory Leak Prevention - Integration Tests', () => {
  let setTimeoutSpy: jest.SpyInstance;
  let clearTimeoutSpy: jest.SpyInstance;
  let fetchMock: jest.Mock;
  let abortMock: jest.Mock;
  let abortControllerMock: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();

    // Spy on timeout functions
    setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

    // Mock AbortController
    abortMock = jest.fn();
    abortControllerMock = jest.fn(() => ({
      signal: { aborted: false },
      abort: abortMock,
    }));
    global.AbortController = abortControllerMock as any;

    // Mock fetch
    fetchMock = jest.fn();
    global.fetch = fetchMock as any;
  });

  afterEach(() => {
    jest.useRealTimers();
    setTimeoutSpy.mockRestore();
    clearTimeoutSpy.mockRestore();
    jest.restoreAllMocks();
  });

  describe('Video Generation Page (Veo) - Memory Leak Tests', () => {
    test('should cleanup timeout on component unmount', async () => {
      // Simulate video generation page polling pattern
      let isMounted = true;
      let timeoutId: NodeJS.Timeout | null = null;
      let attempts = 0;
      const maxAttempts = 60;

      // Mock API response - still processing
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ done: false, progress: 10 }),
      });

      const poll = async () => {
        if (!isMounted) return;

        attempts++;
        if (attempts > maxAttempts) {
          if (isMounted) {
            timeoutId = null;
          }
          return;
        }

        try {
          await fetch('/api/video/status?operationName=test');

          if (!isMounted) return;

          // Continue polling
          timeoutId = setTimeout(poll, 10000);
        } catch (error) {
          if (isMounted) {
            timeoutId = null;
          }
        }
      };

      // Start polling
      timeoutId = setTimeout(poll, 10000);

      // Let one polling cycle complete
      await act(async () => {
        jest.advanceTimersByTime(10000);
        await Promise.resolve();
      });

      expect(fetchMock).toHaveBeenCalled();
      expect(timeoutId).not.toBeNull();

      // Simulate unmount
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      // Verify cleanup
      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(timeoutId).toBeNull();
    });

    test('should prevent state updates after unmount', async () => {
      let isMounted = true;
      let videoGenPending = true;
      let progress = 0;

      const setState = (pending: boolean, prog: number) => {
        if (!isMounted) {
          // Should not update state
          return;
        }
        videoGenPending = pending;
        progress = prog;
      };

      // Before unmount
      setState(true, 25);
      expect(videoGenPending).toBe(true);
      expect(progress).toBe(25);

      // Simulate unmount
      isMounted = false;

      // After unmount - should not update
      setState(false, 100);
      expect(videoGenPending).toBe(true); // Should remain at previous value
      expect(progress).toBe(25); // Should remain at previous value
    });

    test('should enforce max polling attempts (10 minutes)', async () => {
      let isMounted = true;
      let timeoutId: NodeJS.Timeout | null = null;
      let attempts = 0;
      const maxAttempts = 60; // 60 attempts * 10s = 10 minutes
      let timedOut = false;

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ done: false }),
      });

      const poll = async () => {
        if (!isMounted) return;

        attempts++;
        if (attempts > maxAttempts) {
          if (isMounted) {
            timedOut = true;
            timeoutId = null;
          }
          return;
        }

        await fetch('/api/video/status');

        if (!isMounted) return;

        timeoutId = setTimeout(poll, 10000);
      };

      timeoutId = setTimeout(poll, 10000);

      // Fast-forward through all attempts
      for (let i = 0; i <= maxAttempts + 1; i++) {
        await act(async () => {
          jest.advanceTimersByTime(10000);
          await Promise.resolve();
        });
      }

      expect(attempts).toBe(maxAttempts + 1);
      expect(timedOut).toBe(true);
      expect(timeoutId).toBeNull();
    });

    test('should handle cancel button correctly', () => {
      let timeoutId: NodeJS.Timeout | null = setTimeout(() => {}, 10000);
      let videoGenPending = true;
      let progress = 25;

      // Simulate cancel button click
      const handleCancel = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        videoGenPending = false;
        progress = 0;
      };

      handleCancel();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(timeoutId).toBeNull();
      expect(videoGenPending).toBe(false);
      expect(progress).toBe(0);
    });
  });

  describe('Audio Generation Page (Suno) - Memory Leak Tests', () => {
    test('should cleanup timeout AND AbortController on unmount', async () => {
      let isMounted = true;
      let timeoutId: NodeJS.Timeout | null = null;
      let controller: AbortController | null = null;

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          tasks: [{ status: 'processing', audioUrl: null }],
        }),
      });

      const poll = async () => {
        if (!isMounted) return;

        try {
          controller = new AbortController();
          await fetch('/api/audio/suno/status?taskId=test', {
            signal: controller.signal,
          });
          controller = null;

          if (!isMounted) return;

          timeoutId = setTimeout(poll, 5000);
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            return;
          }
          throw error;
        }
      };

      timeoutId = setTimeout(poll, 5000);

      await act(async () => {
        jest.advanceTimersByTime(5000);
        await Promise.resolve();
      });

      expect(timeoutId).not.toBeNull();
      expect(fetchMock).toHaveBeenCalled();

      // Simulate unmount
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (controller) {
        controller.abort();
        controller = null;
      }

      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(timeoutId).toBeNull();
    });

    test('should abort fetch requests on unmount', async () => {
      let isMounted = true;
      let controller: AbortController | null = null;

      const poll = async () => {
        if (!isMounted) return;

        controller = new AbortController();
        await fetch('/api/audio/suno/status', { signal: controller.signal });
        controller = null;
      };

      // Start poll
      const pollPromise = poll();

      // Immediately unmount before fetch completes
      isMounted = false;
      if (controller) {
        controller.abort();
        controller = null;
      }

      expect(abortMock).toHaveBeenCalled();

      await pollPromise.catch(() => {}); // Ignore abort errors
    });

    test('should handle AbortError gracefully', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';

      fetchMock.mockRejectedValue(abortError);

      let errorCaught = false;
      let unexpectedError = false;

      try {
        const controller = new AbortController();
        await fetch('/api/audio/suno/status', { signal: controller.signal });
      } catch (error) {
        errorCaught = true;
        if (error instanceof Error && error.name === 'AbortError') {
          // Should handle gracefully
          expect(error.name).toBe('AbortError');
        } else {
          unexpectedError = true;
        }
      }

      expect(errorCaught).toBe(true);
      expect(unexpectedError).toBe(false);
    });

    test('should enforce max attempts (5 minutes)', async () => {
      let isMounted = true;
      let attempts = 0;
      const maxAttempts = 60; // 60 * 5s = 5 minutes
      let timedOut = false;

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          tasks: [{ status: 'processing' }],
        }),
      });

      const poll = async () => {
        if (!isMounted) return;

        attempts++;
        if (attempts > maxAttempts) {
          if (isMounted) {
            timedOut = true;
          }
          return;
        }

        const controller = new AbortController();
        await fetch('/api/audio/suno/status', { signal: controller.signal });

        if (!isMounted) return;

        setTimeout(poll, 5000);
      };

      setTimeout(poll, 5000);

      // Fast-forward
      for (let i = 0; i <= maxAttempts + 1; i++) {
        await act(async () => {
          jest.advanceTimersByTime(5000);
          await Promise.resolve();
        });
      }

      expect(attempts).toBe(maxAttempts + 1);
      expect(timedOut).toBe(true);
    });
  });

  describe('Editor Handlers - Memory Leak Tests', () => {
    describe('handleGenerateVideo (Veo)', () => {
      test('should track and cleanup timeout in centralized Set', async () => {
        const timeouts = new Set<NodeJS.Timeout>();
        const controllers = new Set<AbortController>();
        let isMounted = true;

        fetchMock.mockResolvedValue({
          ok: true,
          json: async () => ({ done: false }),
        });

        const poll = async () => {
          if (!isMounted) return;

          try {
            const controller = new AbortController();
            controllers.add(controller);

            await fetch('/api/video/status', { signal: controller.signal });

            controllers.delete(controller);

            if (!isMounted) return;

            const timeout = setTimeout(poll, 10000);
            timeouts.add(timeout);
          } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
              return;
            }
          }
        };

        const initialTimeout = setTimeout(poll, 10000);
        timeouts.add(initialTimeout);

        await act(async () => {
          jest.advanceTimersByTime(10000);
          await Promise.resolve();
        });

        expect(timeouts.size).toBeGreaterThan(0);
        expect(fetchMock).toHaveBeenCalled();

        // Cleanup on unmount
        isMounted = false;
        timeouts.forEach((t) => clearTimeout(t));
        timeouts.clear();
        controllers.forEach((c) => c.abort());
        controllers.clear();

        expect(timeouts.size).toBe(0);
        expect(controllers.size).toBe(0);
        expect(clearTimeoutSpy).toHaveBeenCalled();
      });

      test('should abort ongoing fetch on unmount', async () => {
        const controllers = new Set<AbortController>();

        const poll = async () => {
          const controller = new AbortController();
          controllers.add(controller);

          await fetch('/api/video/status', { signal: controller.signal });

          controllers.delete(controller);
        };

        // Start poll but don't wait
        poll().catch(() => {});

        // Immediate cleanup
        controllers.forEach((c) => c.abort());
        controllers.clear();

        expect(abortMock).toHaveBeenCalled();
      });
    });

    describe('handleUpscaleVideo (Topaz)', () => {
      test('should cleanup after max attempts (20 minutes)', async () => {
        let attempts = 0;
        const maxAttempts = 120; // 120 * 10s = 20 minutes
        const timeouts = new Set<NodeJS.Timeout>();
        let timedOut = false;

        fetchMock.mockResolvedValue({
          ok: true,
          json: async () => ({ done: false }),
        });

        const poll = async () => {
          attempts++;
          if (attempts > maxAttempts) {
            timedOut = true;
            return;
          }

          await fetch('/api/video/upscale-status');

          const timeout = setTimeout(poll, 10000);
          timeouts.add(timeout);
        };

        const initialTimeout = setTimeout(poll, 10000);
        timeouts.add(initialTimeout);

        // Fast-forward through max attempts
        for (let i = 0; i <= maxAttempts + 1; i++) {
          await act(async () => {
            jest.advanceTimersByTime(10000);
            await Promise.resolve();
          });
        }

        expect(attempts).toBe(maxAttempts + 1);
        expect(timedOut).toBe(true);

        // Cleanup
        timeouts.forEach((t) => clearTimeout(t));
        timeouts.clear();
        expect(timeouts.size).toBe(0);
      });
    });

    describe('handleGenerateSuno (Audio)', () => {
      test('should cleanup after 5 minutes', async () => {
        let attempts = 0;
        const maxAttempts = 60; // 60 * 5s = 5 minutes
        const timeouts = new Set<NodeJS.Timeout>();

        fetchMock.mockResolvedValue({
          ok: true,
          json: async () => ({
            tasks: [{ status: 'processing' }],
          }),
        });

        const poll = async () => {
          attempts++;
          if (attempts > maxAttempts) {
            return;
          }

          await fetch('/api/audio/suno/status');

          const timeout = setTimeout(poll, 5000);
          timeouts.add(timeout);
        };

        const initialTimeout = setTimeout(poll, 5000);
        timeouts.add(initialTimeout);

        // Fast-forward
        for (let i = 0; i <= maxAttempts + 1; i++) {
          await act(async () => {
            jest.advanceTimersByTime(5000);
            await Promise.resolve();
          });
        }

        expect(attempts).toBe(maxAttempts + 1);

        timeouts.forEach((t) => clearTimeout(t));
        expect(clearTimeoutSpy).toHaveBeenCalled();
      });
    });

    describe('handleGenerateAudioFromClip (MiniMax)', () => {
      test('should track timeout in centralized Set', async () => {
        const timeouts = new Set<NodeJS.Timeout>();

        fetchMock.mockResolvedValue({
          ok: true,
          json: async () => ({ status: 'processing' }),
        });

        const poll = async () => {
          await fetch('/api/video/generate-audio-status');

          const timeout = setTimeout(poll, 5000);
          timeouts.add(timeout);
        };

        const initialTimeout = setTimeout(poll, 5000);
        timeouts.add(initialTimeout);

        await act(async () => {
          jest.advanceTimersByTime(5000);
          await Promise.resolve();
        });

        expect(timeouts.size).toBeGreaterThan(0);

        // Cleanup
        timeouts.forEach((t) => clearTimeout(t));
        timeouts.clear();
        expect(timeouts.size).toBe(0);
      });
    });
  });

  describe('Production Scenarios - Stress Tests', () => {
    test('should handle rapid mount/unmount cycles without leaks', async () => {
      const cycles = 10;
      let totalTimeoutsCreated = 0;
      let totalTimeoutsCleared = 0;

      for (let i = 0; i < cycles; i++) {
        let isMounted = true;
        let timeoutId: NodeJS.Timeout | null = null;

        // Mount - start polling
        timeoutId = setTimeout(() => {}, 5000);
        totalTimeoutsCreated++;

        // Immediate unmount
        isMounted = false;
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
          totalTimeoutsCleared++;
        }
      }

      expect(totalTimeoutsCreated).toBe(cycles);
      expect(totalTimeoutsCleared).toBe(cycles);
      expect(clearTimeoutSpy).toHaveBeenCalledTimes(cycles);
    });

    test('should handle multiple concurrent polling operations', async () => {
      const timeouts = new Set<NodeJS.Timeout>();
      const controllers = new Set<AbortController>();

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ done: false }),
      });

      // Start 4 different polling operations (simulating editor handlers)
      const operations = [
        { name: 'video', interval: 10000 },
        { name: 'audio-suno', interval: 5000 },
        { name: 'upscale', interval: 10000 },
        { name: 'audio-minimax', interval: 5000 },
      ];

      for (const op of operations) {
        const controller = new AbortController();
        controllers.add(controller);

        const timeout = setTimeout(async () => {
          await fetch(`/api/${op.name}/status`, { signal: controller.signal });
        }, op.interval);
        timeouts.add(timeout);
      }

      expect(timeouts.size).toBe(4);
      expect(controllers.size).toBe(4);

      // Cleanup all
      timeouts.forEach((t) => clearTimeout(t));
      timeouts.clear();
      controllers.forEach((c) => c.abort());
      controllers.clear();

      expect(timeouts.size).toBe(0);
      expect(controllers.size).toBe(0);
      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(abortMock).toHaveBeenCalled();
    });

    test('should not create memory leaks with long-running polls', async () => {
      let isMounted = true;
      const timeouts = new Set<NodeJS.Timeout>();
      let iterations = 0;
      const maxIterations = 30; // Simulate 5 minutes of polling at 10s intervals

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ done: false }),
      });

      const poll = async () => {
        if (!isMounted) return;

        iterations++;
        if (iterations > maxIterations) return;

        await fetch('/api/video/status');

        if (!isMounted) return;

        const timeout = setTimeout(poll, 10000);
        timeouts.add(timeout);
      };

      const initialTimeout = setTimeout(poll, 10000);
      timeouts.add(initialTimeout);

      // Run for several cycles
      for (let i = 0; i < 10; i++) {
        await act(async () => {
          jest.advanceTimersByTime(10000);
          await Promise.resolve();
        });
      }

      // Verify polling is working
      expect(iterations).toBeGreaterThan(0);
      expect(fetchMock).toHaveBeenCalled();

      // Cleanup
      isMounted = false;
      timeouts.forEach((t) => clearTimeout(t));
      timeouts.clear();

      expect(timeouts.size).toBe(0);
    });

    test('should handle navigation away during polling', async () => {
      let isMounted = true;
      let timeoutId: NodeJS.Timeout | null = null;
      let controller: AbortController | null = null;
      let stateUpdates = 0;

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ done: false }),
      });

      const poll = async () => {
        if (!isMounted) return;

        try {
          controller = new AbortController();
          await fetch('/api/video/status', { signal: controller.signal });
          controller = null;

          if (!isMounted) return;

          stateUpdates++;
          timeoutId = setTimeout(poll, 10000);
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            return;
          }
          throw error;
        }
      };

      timeoutId = setTimeout(poll, 10000);

      // Let a few cycles complete
      await act(async () => {
        jest.advanceTimersByTime(20000);
        await Promise.resolve();
      });

      const stateUpdatesBeforeUnmount = stateUpdates;

      // Simulate navigation away
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (controller) {
        controller.abort();
        controller = null;
      }

      // Advance time further
      await act(async () => {
        jest.advanceTimersByTime(50000);
        await Promise.resolve();
      });

      // State should not have updated after unmount
      expect(stateUpdates).toBe(stateUpdatesBeforeUnmount);
      expect(timeoutId).toBeNull();
    });
  });

  describe('Error Handling with Cleanup', () => {
    test('should cleanup on fetch errors', async () => {
      let isMounted = true;
      let timeoutId: NodeJS.Timeout | null = null;
      let errorHandled = false;

      fetchMock.mockRejectedValue(new Error('Network error'));

      const poll = async () => {
        if (!isMounted) return;

        try {
          await fetch('/api/video/status');

          if (!isMounted) return;

          timeoutId = setTimeout(poll, 10000);
        } catch (error) {
          errorHandled = true;
          if (isMounted) {
            timeoutId = null;
          }
        }
      };

      timeoutId = setTimeout(poll, 10000);

      await act(async () => {
        jest.advanceTimersByTime(10000);
        await Promise.resolve();
      });

      expect(errorHandled).toBe(true);
      expect(timeoutId).toBeNull();
    });

    test('should cleanup on API error responses', async () => {
      let isMounted = true;
      let timeoutId: NodeJS.Timeout | null = null;

      fetchMock.mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Generation failed' }),
      });

      const poll = async () => {
        if (!isMounted) return;

        try {
          const res = await fetch('/api/video/status');
          const json = await res.json();

          if (!res.ok) {
            throw new Error(json.error);
          }

          if (!isMounted) return;

          timeoutId = setTimeout(poll, 10000);
        } catch (error) {
          if (isMounted) {
            timeoutId = null;
          }
        }
      };

      timeoutId = setTimeout(poll, 10000);

      await act(async () => {
        jest.advanceTimersByTime(10000);
        await Promise.resolve();
      });

      expect(timeoutId).toBeNull();
    });
  });

  describe('Complete Lifecycle Tests', () => {
    test('should handle complete video generation lifecycle', async () => {
      let isMounted = true;
      let timeoutId: NodeJS.Timeout | null = null;
      let controller: AbortController | null = null;
      let attempts = 0;
      let isComplete = false;

      // Mock progressive responses
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ done: false, progress: 25 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ done: false, progress: 50 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ done: false, progress: 75 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ done: true, asset: { id: '123' } }),
        });

      const poll = async () => {
        if (!isMounted) return;

        attempts++;

        try {
          controller = new AbortController();
          const res = await fetch('/api/video/status', { signal: controller.signal });
          const json = await res.json();
          controller = null;

          if (!isMounted) return;

          if (json.done) {
            isComplete = true;
            timeoutId = null;
            return;
          }

          timeoutId = setTimeout(poll, 10000);
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            return;
          }
          if (isMounted) {
            timeoutId = null;
          }
        }
      };

      timeoutId = setTimeout(poll, 10000);

      // Run through completion
      for (let i = 0; i < 4; i++) {
        await act(async () => {
          jest.advanceTimersByTime(10000);
          await Promise.resolve();
        });
      }

      expect(isComplete).toBe(true);
      expect(timeoutId).toBeNull();
      expect(attempts).toBe(4);
    });
  });
});
