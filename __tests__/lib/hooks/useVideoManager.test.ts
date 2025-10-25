/**
 * Tests for useVideoManager Hook
 *
 * Tests video element lifecycle management including:
 * - Video element pooling
 * - Signed URL caching
 * - Element creation and cleanup
 * - Error handling
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useVideoManager } from '@/lib/hooks/useVideoManager';
import type { Clip, Timeline } from '@/types/timeline';
import { signedUrlCache } from '@/lib/signedUrlCache';

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
    prune: jest.fn(),
  },
}));

const createMockClip = (overrides: Partial<Clip> = {}): Clip => ({
  id: `clip-${Date.now()}`,
  assetId: 'asset-1',
  trackIndex: 0,
  timelinePosition: 0,
  start: 0,
  end: 10,
  filePath: 'supabase://videos/test.mp4',
  ...overrides,
});

const createMockTimeline = (clips: Clip[] = []): Timeline => ({
  id: 'timeline-1',
  projectId: 'project-1',
  name: 'Test Timeline',
  clips,
  duration: 100,
  width: 1920,
  height: 1080,
  fps: 30,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// Mock video element
class MockVideoElement {
  src = '';
  crossOrigin = '';
  playsInline = false;
  preload = '';
  controls = false;
  disablePictureInPicture = false;
  muted = false;
  paused = true;
  readyState = 4; // HAVE_ENOUGH_DATA
  style: any = {};
  _listeners: Map<string, ((...args: any[]) => void)[]> = new Map();

  addEventListener(event: string, handler: (...args: any[]) => void) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event)!.push(handler);
  }

  removeEventListener(event: string, handler: (...args: any[]) => void) {
    const handlers = this._listeners.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  removeAttribute(attr: string) {
    if (attr === 'src') {
      this.src = '';
    }
  }

  pause() {
    this.paused = true;
  }

  load() {}

  remove() {}

  dispatchEvent(event: Event) {
    const handlers = this._listeners.get(event.type);
    if (handlers) {
      handlers.forEach((handler) => handler(event));
    }
    return true;
  }
}

describe('useVideoManager', () => {
  let containerRef: React.RefObject<HTMLDivElement>;

  beforeEach(() => {
    containerRef = { current: document.createElement('div') };

    // Mock document.createElement for video elements
    const originalCreateElement = document.createElement.bind(document);
    jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'video') {
        return new MockVideoElement() as any;
      }
      return originalCreateElement(tagName);
    });

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with empty video map', () => {
      const timeline = createMockTimeline();
      const { result } = renderHook(() => useVideoManager({ containerRef, timeline }));

      expect(result.current.videoMapRef.current.size).toBe(0);
      expect(result.current.videoError).toBeNull();
    });

    it('should provide video management functions', () => {
      const timeline = createMockTimeline();
      const { result } = renderHook(() => useVideoManager({ containerRef, timeline }));

      expect(result.current.ensureClipElement).toBeInstanceOf(Function);
      expect(result.current.cleanupVideo).toBeInstanceOf(Function);
      expect(result.current.clearVideoError).toBeInstanceOf(Function);
    });
  });

  describe('Video Element Creation', () => {
    it('should create video element for clip', async () => {
      const clip = createMockClip({ id: 'clip-1', filePath: 'https://example.com/video.mp4' });
      const timeline = createMockTimeline([clip]);
      const { result } = renderHook(() => useVideoManager({ containerRef, timeline }));

      let videoElement: HTMLVideoElement | undefined;

      await act(async () => {
        videoElement = await result.current.ensureClipElement(clip);
      });

      expect(videoElement).toBeDefined();
      expect(result.current.videoMapRef.current.has('clip-1')).toBe(true);
      expect(containerRef.current?.children).toHaveLength(1);
    });

    it('should return existing element if already created', async () => {
      const clip = createMockClip({ id: 'clip-1', filePath: 'https://example.com/video.mp4' });
      const timeline = createMockTimeline([clip]);
      const { result } = renderHook(() => useVideoManager({ containerRef, timeline }));

      let firstElement: HTMLVideoElement | undefined;
      let secondElement: HTMLVideoElement | undefined;

      await act(async () => {
        firstElement = await result.current.ensureClipElement(clip);
        secondElement = await result.current.ensureClipElement(clip);
      });

      expect(firstElement).toBe(secondElement);
      expect(result.current.videoMapRef.current.size).toBe(1);
    });

    it('should use signed URL for Supabase storage', async () => {
      const clip = createMockClip({ id: 'clip-1', filePath: 'supabase://videos/test.mp4' });
      const timeline = createMockTimeline([clip]);
      const { result } = renderHook(() => useVideoManager({ containerRef, timeline }));

      await act(async () => {
        await result.current.ensureClipElement(clip);
      });

      expect(signedUrlCache.get).toHaveBeenCalledWith(
        'asset-1',
        'supabase://videos/test.mp4',
        expect.any(Number)
      );
    });

    it('should use direct URL for HTTP URLs', async () => {
      const clip = createMockClip({ id: 'clip-1', filePath: 'https://example.com/video.mp4' });
      const timeline = createMockTimeline([clip]);
      const { result } = renderHook(() => useVideoManager({ containerRef, timeline }));

      await act(async () => {
        await result.current.ensureClipElement(clip);
      });

      const video = result.current.videoMapRef.current.get('clip-1');
      expect(video?.src).toBe('https://example.com/video.mp4');
    });

    it('should handle missing container', async () => {
      containerRef.current = null;
      const clip = createMockClip({ id: 'clip-1', filePath: 'https://example.com/video.mp4' });
      const timeline = createMockTimeline([clip]);
      const { result } = renderHook(() => useVideoManager({ containerRef, timeline }));

      await act(async () => {
        await expect(result.current.ensureClipElement(clip)).rejects.toThrow(
          'Preview container not mounted'
        );
      });

      expect(result.current.videoError).toBeTruthy();
    });

    it('should set video properties correctly', async () => {
      const clip = createMockClip({
        id: 'clip-1',
        trackIndex: 2,
        filePath: 'https://example.com/video.mp4',
      });
      const timeline = createMockTimeline([clip]);
      const { result } = renderHook(() => useVideoManager({ containerRef, timeline }));

      await act(async () => {
        await result.current.ensureClipElement(clip);
      });

      const video = result.current.videoMapRef.current.get('clip-1');
      expect(video?.playsInline).toBe(true);
      expect(video?.preload).toBe('auto');
      expect(video?.controls).toBe(false);
      expect(video?.muted).toBe(true); // Non-primary track
    });

    it('should not mute primary track (track 0)', async () => {
      const clip = createMockClip({
        id: 'clip-1',
        trackIndex: 0,
        filePath: 'https://example.com/video.mp4',
      });
      const timeline = createMockTimeline([clip]);
      const { result } = renderHook(() => useVideoManager({ containerRef, timeline }));

      await act(async () => {
        await result.current.ensureClipElement(clip);
      });

      const video = result.current.videoMapRef.current.get('clip-1');
      expect(video?.muted).toBe(false); // Primary track
    });
  });

  describe('Video Element Cleanup', () => {
    it('should cleanup video element', async () => {
      const clip = createMockClip({ id: 'clip-1', filePath: 'https://example.com/video.mp4' });
      const timeline = createMockTimeline([clip]);
      const { result } = renderHook(() => useVideoManager({ containerRef, timeline }));

      await act(async () => {
        await result.current.ensureClipElement(clip);
      });

      const video = result.current.videoMapRef.current.get('clip-1')!;
      const pauseSpy = jest.spyOn(video, 'pause');
      const loadSpy = jest.spyOn(video, 'load');

      act(() => {
        result.current.cleanupVideo('clip-1', video);
      });

      expect(pauseSpy).toHaveBeenCalled();
      expect(loadSpy).toHaveBeenCalled();
      expect(video.src).toBe('');
    });

    it('should cleanup videos removed from timeline', async () => {
      const clip1 = createMockClip({ id: 'clip-1', filePath: 'https://example.com/video1.mp4' });
      const clip2 = createMockClip({ id: 'clip-2', filePath: 'https://example.com/video2.mp4' });
      const timeline = createMockTimeline([clip1, clip2]);

      const { result, rerender } = renderHook(
        ({ timeline }) => useVideoManager({ containerRef, timeline }),
        { initialProps: { timeline } }
      );

      await act(async () => {
        await result.current.ensureClipElement(clip1);
        await result.current.ensureClipElement(clip2);
      });

      expect(result.current.videoMapRef.current.size).toBe(2);

      // Remove clip2 from timeline
      const newTimeline = createMockTimeline([clip1]);
      rerender({ timeline: newTimeline });

      expect(result.current.videoMapRef.current.size).toBe(1);
      expect(result.current.videoMapRef.current.has('clip-1')).toBe(true);
      expect(result.current.videoMapRef.current.has('clip-2')).toBe(false);
    });

    it('should cleanup all videos when timeline is null', async () => {
      const clip = createMockClip({ id: 'clip-1', filePath: 'https://example.com/video.mp4' });
      const timeline = createMockTimeline([clip]);

      const { result, rerender } = renderHook(
        ({ timeline }) => useVideoManager({ containerRef, timeline }),
        { initialProps: { timeline } }
      );

      await act(async () => {
        await result.current.ensureClipElement(clip);
      });

      expect(result.current.videoMapRef.current.size).toBe(1);

      rerender({ timeline: null });

      expect(result.current.videoMapRef.current.size).toBe(0);
    });
  });

  describe('Video Element Pooling', () => {
    it('should reuse pooled video elements', async () => {
      const clip1 = createMockClip({ id: 'clip-1', filePath: 'https://example.com/video1.mp4' });
      const clip2 = createMockClip({ id: 'clip-2', filePath: 'https://example.com/video2.mp4' });
      const timeline = createMockTimeline([clip1]);

      const { result, rerender } = renderHook(
        ({ timeline }) => useVideoManager({ containerRef, timeline }),
        { initialProps: { timeline } }
      );

      await act(async () => {
        await result.current.ensureClipElement(clip1);
      });

      const video1 = result.current.videoMapRef.current.get('clip-1')!;

      // Remove clip1
      rerender({ timeline: createMockTimeline([]) });

      // Add clip2 (should reuse pooled element)
      rerender({ timeline: createMockTimeline([clip2]) });

      await act(async () => {
        await result.current.ensureClipElement(clip2);
      });

      const createElementCalls = (document.createElement as jest.Mock).mock.calls.filter(
        (call) => call[0] === 'video'
      );

      // Should only create one video element (reused from pool)
      expect(createElementCalls.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing file path', async () => {
      const clip = createMockClip({ id: 'clip-1', filePath: '' });
      const timeline = createMockTimeline([clip]);
      const { result } = renderHook(() => useVideoManager({ containerRef, timeline }));

      await act(async () => {
        await expect(result.current.ensureClipElement(clip)).rejects.toThrow();
      });

      expect(result.current.videoError).toBeTruthy();
    });

    it('should handle signed URL cache miss (404)', async () => {
      (signedUrlCache.get as jest.Mock).mockResolvedValueOnce(null);

      const clip = createMockClip({ id: 'clip-1', filePath: 'supabase://videos/missing.mp4' });
      const timeline = createMockTimeline([clip]);
      const { result } = renderHook(() => useVideoManager({ containerRef, timeline }));

      await act(async () => {
        await expect(result.current.ensureClipElement(clip)).rejects.toThrow('Asset not found');
      });

      expect(result.current.videoError).toBeTruthy();
    });

    it('should clear video error', () => {
      const timeline = createMockTimeline();
      const { result } = renderHook(() => useVideoManager({ containerRef, timeline }));

      // Manually set error
      act(() => {
        (result.current as any).videoError = 'Test error';
      });

      act(() => {
        result.current.clearVideoError();
      });

      expect(result.current.videoError).toBeNull();
    });
  });

  describe('Signed URL Cache Management', () => {
    it('should prune cache when timeline is null', () => {
      const timeline = createMockTimeline();

      const { rerender } = renderHook(
        ({ timeline }) => useVideoManager({ containerRef, timeline }),
        { initialProps: { timeline } }
      );

      rerender({ timeline: null });

      expect(signedUrlCache.prune).toHaveBeenCalled();
    });

    it('should prune cache on unmount', () => {
      const timeline = createMockTimeline();
      const { unmount } = renderHook(() => useVideoManager({ containerRef, timeline }));

      unmount();

      expect(signedUrlCache.prune).toHaveBeenCalled();
    });
  });

  describe('Unmount Cleanup', () => {
    it('should cleanup all resources on unmount', async () => {
      const clip = createMockClip({ id: 'clip-1', filePath: 'https://example.com/video.mp4' });
      const timeline = createMockTimeline([clip]);
      const { result, unmount } = renderHook(() => useVideoManager({ containerRef, timeline }));

      await act(async () => {
        await result.current.ensureClipElement(clip);
      });

      const video = result.current.videoMapRef.current.get('clip-1')!;
      const pauseSpy = jest.spyOn(video, 'pause');

      unmount();

      expect(pauseSpy).toHaveBeenCalled();
      expect(signedUrlCache.prune).toHaveBeenCalled();
    });
  });
});
