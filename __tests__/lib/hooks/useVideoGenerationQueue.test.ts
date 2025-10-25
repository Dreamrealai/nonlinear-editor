/**
 * Tests for useVideoGenerationQueue Hook
 *
 * Tests video generation queue management including:
 * - Queue initialization
 * - Video generation
 * - Polling for status
 * - Error handling
 * - Queue cleanup
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useVideoGenerationQueue } from '@/lib/hooks/useVideoGenerationQueue';
import type { VideoGenerationFormState } from '@/lib/utils/videoGenerationUtils';

// Mock dependencies
jest.mock('@/lib/browserLogger', () => ({
  browserLogger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('@/lib/signedUrlCache', () => ({
  signedUrlCache: {
    get: jest.fn(() => Promise.resolve('https://example.com/signed-url')),
  },
}));

jest.mock('react-hot-toast', () => ({
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const toast = require('react-hot-toast').default;

describe('useVideoGenerationQueue', () => {
  const projectId = 'project-123';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            operationName: 'op-123',
          }),
      })
    ) as jest.Mock;
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    it('should initialize with empty queue', () => {
      const { result } = renderHook(() => useVideoGenerationQueue(projectId));

      expect(result.current.videoQueue).toEqual([]);
      expect(result.current.generating).toBe(false);
    });

    it('should provide queue management functions', () => {
      const { result } = renderHook(() => useVideoGenerationQueue(projectId));

      expect(result.current.generateVideo).toBeInstanceOf(Function);
      expect(result.current.removeVideo).toBeInstanceOf(Function);
      expect(result.current.clearCompleted).toBeInstanceOf(Function);
    });
  });

  describe('Video Generation', () => {
    it('should generate video and add to queue', async () => {
      const { result } = renderHook(() => useVideoGenerationQueue(projectId));

      const formState: VideoGenerationFormState = {
        prompt: 'Generate a video',
        model: 'default',
      };

      await act(async () => {
        await result.current.generateVideo(formState);
      });

      expect(result.current.videoQueue).toHaveLength(1);
      expect(result.current.videoQueue[0].prompt).toBe('Generate a video');
      expect(result.current.videoQueue[0].status).toBe('generating');
    });

    it('should validate form before generating', async () => {
      const { result } = renderHook(() => useVideoGenerationQueue(projectId));

      const formState: VideoGenerationFormState = {
        prompt: '', // Empty prompt
        model: 'default',
      };

      await act(async () => {
        await result.current.generateVideo(formState);
      });

      expect(result.current.videoQueue).toHaveLength(0);
      expect(toast.error).toHaveBeenCalled();
    });

    it('should call generate API with correct params', async () => {
      const { result } = renderHook(() => useVideoGenerationQueue(projectId));

      const formState: VideoGenerationFormState = {
        prompt: 'Generate a video',
        model: 'default',
      };

      await act(async () => {
        await result.current.generateVideo(formState);
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/video/generate',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('Generate a video'),
        })
      );
    });

    it('should handle generation errors', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Generation failed' }),
        })
      ) as jest.Mock;

      const { result } = renderHook(() => useVideoGenerationQueue(projectId));

      const formState: VideoGenerationFormState = {
        prompt: 'Generate a video',
        model: 'default',
      };

      await act(async () => {
        await result.current.generateVideo(formState);
      });

      expect(result.current.videoQueue[0].status).toBe('failed');
      expect(toast.error).toHaveBeenCalled();
    });

    it('should set generating state during generation', async () => {
      const { result } = renderHook(() => useVideoGenerationQueue(projectId));

      const formState: VideoGenerationFormState = {
        prompt: 'Generate a video',
        model: 'default',
      };

      let generatingDuringCall = false;

      const generatePromise = act(async () => {
        const promise = result.current.generateVideo(formState);
        generatingDuringCall = result.current.generating;
        await promise;
      });

      await generatePromise;

      expect(generatingDuringCall).toBe(true);
      expect(result.current.generating).toBe(false);
    });
  });

  describe('Status Polling', () => {
    it('should poll for video status', async () => {
      const statusFetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              done: false,
            }),
        })
      );

      global.fetch = jest
        .fn()
        .mockImplementationOnce(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ operationName: 'op-123' }),
          })
        )
        .mockImplementation(statusFetch) as jest.Mock;

      const { result } = renderHook(() => useVideoGenerationQueue(projectId));

      const formState: VideoGenerationFormState = {
        prompt: 'Generate a video',
        model: 'default',
      };

      await act(async () => {
        await result.current.generateVideo(formState);
      });

      // Advance timers to trigger polling
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      expect(statusFetch).toHaveBeenCalled();
    });

    it('should update queue when video completes', async () => {
      global.fetch = jest
        .fn()
        .mockImplementationOnce(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ operationName: 'op-123' }),
          })
        )
        .mockImplementation(() =>
          Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                done: true,
                asset: {
                  id: 'asset-1',
                  storage_url: 'supabase://videos/test.mp4',
                  metadata: {
                    sourceUrl: 'https://example.com/video.mp4',
                    thumbnail: 'data:image/jpeg;base64,abc',
                  },
                },
              }),
          })
        ) as jest.Mock;

      const { result } = renderHook(() => useVideoGenerationQueue(projectId));

      const formState: VideoGenerationFormState = {
        prompt: 'Generate a video',
        model: 'default',
      };

      await act(async () => {
        await result.current.generateVideo(formState);
      });

      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(result.current.videoQueue[0]?.status).toBe('completed');
      });

      expect(toast.success).toHaveBeenCalledWith('Video generated successfully!');
    });

    it('should handle polling errors', async () => {
      global.fetch = jest
        .fn()
        .mockImplementationOnce(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ operationName: 'op-123' }),
          })
        )
        .mockImplementation(() =>
          Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                done: true,
                error: 'Video generation failed',
              }),
          })
        ) as jest.Mock;

      const { result } = renderHook(() => useVideoGenerationQueue(projectId));

      const formState: VideoGenerationFormState = {
        prompt: 'Generate a video',
        model: 'default',
      };

      await act(async () => {
        await result.current.generateVideo(formState);
      });

      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(result.current.videoQueue[0]?.status).toBe('failed');
      });
    });

    it('should stop polling when video completes', async () => {
      const statusFetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              done: true,
              asset: {
                id: 'asset-1',
                storage_url: 'supabase://videos/test.mp4',
                metadata: {
                  sourceUrl: 'https://example.com/video.mp4',
                },
              },
            }),
        })
      );

      global.fetch = jest
        .fn()
        .mockImplementationOnce(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ operationName: 'op-123' }),
          })
        )
        .mockImplementation(statusFetch) as jest.Mock;

      const { result } = renderHook(() => useVideoGenerationQueue(projectId));

      const formState: VideoGenerationFormState = {
        prompt: 'Generate a video',
        model: 'default',
      };

      await act(async () => {
        await result.current.generateVideo(formState);
      });

      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      const callsBefore = statusFetch.mock.calls.length;

      await act(async () => {
        jest.advanceTimersByTime(10000);
      });

      const callsAfter = statusFetch.mock.calls.length;

      // Should not increase (polling stopped)
      expect(callsAfter).toBe(callsBefore);
    });
  });

  describe('Queue Management', () => {
    it('should remove video from queue', async () => {
      const { result } = renderHook(() => useVideoGenerationQueue(projectId));

      const formState: VideoGenerationFormState = {
        prompt: 'Generate a video',
        model: 'default',
      };

      await act(async () => {
        await result.current.generateVideo(formState);
      });

      const videoId = result.current.videoQueue[0].id;

      act(() => {
        result.current.removeVideo(videoId);
      });

      expect(result.current.videoQueue).toHaveLength(0);
    });

    it('should clear completed videos', async () => {
      global.fetch = jest
        .fn()
        .mockImplementationOnce(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ operationName: 'op-123' }),
          })
        )
        .mockImplementation(() =>
          Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                done: true,
                asset: {
                  id: 'asset-1',
                  storage_url: 'supabase://videos/test.mp4',
                  metadata: {
                    sourceUrl: 'https://example.com/video.mp4',
                  },
                },
              }),
          })
        ) as jest.Mock;

      const { result } = renderHook(() => useVideoGenerationQueue(projectId));

      const formState: VideoGenerationFormState = {
        prompt: 'Generate a video',
        model: 'default',
      };

      await act(async () => {
        await result.current.generateVideo(formState);
      });

      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(result.current.videoQueue[0]?.status).toBe('completed');
      });

      act(() => {
        result.current.clearCompleted();
      });

      expect(result.current.videoQueue).toHaveLength(0);
    });
  });

  describe('Cleanup', () => {
    it('should clear polling intervals on unmount', async () => {
      const { result, unmount } = renderHook(() => useVideoGenerationQueue(projectId));

      const formState: VideoGenerationFormState = {
        prompt: 'Generate a video',
        model: 'default',
      };

      await act(async () => {
        await result.current.generateVideo(formState);
      });

      unmount();

      // Should not throw
    });

    it('should stop polling when video removed', async () => {
      const statusFetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ done: false }),
        })
      );

      global.fetch = jest
        .fn()
        .mockImplementationOnce(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ operationName: 'op-123' }),
          })
        )
        .mockImplementation(statusFetch) as jest.Mock;

      const { result } = renderHook(() => useVideoGenerationQueue(projectId));

      const formState: VideoGenerationFormState = {
        prompt: 'Generate a video',
        model: 'default',
      };

      await act(async () => {
        await result.current.generateVideo(formState);
      });

      const videoId = result.current.videoQueue[0].id;

      act(() => {
        result.current.removeVideo(videoId);
      });

      const callsBefore = statusFetch.mock.calls.length;

      await act(async () => {
        jest.advanceTimersByTime(10000);
      });

      const callsAfter = statusFetch.mock.calls.length;

      // Should not increase (polling stopped)
      expect(callsAfter).toBe(callsBefore);
    });
  });
});
