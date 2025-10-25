/**
 * Test Suite: Zoom Slice
 *
 * Tests zoom and viewport control operations including:
 * - Setting zoom level
 * - Zoom presets
 * - Fit to timeline/selection
 * - Snap controls
 */

import { renderHook, act } from '@testing-library/react';
import { useEditorStore } from '@/state/useEditorStore';
import type { Timeline, Clip } from '@/types/timeline';
import { ZOOM_CONSTANTS } from '@/lib/constants';

const { MIN_ZOOM, MAX_ZOOM, DEFAULT_ZOOM } = ZOOM_CONSTANTS;

describe('Zoom Slice', () => {
  const createMockTimeline = (): Timeline => ({
    projectId: 'test-project',
    clips: [],
    output: {
      width: 1920,
      height: 1080,
      fps: 30,
      vBitrateK: 5000,
      aBitrateK: 128,
      format: 'mp4',
    },
  });

  const createMockClip = (overrides?: Partial<Clip>): Clip => ({
    id: `clip-${Date.now()}-${Math.random()}`,
    assetId: 'asset-1',
    filePath: '/test/video.mp4',
    mime: 'video/mp4',
    start: 0,
    end: 10,
    sourceDuration: 10,
    timelinePosition: 0,
    trackIndex: 0,
    crop: null,
    ...overrides,
  });

  beforeEach((): void => {
    const { result } = renderHook(() => useEditorStore());
    act(() => {
      result.current.setTimeline(null);
    });
  });

  describe('setZoom', () => {
    it('should set zoom level', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.setZoom(50);
      });

      expect(result.current.zoom).toBe(50);
    });

    it('should clamp zoom to minimum', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.setZoom(5); // Below MIN_ZOOM
      });

      expect(result.current.zoom).toBe(MIN_ZOOM);
    });

    it('should clamp zoom to maximum', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.setZoom(300); // Above MAX_ZOOM
      });

      expect(result.current.zoom).toBe(MAX_ZOOM);
    });

    it('should initialize with DEFAULT_ZOOM', () => {
      const { result } = renderHook(() => useEditorStore());

      expect(result.current.zoom).toBe(DEFAULT_ZOOM);
    });
  });

  describe('toggleSnap', () => {
    it('should initialize with snap enabled', () => {
      const { result } = renderHook(() => useEditorStore());

      expect(result.current.snapEnabled).toBe(true);
    });

    it('should toggle snap off', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.toggleSnap();
      });

      expect(result.current.snapEnabled).toBe(false);
    });

    it('should toggle snap back on', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.toggleSnap();
        result.current.toggleSnap();
      });

      expect(result.current.snapEnabled).toBe(true);
    });
  });

  describe('setSnapGridInterval', () => {
    it('should set snap grid interval', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.setSnapGridInterval(0.5);
      });

      expect(result.current.snapGridInterval).toBe(0.5);
    });

    it('should clamp interval to minimum', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.setSnapGridInterval(0.001); // Too small
      });

      expect(result.current.snapGridInterval).toBe(0.01);
    });

    it('should clamp interval to maximum', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.setSnapGridInterval(20); // Too large
      });

      expect(result.current.snapGridInterval).toBe(10);
    });

    it('should initialize with default interval', () => {
      const { result } = renderHook(() => useEditorStore());

      expect(result.current.snapGridInterval).toBe(0.1);
    });
  });

  describe('calculateFitToTimelineZoom', () => {
    it('should calculate zoom to fit entire timeline', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ timelinePosition: 0, start: 0, end: 10 });
      const clip2 = createMockClip({ timelinePosition: 10, start: 0, end: 10 });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip1);
        result.current.addClip(clip2);
      });

      const zoom = result.current.calculateFitToTimelineZoom(1000);
      expect(zoom).toBeGreaterThan(0);
      expect(zoom).toBeLessThanOrEqual(MAX_ZOOM);
    });

    it('should return DEFAULT_ZOOM for empty timeline', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();

      act(() => {
        result.current.setTimeline(mockTimeline);
      });

      const zoom = result.current.calculateFitToTimelineZoom(1000);
      expect(zoom).toBe(DEFAULT_ZOOM);
    });

    it('should return DEFAULT_ZOOM for invalid viewport width', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip = createMockClip();

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip);
      });

      const zoom = result.current.calculateFitToTimelineZoom(0);
      expect(zoom).toBe(DEFAULT_ZOOM);
    });

    it('should clamp calculated zoom to valid range', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip = createMockClip({ timelinePosition: 0, start: 0, end: 1000 });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip);
      });

      const zoom = result.current.calculateFitToTimelineZoom(100);
      expect(zoom).toBeGreaterThanOrEqual(MIN_ZOOM);
      expect(zoom).toBeLessThanOrEqual(MAX_ZOOM);
    });
  });

  describe('calculateFitToSelectionZoom', () => {
    it('should calculate zoom to fit selected clips', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1', timelinePosition: 0, start: 0, end: 5 });
      const clip2 = createMockClip({ id: 'clip-2', timelinePosition: 5, start: 0, end: 5 });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip1);
        result.current.addClip(clip2);
        result.current.selectClip('clip-1');
        result.current.selectClip('clip-2', true);
      });

      const zoom = result.current.calculateFitToSelectionZoom(1000);
      expect(zoom).toBeGreaterThan(0);
      expect(zoom).toBeLessThanOrEqual(MAX_ZOOM);
    });

    it('should return current zoom if no clips selected', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.setZoom(75);
      });

      const zoom = result.current.calculateFitToSelectionZoom(1000);
      expect(zoom).toBe(75);
    });

    it('should return current zoom for invalid viewport width', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip = createMockClip({ id: 'clip-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip);
        result.current.selectClip('clip-1');
        result.current.setZoom(90);
      });

      const zoom = result.current.calculateFitToSelectionZoom(0);
      expect(zoom).toBe(90);
    });
  });

  describe('fitToTimeline', () => {
    it('should set zoom to fit entire timeline', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip = createMockClip({ timelinePosition: 0, start: 0, end: 10 });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip);
        result.current.fitToTimeline(1000);
      });

      expect(result.current.zoom).toBeGreaterThan(0);
      expect(result.current.zoom).toBeLessThanOrEqual(MAX_ZOOM);
    });

    it('should not change zoom for empty timeline', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const initialZoom = DEFAULT_ZOOM;

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.fitToTimeline(1000);
      });

      expect(result.current.zoom).toBe(initialZoom);
    });
  });

  describe('fitToSelection', () => {
    it('should set zoom to fit selected clips', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip = createMockClip({ id: 'clip-1', timelinePosition: 0, start: 0, end: 10 });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip);
        result.current.selectClip('clip-1');
        result.current.fitToSelection(1000);
      });

      expect(result.current.zoom).toBeGreaterThan(0);
      expect(result.current.zoom).toBeLessThanOrEqual(MAX_ZOOM);
    });

    it('should not change zoom if no clips selected', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const initialZoom = 75;

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.setZoom(initialZoom);
        result.current.fitToSelection(1000);
      });

      expect(result.current.zoom).toBe(initialZoom);
    });
  });

  describe('setZoomPreset', () => {
    it('should set zoom to 25% preset', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.setZoomPreset(25);
      });

      expect(result.current.zoom).toBe(DEFAULT_ZOOM * 0.25);
    });

    it('should set zoom to 50% preset', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.setZoomPreset(50);
      });

      expect(result.current.zoom).toBe(DEFAULT_ZOOM * 0.5);
    });

    it('should set zoom to 100% preset', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.setZoomPreset(100);
      });

      expect(result.current.zoom).toBe(DEFAULT_ZOOM);
    });

    it('should set zoom to 200% preset', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.setZoomPreset(200);
      });

      expect(result.current.zoom).toBe(DEFAULT_ZOOM * 2);
    });

    it('should set zoom to 400% preset', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.setZoomPreset(400);
      });

      expect(result.current.zoom).toBe(DEFAULT_ZOOM * 4);
    });

    it('should clamp preset zoom to valid range', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.setZoomPreset(400);
      });

      expect(result.current.zoom).toBeLessThanOrEqual(MAX_ZOOM);
    });
  });
});
