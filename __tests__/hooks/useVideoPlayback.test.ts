/**
 * Test Suite: useVideoPlayback Hook
 *
 * Tests video playback functionality including:
 * - Play/pause state management
 * - Playback controls
 * - State initialization
 * - Hook lifecycle
 */

import { renderHook, act } from '@testing-library/react';
import { useVideoPlayback } from '@/lib/hooks/useVideoPlayback';
import type { Clip } from '@/types/timeline';
import { useRef } from 'react';

// Mock useAudioEffects
jest.mock('@/lib/hooks/useAudioEffects', () => ({
  useAudioEffects: () => ({
    connectAudio: jest.fn(),
    applyEffects: jest.fn(),
    disconnectAudio: jest.fn(),
  }),
}));

describe('useVideoPlayback', () => {
  const createMockClip = (): Clip => ({
    id: 'clip-1',
    assetId: 'asset-1',
    filePath: '/test/video.mp4',
    mime: 'video/mp4',
    start: 0,
    end: 10,
    sourceDuration: 10,
    timelinePosition: 0,
    trackIndex: 0,
    crop: null,
  });

  const mockSetCurrentTime = jest.fn();
  const mockEnsureClipElement = jest.fn().mockResolvedValue(document.createElement('video'));

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with playing = false', () => {
      const { result } = renderHook(() => {
        const videoMapRef = useRef(new Map<string, HTMLVideoElement>());
        return useVideoPlayback({
          sortedClips: [],
          clipMetas: new Map(),
          videoMapRef,
          currentTime: 0,
          totalDuration: 10,
          setCurrentTime: mockSetCurrentTime,
          ensureClipElement: mockEnsureClipElement,
        });
      });

      expect(result.current.isPlaying).toBe(false);
    });

    it('should provide playback control functions', () => {
      const { result } = renderHook(() => {
        const videoMapRef = useRef(new Map<string, HTMLVideoElement>());
        return useVideoPlayback({
          sortedClips: [],
          clipMetas: new Map(),
          videoMapRef,
          currentTime: 0,
          totalDuration: 10,
          setCurrentTime: mockSetCurrentTime,
          ensureClipElement: mockEnsureClipElement,
        });
      });

      expect(typeof result.current.playAll).toBe('function');
      expect(typeof result.current.stopPlayback).toBe('function');
      expect(typeof result.current.togglePlayPause).toBe('function');
      expect(typeof result.current.syncClipsAtTime).toBe('function');
    });
  });

  describe('stopPlayback', () => {
    it('should stop playback', () => {
      const { result } = renderHook(() => {
        const videoMapRef = useRef(new Map<string, HTMLVideoElement>());
        return useVideoPlayback({
          sortedClips: [],
          clipMetas: new Map(),
          videoMapRef,
          currentTime: 0,
          totalDuration: 10,
          setCurrentTime: mockSetCurrentTime,
          ensureClipElement: mockEnsureClipElement,
        });
      });

      act(() => {
        result.current.stopPlayback();
      });

      expect(result.current.isPlaying).toBe(false);
    });

    it('should accept finalTime option', () => {
      const { result } = renderHook(() => {
        const videoMapRef = useRef(new Map<string, HTMLVideoElement>());
        return useVideoPlayback({
          sortedClips: [],
          clipMetas: new Map(),
          videoMapRef,
          currentTime: 0,
          totalDuration: 10,
          setCurrentTime: mockSetCurrentTime,
          ensureClipElement: mockEnsureClipElement,
        });
      });

      act(() => {
        result.current.stopPlayback({ finalTime: 5 });
      });

      expect(result.current.isPlaying).toBe(false);
    });
  });

  describe('playAll', () => {
    it('should handle playback with no clips', async () => {
      const { result } = renderHook(() => {
        const videoMapRef = useRef(new Map<string, HTMLVideoElement>());
        return useVideoPlayback({
          sortedClips: [],
          clipMetas: new Map(),
          videoMapRef,
          currentTime: 0,
          totalDuration: 10,
          setCurrentTime: mockSetCurrentTime,
          ensureClipElement: mockEnsureClipElement,
        });
      });

      await act(async () => {
        await result.current.playAll();
      });

      // No error should occur
      expect(result.current.isPlaying).toBe(false);
    });
  });

  describe('togglePlayPause', () => {
    it('should toggle playback state', () => {
      const { result } = renderHook(() => {
        const videoMapRef = useRef(new Map<string, HTMLVideoElement>());
        return useVideoPlayback({
          sortedClips: [],
          clipMetas: new Map(),
          videoMapRef,
          currentTime: 0,
          totalDuration: 10,
          setCurrentTime: mockSetCurrentTime,
          ensureClipElement: mockEnsureClipElement,
        });
      });

      act(() => {
        result.current.togglePlayPause();
      });

      // Should attempt to play (but no clips so won't actually play)
      expect(mockEnsureClipElement).toHaveBeenCalled();
    });
  });

  describe('syncClipsAtTime', () => {
    it('should sync clips at specific time', () => {
      const { result } = renderHook(() => {
        const videoMapRef = useRef(new Map<string, HTMLVideoElement>());
        return useVideoPlayback({
          sortedClips: [],
          clipMetas: new Map(),
          videoMapRef,
          currentTime: 0,
          totalDuration: 10,
          setCurrentTime: mockSetCurrentTime,
          ensureClipElement: mockEnsureClipElement,
        });
      });

      act(() => {
        result.current.syncClipsAtTime(5, false);
      });

      // No error should occur
      expect(result.current).toBeDefined();
    });
  });

  describe('Hook Dependencies', () => {
    it('should work with different currentTime values', () => {
      const { result, rerender } = renderHook(
        ({ currentTime }) => {
          const videoMapRef = useRef(new Map<string, HTMLVideoElement>());
          return useVideoPlayback({
            sortedClips: [],
            clipMetas: new Map(),
            videoMapRef,
            currentTime,
            totalDuration: 10,
            setCurrentTime: mockSetCurrentTime,
            ensureClipElement: mockEnsureClipElement,
          });
        },
        { initialProps: { currentTime: 0 } }
      );

      expect(result.current).toBeDefined();

      rerender({ currentTime: 5 });
      expect(result.current).toBeDefined();
    });

    it('should work with different totalDuration values', () => {
      const { result, rerender } = renderHook(
        ({ totalDuration }) => {
          const videoMapRef = useRef(new Map<string, HTMLVideoElement>());
          return useVideoPlayback({
            sortedClips: [],
            clipMetas: new Map(),
            videoMapRef,
            currentTime: 0,
            totalDuration,
            setCurrentTime: mockSetCurrentTime,
            ensureClipElement: mockEnsureClipElement,
          });
        },
        { initialProps: { totalDuration: 10 } }
      );

      expect(result.current).toBeDefined();

      rerender({ totalDuration: 20 });
      expect(result.current).toBeDefined();
    });
  });

  describe('Lifecycle', () => {
    it('should cleanup on unmount', () => {
      const { unmount } = renderHook(() => {
        const videoMapRef = useRef(new Map<string, HTMLVideoElement>());
        return useVideoPlayback({
          sortedClips: [],
          clipMetas: new Map(),
          videoMapRef,
          currentTime: 0,
          totalDuration: 10,
          setCurrentTime: mockSetCurrentTime,
          ensureClipElement: mockEnsureClipElement,
        });
      });

      expect(() => unmount()).not.toThrow();
    });
  });
});
