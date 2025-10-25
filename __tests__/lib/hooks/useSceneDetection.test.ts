/**
 * Comprehensive tests for useSceneDetection hook
 */

import { renderHook, act } from '@testing-library/react';
import { useSceneDetection } from '@/lib/hooks/useSceneDetection';
import toast from 'react-hot-toast';
import { browserLogger } from '@/lib/browserLogger';
import type { AssetRow, Timeline } from '@/types';

// Mock dependencies
jest.mock('react-hot-toast');
jest.mock('@/lib/browserLogger');
jest.mock('uuid', (): Record<string, unknown> => ({ v4: () => 'mock-uuid' }));

const mockToast = toast as jest.Mocked<typeof toast>;
const mockBrowserLogger = browserLogger as jest.Mocked<typeof browserLogger>;

// Mock fetch
global.fetch = jest.fn();

describe('useSceneDetection', () => {
  const mockProjectId = 'project-123';
  const mockSetTimeline = jest.fn();

  const mockVideoAsset: AssetRow = {
    id: 'asset-123',
    project_id: mockProjectId,
    user_id: 'user-123',
    storage_url: 'supabase://assets/video.mp4',
    type: 'video',
    duration_seconds: 60,
    metadata: { filename: 'test.mp4', mimeType: 'video/mp4' },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockTimeline: Timeline = {
    clips: [],
    textOverlays: [],
    transitions: [],
  };

  beforeEach((): void => {
    jest.clearAllMocks();
    mockToast.loading = jest.fn();
    mockToast.success = jest.fn();
    mockToast.error = jest.fn();
  });

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() =>
        useSceneDetection(mockProjectId, [mockVideoAsset], mockTimeline, mockSetTimeline)
      );

      expect(result.current.sceneDetectPending).toBe(false);
      expect(typeof result.current.detectScenes).toBe('function');
    });
  });

  describe('Scene Detection', () => {
    it('should detect scenes successfully', async () => {
      const mockScenes = [
        { startTime: 0, endTime: 10 },
        { startTime: 10, endTime: 20 },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ scenes: mockScenes }),
      });

      const { result } = renderHook(() =>
        useSceneDetection(mockProjectId, [mockVideoAsset], mockTimeline, mockSetTimeline)
      );

      await act(async () => {
        await result.current.detectScenes();
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/video/split-scenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: mockProjectId, assetId: mockVideoAsset.id }),
      });

      expect(mockToast.success).toHaveBeenCalledWith('Detected 2 scenes', { id: 'detect-scenes' });
      expect(mockSetTimeline).toHaveBeenCalled();
      expect(result.current.sceneDetectPending).toBe(false);
    });

    it('should show error when no video assets exist', async () => {
      const { result } = renderHook(() =>
        useSceneDetection(mockProjectId, [], mockTimeline, mockSetTimeline)
      );

      await act(async () => {
        await result.current.detectScenes();
      });

      expect(mockToast.error).toHaveBeenCalledWith('Upload a video before detecting scenes');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Detection failed' }),
      });

      const { result } = renderHook(() =>
        useSceneDetection(mockProjectId, [mockVideoAsset], mockTimeline, mockSetTimeline)
      );

      await act(async () => {
        await result.current.detectScenes();
      });

      expect(mockToast.error).toHaveBeenCalled();
      expect(mockBrowserLogger.error).toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() =>
        useSceneDetection(mockProjectId, [mockVideoAsset], mockTimeline, mockSetTimeline)
      );

      await act(async () => {
        await result.current.detectScenes();
      });

      expect(mockToast.error).toHaveBeenCalled();
    });
  });

  describe('Timeline Update', () => {
    it('should add scenes as clips to timeline', async () => {
      const mockScenes = [
        { startTime: 0, endTime: 5 },
        { startTime: 5, endTime: 10 },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ scenes: mockScenes }),
      });

      const { result } = renderHook(() =>
        useSceneDetection(mockProjectId, [mockVideoAsset], mockTimeline, mockSetTimeline)
      );

      await act(async () => {
        await result.current.detectScenes();
      });

      expect(mockSetTimeline).toHaveBeenCalledWith(
        expect.objectContaining({
          clips: expect.arrayContaining([
            expect.objectContaining({
              assetId: mockVideoAsset.id,
              start: 0,
              end: 5,
              timelinePosition: 0,
            }),
            expect.objectContaining({
              assetId: mockVideoAsset.id,
              start: 5,
              end: 10,
              timelinePosition: 5,
            }),
          ]),
        })
      );
    });

    it('should calculate cumulative timeline positions correctly', async () => {
      const mockScenes = [
        { startTime: 0, endTime: 3 },
        { startTime: 3, endTime: 7 },
        { startTime: 7, endTime: 12 },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ scenes: mockScenes }),
      });

      const { result } = renderHook(() =>
        useSceneDetection(mockProjectId, [mockVideoAsset], mockTimeline, mockSetTimeline)
      );

      await act(async () => {
        await result.current.detectScenes();
      });

      const timelineArg = mockSetTimeline.mock.calls[0][0];
      expect(timelineArg.clips[0].timelinePosition).toBe(0);
      expect(timelineArg.clips[1].timelinePosition).toBe(3);
      expect(timelineArg.clips[2].timelinePosition).toBe(7);
    });

    it('should not update timeline if timeline is null', async () => {
      const mockScenes = [{ startTime: 0, endTime: 5 }];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ scenes: mockScenes }),
      });

      const { result } = renderHook(() =>
        useSceneDetection(mockProjectId, [mockVideoAsset], null, mockSetTimeline)
      );

      await act(async () => {
        await result.current.detectScenes();
      });

      expect(mockSetTimeline).not.toHaveBeenCalled();
    });

    it('should not update timeline if scenes is not an array', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ scenes: 'invalid' }),
      });

      const { result } = renderHook(() =>
        useSceneDetection(mockProjectId, [mockVideoAsset], mockTimeline, mockSetTimeline)
      );

      await act(async () => {
        await result.current.detectScenes();
      });

      expect(mockSetTimeline).not.toHaveBeenCalled();
    });
  });

  describe('State Management', () => {
    it('should set pending state during detection', async () => {
      let resolveFetch: any;
      (global.fetch as jest.Mock).mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
      );

      const { result } = renderHook(() =>
        useSceneDetection(mockProjectId, [mockVideoAsset], mockTimeline, mockSetTimeline)
      );

      act(() => {
        result.current.detectScenes();
      });

      expect(result.current.sceneDetectPending).toBe(true);

      await act(async () => {
        resolveFetch({ ok: true, json: async () => ({ scenes: [] }) });
      });

      expect(result.current.sceneDetectPending).toBe(false);
    });

    it('should clear pending state on error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Error'));

      const { result } = renderHook(() =>
        useSceneDetection(mockProjectId, [mockVideoAsset], mockTimeline, mockSetTimeline)
      );

      await act(async () => {
        await result.current.detectScenes();
      });

      expect(result.current.sceneDetectPending).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty scenes array', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ scenes: [] }),
      });

      const { result } = renderHook(() =>
        useSceneDetection(mockProjectId, [mockVideoAsset], mockTimeline, mockSetTimeline)
      );

      await act(async () => {
        await result.current.detectScenes();
      });

      expect(mockToast.success).toHaveBeenCalledWith('Detected 0 scenes', { id: 'detect-scenes' });
    });

    it('should handle API errors with details', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed', details: 'Video too long' }),
      });

      const { result } = renderHook(() =>
        useSceneDetection(mockProjectId, [mockVideoAsset], mockTimeline, mockSetTimeline)
      );

      await act(async () => {
        await result.current.detectScenes();
      });

      expect(mockToast.error).toHaveBeenCalledWith('Failed: Video too long', { id: 'detect-scenes' });
    });

    it('should select first video asset when multiple exist', async () => {
      const assets = [
        { ...mockVideoAsset, id: 'asset-1' },
        { ...mockVideoAsset, id: 'asset-2' },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ scenes: [] }),
      });

      const { result } = renderHook(() =>
        useSceneDetection(mockProjectId, assets, mockTimeline, mockSetTimeline)
      );

      await act(async () => {
        await result.current.detectScenes();
      });

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.assetId).toBe('asset-1');
    });
  });
});
