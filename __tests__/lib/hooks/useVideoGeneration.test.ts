/**
 * Comprehensive tests for useVideoGeneration hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useVideoGeneration } from '@/lib/hooks/useVideoGeneration';
import { usePolling } from '@/lib/hooks/usePolling';
import toast from 'react-hot-toast';
import { browserLogger } from '@/lib/browserLogger';

// Mock dependencies
jest.mock('@/lib/hooks/usePolling');
jest.mock('react-hot-toast');
jest.mock('@/lib/browserLogger');

const mockUsePolling = usePolling as jest.MockedFunction<typeof usePolling>;
const mockToast = toast as jest.Mocked<typeof toast>;
const mockBrowserLogger = browserLogger as jest.Mocked<typeof browserLogger>;

// Mock fetch
global.fetch = jest.fn();

describe('useVideoGeneration', () => {
  const mockProjectId = 'project-123';
  const mockOnVideoGenerated = jest.fn();
  const mockStartPolling = jest.fn();
  const mockStopPolling = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockToast.loading = jest.fn();
    mockToast.success = jest.fn();
    mockToast.error = jest.fn();

    // Setup default polling mock
    mockUsePolling.mockReturnValue({
      startPolling: mockStartPolling,
      stopPolling: mockStopPolling,
      isPolling: false,
      retryCount: 0,
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ operationName: 'operation-123' }),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useVideoGeneration(mockProjectId, mockOnVideoGenerated));

      expect(result.current.videoGenPending).toBe(false);
      expect(result.current.videoOperationName).toBeNull();
      expect(typeof result.current.generateVideo).toBe('function');
    });
  });

  describe('Video Generation Request', () => {
    it('should initiate video generation successfully', async () => {
      const { result } = renderHook(() => useVideoGeneration(mockProjectId, mockOnVideoGenerated));

      await act(async () => {
        await result.current.generateVideo({
          prompt: 'A beautiful sunset',
          aspectRatio: '16:9',
          duration: 5,
        });
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'A beautiful sunset',
          aspectRatio: '16:9',
          duration: 5,
          projectId: mockProjectId,
        }),
      });

      expect(mockToast.loading).toHaveBeenCalledWith('Generating video with Veo 3.1...', {
        id: 'generate-video',
      });
      expect(result.current.videoGenPending).toBe(true);
      expect(result.current.videoOperationName).toBe('operation-123');
      expect(mockStartPolling).toHaveBeenCalled();
    });

    it('should handle generation with minimal params', async () => {
      const { result } = renderHook(() => useVideoGeneration(mockProjectId, mockOnVideoGenerated));

      await act(async () => {
        await result.current.generateVideo({
          prompt: 'Test prompt',
        });
      });

      expect(global.fetch).toHaveBeenCalled();
      expect(mockStartPolling).toHaveBeenCalled();
    });

    it('should stop existing polling before new generation', async () => {
      const { result } = renderHook(() => useVideoGeneration(mockProjectId, mockOnVideoGenerated));

      await act(async () => {
        await result.current.generateVideo({ prompt: 'First video' });
      });

      mockStopPolling.mockClear();

      await act(async () => {
        await result.current.generateVideo({ prompt: 'Second video' });
      });

      expect(mockStopPolling).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle generation API errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Generation failed' }),
      });

      const { result } = renderHook(() => useVideoGeneration(mockProjectId, mockOnVideoGenerated));

      await act(async () => {
        await result.current.generateVideo({ prompt: 'Test' });
      });

      expect(mockToast.error).toHaveBeenCalledWith('Generation failed', {
        id: 'generate-video',
      });
      expect(mockBrowserLogger.error).toHaveBeenCalled();
      expect(result.current.videoGenPending).toBe(false);
      expect(mockStartPolling).not.toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useVideoGeneration(mockProjectId, mockOnVideoGenerated));

      await act(async () => {
        await result.current.generateVideo({ prompt: 'Test' });
      });

      expect(mockToast.error).toHaveBeenCalledWith('Network error', {
        id: 'generate-video',
      });
      expect(result.current.videoGenPending).toBe(false);
    });

    it('should handle errors without message', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce('String error');

      const { result } = renderHook(() => useVideoGeneration(mockProjectId, mockOnVideoGenerated));

      await act(async () => {
        await result.current.generateVideo({ prompt: 'Test' });
      });

      expect(mockToast.error).toHaveBeenCalledWith('Video generation failed', {
        id: 'generate-video',
      });
    });
  });

  describe('Polling Configuration', () => {
    it('should configure polling with correct parameters', () => {
      renderHook(() => useVideoGeneration(mockProjectId, mockOnVideoGenerated));

      expect(mockUsePolling).toHaveBeenCalledWith(
        expect.objectContaining({
          interval: 10000,
          maxRetries: 100,
          enableLogging: true,
          logContext: { projectId: mockProjectId, operation: 'video-generation' },
        })
      );
    });

    it('should provide correct pollFn', () => {
      renderHook(() => useVideoGeneration(mockProjectId, mockOnVideoGenerated));

      const pollingConfig = mockUsePolling.mock.calls[0][0];
      expect(typeof pollingConfig.pollFn).toBe('function');
    });

    it('should provide correct shouldContinue function', () => {
      renderHook(() => useVideoGeneration(mockProjectId, mockOnVideoGenerated));

      const pollingConfig = mockUsePolling.mock.calls[0][0];
      expect(pollingConfig.shouldContinue({ done: false })).toBe(true);
      expect(pollingConfig.shouldContinue({ done: true })).toBe(false);
    });
  });

  describe('Polling Completion', () => {
    it('should handle successful completion', () => {
      let onCompleteCallback: any;

      mockUsePolling.mockImplementationOnce((config) => {
        onCompleteCallback = config.onComplete;
        return {
          startPolling: mockStartPolling,
          stopPolling: mockStopPolling,
          isPolling: false,
          retryCount: 0,
        };
      });

      const { result } = renderHook(() => useVideoGeneration(mockProjectId, mockOnVideoGenerated));

      const mockAsset = {
        id: 'asset-123',
        project_id: mockProjectId,
        user_id: 'user-123',
        storage_url: 'supabase://assets/video.mp4',
        type: 'video',
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      act(() => {
        onCompleteCallback({ done: true, asset: mockAsset });
      });

      expect(mockToast.success).toHaveBeenCalledWith('Video generated successfully!', {
        id: 'generate-video',
      });
      expect(mockOnVideoGenerated).toHaveBeenCalled();
      expect(result.current.videoGenPending).toBe(false);
      expect(result.current.videoOperationName).toBeNull();
    });

    it('should handle completion with error', () => {
      let onCompleteCallback: any;

      mockUsePolling.mockImplementationOnce((config) => {
        onCompleteCallback = config.onComplete;
        return {
          startPolling: mockStartPolling,
          stopPolling: mockStopPolling,
          isPolling: false,
          retryCount: 0,
        };
      });

      const { result } = renderHook(() => useVideoGeneration(mockProjectId, mockOnVideoGenerated));

      act(() => {
        onCompleteCallback({ done: true, error: 'Generation failed' });
      });

      expect(mockToast.error).toHaveBeenCalledWith('Generation failed', {
        id: 'generate-video',
      });
      expect(mockBrowserLogger.error).toHaveBeenCalled();
      expect(mockOnVideoGenerated).not.toHaveBeenCalled();
      expect(result.current.videoGenPending).toBe(false);
    });

    it('should handle completion without asset', () => {
      let onCompleteCallback: any;

      mockUsePolling.mockImplementationOnce((config) => {
        onCompleteCallback = config.onComplete;
        return {
          startPolling: mockStartPolling,
          stopPolling: mockStopPolling,
          isPolling: false,
          retryCount: 0,
        };
      });

      renderHook(() => useVideoGeneration(mockProjectId, mockOnVideoGenerated));

      act(() => {
        onCompleteCallback({ done: true });
      });

      expect(mockOnVideoGenerated).not.toHaveBeenCalled();
    });
  });

  describe('Polling Error Handling', () => {
    it('should handle polling errors', () => {
      let onErrorCallback: any;

      mockUsePolling.mockImplementationOnce((config) => {
        onErrorCallback = config.onError;
        return {
          startPolling: mockStartPolling,
          stopPolling: mockStopPolling,
          isPolling: false,
          retryCount: 0,
        };
      });

      const { result } = renderHook(() => useVideoGeneration(mockProjectId, mockOnVideoGenerated));

      act(() => {
        onErrorCallback(new Error('Polling failed'));
      });

      expect(mockToast.error).toHaveBeenCalledWith('Polling failed', {
        id: 'generate-video',
      });
      expect(mockBrowserLogger.error).toHaveBeenCalled();
      expect(result.current.videoGenPending).toBe(false);
      expect(result.current.videoOperationName).toBeNull();
    });
  });

  describe('State Management', () => {
    it('should update pending state correctly', async () => {
      const { result } = renderHook(() => useVideoGeneration(mockProjectId, mockOnVideoGenerated));

      expect(result.current.videoGenPending).toBe(false);

      await act(async () => {
        await result.current.generateVideo({ prompt: 'Test' });
      });

      expect(result.current.videoGenPending).toBe(true);
    });

    it('should update operation name correctly', async () => {
      const { result } = renderHook(() => useVideoGeneration(mockProjectId, mockOnVideoGenerated));

      expect(result.current.videoOperationName).toBeNull();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ operationName: 'op-456' }),
      });

      await act(async () => {
        await result.current.generateVideo({ prompt: 'Test' });
      });

      expect(result.current.videoOperationName).toBe('op-456');
    });
  });

  describe('Aspect Ratio Options', () => {
    it('should handle 9:16 aspect ratio', async () => {
      const { result } = renderHook(() => useVideoGeneration(mockProjectId, mockOnVideoGenerated));

      await act(async () => {
        await result.current.generateVideo({
          prompt: 'Test',
          aspectRatio: '9:16',
        });
      });

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.aspectRatio).toBe('9:16');
    });

    it('should handle 16:9 aspect ratio', async () => {
      const { result } = renderHook(() => useVideoGeneration(mockProjectId, mockOnVideoGenerated));

      await act(async () => {
        await result.current.generateVideo({
          prompt: 'Test',
          aspectRatio: '16:9',
        });
      });

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.aspectRatio).toBe('16:9');
    });

    it('should handle 1:1 aspect ratio', async () => {
      const { result } = renderHook(() => useVideoGeneration(mockProjectId, mockOnVideoGenerated));

      await act(async () => {
        await result.current.generateVideo({
          prompt: 'Test',
          aspectRatio: '1:1',
        });
      });

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.aspectRatio).toBe('1:1');
    });
  });

  describe('Duration Options', () => {
    it('should handle custom duration', async () => {
      const { result } = renderHook(() => useVideoGeneration(mockProjectId, mockOnVideoGenerated));

      await act(async () => {
        await result.current.generateVideo({
          prompt: 'Test',
          duration: 10,
        });
      });

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.duration).toBe(10);
    });

    it('should handle without duration parameter', async () => {
      const { result } = renderHook(() => useVideoGeneration(mockProjectId, mockOnVideoGenerated));

      await act(async () => {
        await result.current.generateVideo({
          prompt: 'Test',
        });
      });

      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('Callback Dependencies', () => {
    it('should call onVideoGenerated with correct asset', () => {
      let onCompleteCallback: any;

      mockUsePolling.mockImplementationOnce((config) => {
        onCompleteCallback = config.onComplete;
        return {
          startPolling: mockStartPolling,
          stopPolling: mockStopPolling,
          isPolling: false,
          retryCount: 0,
        };
      });

      renderHook(() => useVideoGeneration(mockProjectId, mockOnVideoGenerated));

      const mockAsset = {
        id: 'asset-123',
        project_id: mockProjectId,
        user_id: 'user-123',
        storage_url: 'supabase://assets/video.mp4',
        type: 'video',
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      act(() => {
        onCompleteCallback({ done: true, asset: mockAsset });
      });

      expect(mockOnVideoGenerated).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'asset-123',
          type: 'video',
        })
      );
    });

    it('should update callback when dependencies change', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      const { rerender } = renderHook(
        ({ callback }) => useVideoGeneration(mockProjectId, callback),
        { initialProps: { callback: callback1 } }
      );

      rerender({ callback: callback2 });

      // The hook should work with the new callback
      expect(mockUsePolling).toHaveBeenCalled();
    });
  });

  describe('Multiple Generation Requests', () => {
    it('should handle sequential generation requests', async () => {
      const { result } = renderHook(() => useVideoGeneration(mockProjectId, mockOnVideoGenerated));

      await act(async () => {
        await result.current.generateVideo({ prompt: 'First video' });
      });

      await act(async () => {
        await result.current.generateVideo({ prompt: 'Second video' });
      });

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(mockStopPolling).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long prompts', async () => {
      const { result } = renderHook(() => useVideoGeneration(mockProjectId, mockOnVideoGenerated));

      const longPrompt = 'A '.repeat(1000) + 'video';

      await act(async () => {
        await result.current.generateVideo({ prompt: longPrompt });
      });

      expect(global.fetch).toHaveBeenCalled();
    });

    it('should handle special characters in prompt', async () => {
      const { result } = renderHook(() => useVideoGeneration(mockProjectId, mockOnVideoGenerated));

      await act(async () => {
        await result.current.generateVideo({
          prompt: 'Test with émojis 🎥 and symbols @#$%',
        });
      });

      expect(global.fetch).toHaveBeenCalled();
    });

    it('should handle empty prompt', async () => {
      const { result } = renderHook(() => useVideoGeneration(mockProjectId, mockOnVideoGenerated));

      await act(async () => {
        await result.current.generateVideo({ prompt: '' });
      });

      expect(global.fetch).toHaveBeenCalled();
    });
  });
});
