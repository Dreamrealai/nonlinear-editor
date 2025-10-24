/**
 * Comprehensive tests for useTimelineCalculations hook
 */

import { renderHook } from '@testing-library/react';
import { useTimelineCalculations } from '@/lib/hooks/useTimelineCalculations';
import type { Timeline, Clip } from '@/types/timeline';

describe('useTimelineCalculations', () => {
  const createClip = (
    id: string,
    start: number,
    end: number,
    timelinePosition: number,
    trackIndex: number
  ): Clip => ({
    id,
    assetId: `asset-${id}`,
    start,
    end,
    timelinePosition,
    trackIndex,
    effects: [],
    volume: 1,
  });

  const defaultOptions = {
    timeline: null,
    forcedTrackCount: null,
    scrollLeft: 0,
    viewportWidth: 1000,
    zoom: 10,
  };

  describe('Timeline Duration', () => {
    it('should return minimum duration for empty timeline', () => {
      const timeline: Timeline = {
        clips: [],
        textOverlays: [],
        transitions: [],
      };

      const { result } = renderHook(() =>
        useTimelineCalculations({
          ...defaultOptions,
          timeline,
        })
      );

      expect(result.current.timelineDuration).toBe(30);
    });

    it('should calculate duration from clips', () => {
      const timeline: Timeline = {
        clips: [createClip('clip-1', 0, 5, 0, 0), createClip('clip-2', 0, 3, 10, 0)],
        textOverlays: [],
        transitions: [],
      };

      const { result } = renderHook(() =>
        useTimelineCalculations({
          ...defaultOptions,
          timeline,
        })
      );

      // clip-1 ends at 5 (0 + 5)
      // clip-2 ends at 13 (10 + 3)
      expect(result.current.timelineDuration).toBe(13);
    });

    it('should calculate duration from text overlays', () => {
      const timeline: Timeline = {
        clips: [],
        textOverlays: [
          {
            id: 'overlay-1',
            text: 'Test',
            timelinePosition: 0,
            duration: 5,
            style: {},
          },
          {
            id: 'overlay-2',
            text: 'Test 2',
            timelinePosition: 10,
            duration: 8,
            style: {},
          },
        ],
        transitions: [],
      };

      const { result } = renderHook(() =>
        useTimelineCalculations({
          ...defaultOptions,
          timeline,
        })
      );

      // overlay-1 ends at 5 (0 + 5)
      // overlay-2 ends at 18 (10 + 8)
      expect(result.current.timelineDuration).toBe(18);
    });

    it('should calculate duration from both clips and overlays', () => {
      const timeline: Timeline = {
        clips: [createClip('clip-1', 0, 5, 0, 0)],
        textOverlays: [
          {
            id: 'overlay-1',
            text: 'Test',
            timelinePosition: 10,
            duration: 15,
            style: {},
          },
        ],
        transitions: [],
      };

      const { result } = renderHook(() =>
        useTimelineCalculations({
          ...defaultOptions,
          timeline,
        })
      );

      // clip-1 ends at 5
      // overlay-1 ends at 25 (10 + 15)
      expect(result.current.timelineDuration).toBe(25);
    });

    it('should use minimum duration if calculated duration is less', () => {
      const timeline: Timeline = {
        clips: [createClip('clip-1', 0, 2, 0, 0)],
        textOverlays: [],
        transitions: [],
      };

      const { result } = renderHook(() =>
        useTimelineCalculations({
          ...defaultOptions,
          timeline,
        })
      );

      expect(result.current.timelineDuration).toBe(30);
    });

    it('should handle null timeline', () => {
      const { result } = renderHook(() =>
        useTimelineCalculations({
          ...defaultOptions,
          timeline: null,
        })
      );

      expect(result.current.timelineDuration).toBe(30);
    });

    it('should recalculate when timeline changes', () => {
      const timeline1: Timeline = {
        clips: [createClip('clip-1', 0, 5, 0, 0)],
        textOverlays: [],
        transitions: [],
      };

      const { result, rerender } = renderHook(
        ({ timeline }) => useTimelineCalculations({ ...defaultOptions, timeline }),
        { initialProps: { timeline: timeline1 } }
      );

      expect(result.current.timelineDuration).toBe(30);

      const timeline2: Timeline = {
        clips: [createClip('clip-1', 0, 5, 0, 0), createClip('clip-2', 0, 10, 30, 0)],
        textOverlays: [],
        transitions: [],
      };

      rerender({ timeline: timeline2 });

      expect(result.current.timelineDuration).toBe(40);
    });
  });

  describe('Track Count', () => {
    it('should return minimum track count for empty timeline', () => {
      const timeline: Timeline = {
        clips: [],
        textOverlays: [],
        transitions: [],
      };

      const { result } = renderHook(() =>
        useTimelineCalculations({
          ...defaultOptions,
          timeline,
        })
      );

      expect(result.current.numTracks).toBe(3); // MIN_TRACKS
    });

    it('should calculate from clip track indices', () => {
      const timeline: Timeline = {
        clips: [
          createClip('clip-1', 0, 5, 0, 0),
          createClip('clip-2', 0, 3, 10, 2),
          createClip('clip-3', 0, 4, 20, 1),
        ],
        textOverlays: [],
        transitions: [],
      };

      const { result } = renderHook(() =>
        useTimelineCalculations({
          ...defaultOptions,
          timeline,
        })
      );

      // Max track index is 2, so numTracks should be 3
      expect(result.current.numTracks).toBe(3);
    });

    it('should respect forced track count', () => {
      const timeline: Timeline = {
        clips: [createClip('clip-1', 0, 5, 0, 0)],
        textOverlays: [],
        transitions: [],
      };

      const { result } = renderHook(() =>
        useTimelineCalculations({
          ...defaultOptions,
          timeline,
          forcedTrackCount: 10,
        })
      );

      expect(result.current.numTracks).toBe(10);
    });

    it('should use greater of calculated and forced track count', () => {
      const timeline: Timeline = {
        clips: [createClip('clip-1', 0, 5, 0, 0), createClip('clip-2', 0, 3, 10, 7)],
        textOverlays: [],
        transitions: [],
      };

      const { result } = renderHook(() =>
        useTimelineCalculations({
          ...defaultOptions,
          timeline,
          forcedTrackCount: 5,
        })
      );

      // Max track index is 7, so numTracks should be 8
      expect(result.current.numTracks).toBe(8);
    });

    it('should handle null timeline', () => {
      const { result } = renderHook(() =>
        useTimelineCalculations({
          ...defaultOptions,
          timeline: null,
        })
      );

      expect(result.current.numTracks).toBe(3); // MIN_TRACKS
    });

    it('should recalculate when forcedTrackCount changes', () => {
      const timeline: Timeline = {
        clips: [createClip('clip-1', 0, 5, 0, 0)],
        textOverlays: [],
        transitions: [],
      };

      const { result, rerender } = renderHook(
        ({ forcedTrackCount }) =>
          useTimelineCalculations({ ...defaultOptions, timeline, forcedTrackCount }),
        { initialProps: { forcedTrackCount: null } }
      );

      expect(result.current.numTracks).toBe(3);

      rerender({ forcedTrackCount: 7 });

      expect(result.current.numTracks).toBe(7);
    });
  });

  describe('Visible Clips (Virtualization)', () => {
    it('should return empty array for null timeline', () => {
      const { result } = renderHook(() =>
        useTimelineCalculations({
          ...defaultOptions,
          timeline: null,
        })
      );

      expect(result.current.visibleClips).toEqual([]);
    });

    it('should return empty array for timeline with no clips', () => {
      const timeline: Timeline = {
        clips: [],
        textOverlays: [],
        transitions: [],
      };

      const { result } = renderHook(() =>
        useTimelineCalculations({
          ...defaultOptions,
          timeline,
        })
      );

      expect(result.current.visibleClips).toEqual([]);
    });

    it('should return all clips in viewport', () => {
      const clips = [
        createClip('clip-1', 0, 5, 0, 0), // 0-5s
        createClip('clip-2', 0, 5, 10, 0), // 10-15s
        createClip('clip-3', 0, 5, 20, 0), // 20-25s
      ];

      const timeline: Timeline = {
        clips,
        textOverlays: [],
        transitions: [],
      };

      const { result } = renderHook(() =>
        useTimelineCalculations({
          ...defaultOptions,
          timeline,
          scrollLeft: 0,
          viewportWidth: 300, // 30s visible (300px / 10 zoom)
          zoom: 10,
        })
      );

      expect(result.current.visibleClips).toHaveLength(3);
    });

    it('should filter clips outside viewport', () => {
      const clips = [
        createClip('clip-1', 0, 5, 0, 0), // 0-5s
        createClip('clip-2', 0, 5, 50, 0), // 50-55s
        createClip('clip-3', 0, 5, 100, 0), // 100-105s
      ];

      const timeline: Timeline = {
        clips,
        textOverlays: [],
        transitions: [],
      };

      const { result } = renderHook(() =>
        useTimelineCalculations({
          ...defaultOptions,
          timeline,
          scrollLeft: 0,
          viewportWidth: 300, // 30s visible
          zoom: 10,
        })
      );

      // Only clip-1 should be visible (with overscan)
      expect(result.current.visibleClips).toHaveLength(1);
      expect(result.current.visibleClips[0].id).toBe('clip-1');
    });

    it('should include clips in overscan area', () => {
      const clips = [
        createClip('clip-1', 0, 5, 0, 0), // 0-5s
        createClip('clip-2', 0, 5, 40, 0), // 40-45s
        createClip('clip-3', 0, 5, 60, 0), // 60-65s
      ];

      const timeline: Timeline = {
        clips,
        textOverlays: [],
        transitions: [],
      };

      const { result } = renderHook(() =>
        useTimelineCalculations({
          ...defaultOptions,
          timeline,
          scrollLeft: 100, // Start at 10s
          viewportWidth: 300, // 30s visible (ends at 40s)
          zoom: 10,
        })
      );

      // Should include clip-2 due to overscan (500px = 50s)
      expect(result.current.visibleClips.length).toBeGreaterThan(0);
      expect(result.current.visibleClips.some((c) => c.id === 'clip-2')).toBe(true);
    });

    it('should update when scrollLeft changes', () => {
      const clips = [
        createClip('clip-1', 0, 5, 0, 0),
        createClip('clip-2', 0, 5, 50, 0),
        createClip('clip-3', 0, 5, 100, 0),
      ];

      const timeline: Timeline = {
        clips,
        textOverlays: [],
        transitions: [],
      };

      const { result, rerender } = renderHook(
        ({ scrollLeft }) =>
          useTimelineCalculations({
            ...defaultOptions,
            timeline,
            scrollLeft,
            viewportWidth: 300,
            zoom: 10,
          }),
        { initialProps: { scrollLeft: 0 } }
      );

      const initialVisible = result.current.visibleClips;

      // Scroll far to the right
      rerender({ scrollLeft: 1000 });

      expect(result.current.visibleClips).not.toEqual(initialVisible);
    });

    it('should update when zoom changes', () => {
      const clips = [
        createClip('clip-1', 0, 5, 0, 0),
        createClip('clip-2', 0, 5, 50, 0),
        createClip('clip-3', 0, 5, 100, 0),
      ];

      const timeline: Timeline = {
        clips,
        textOverlays: [],
        transitions: [],
      };

      const { result, rerender } = renderHook(
        ({ zoom }) =>
          useTimelineCalculations({
            ...defaultOptions,
            timeline,
            scrollLeft: 0,
            viewportWidth: 300,
            zoom,
          }),
        { initialProps: { zoom: 10 } }
      );

      const visibleAtZoom10 = result.current.visibleClips.length;

      // Zoom in (more pixels per second, less time visible)
      rerender({ zoom: 20 });

      // Should show fewer clips when zoomed in
      expect(result.current.visibleClips.length).toBeLessThanOrEqual(visibleAtZoom10);
    });

    it('should handle partially visible clips', () => {
      const clips = [
        createClip('clip-1', 0, 10, 0, 0), // 0-10s
        createClip('clip-2', 0, 10, 25, 0), // 25-35s
      ];

      const timeline: Timeline = {
        clips,
        textOverlays: [],
        transitions: [],
      };

      const { result } = renderHook(() =>
        useTimelineCalculations({
          ...defaultOptions,
          timeline,
          scrollLeft: 50, // Start at 5s (50px / 10 zoom)
          viewportWidth: 200, // 20s visible (200px / 10 zoom)
          zoom: 10,
        })
      );

      // Viewport is 5s-25s, should include clip-1 (ends at 10s) and clip-2 (starts at 25s)
      expect(result.current.visibleClips.length).toBeGreaterThan(0);
    });

    it('should handle clips with different durations', () => {
      const clips = [
        createClip('clip-1', 0, 1, 0, 0), // Very short
        createClip('clip-2', 0, 50, 10, 0), // Very long
        createClip('clip-3', 0, 3, 70, 0), // Short
      ];

      const timeline: Timeline = {
        clips,
        textOverlays: [],
        transitions: [],
      };

      const { result } = renderHook(() =>
        useTimelineCalculations({
          ...defaultOptions,
          timeline,
          scrollLeft: 100,
          viewportWidth: 300,
          zoom: 10,
        })
      );

      expect(result.current.visibleClips.length).toBeGreaterThan(0);
    });

    it('should be memoized and not recalculate unnecessarily', () => {
      const timeline: Timeline = {
        clips: [createClip('clip-1', 0, 5, 0, 0)],
        textOverlays: [],
        transitions: [],
      };

      const { result, rerender } = renderHook(
        ({ forcedTrackCount }) =>
          useTimelineCalculations({
            ...defaultOptions,
            timeline,
            forcedTrackCount,
          }),
        { initialProps: { forcedTrackCount: null } }
      );

      const firstVisibleClips = result.current.visibleClips;

      // Change something that doesn't affect visible clips
      rerender({ forcedTrackCount: 5 });

      // Should be the same reference (memoized)
      expect(result.current.visibleClips).toBe(firstVisibleClips);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large timelines', () => {
      const clips = Array.from({ length: 1000 }, (_, i) =>
        createClip(`clip-${i}`, 0, 5, i * 10, 0)
      );

      const timeline: Timeline = {
        clips,
        textOverlays: [],
        transitions: [],
      };

      const { result } = renderHook(() =>
        useTimelineCalculations({
          ...defaultOptions,
          timeline,
          scrollLeft: 0,
          viewportWidth: 300,
          zoom: 10,
        })
      );

      // Should only return visible clips, not all 1000
      expect(result.current.visibleClips.length).toBeLessThan(100);
    });

    it('should handle zero zoom', () => {
      const timeline: Timeline = {
        clips: [createClip('clip-1', 0, 5, 0, 0)],
        textOverlays: [],
        transitions: [],
      };

      const { result } = renderHook(() =>
        useTimelineCalculations({
          ...defaultOptions,
          timeline,
          zoom: 0,
        })
      );

      // Should not crash
      expect(result.current.visibleClips).toBeDefined();
    });

    it('should handle negative scroll position', () => {
      const timeline: Timeline = {
        clips: [createClip('clip-1', 0, 5, 0, 0)],
        textOverlays: [],
        transitions: [],
      };

      const { result } = renderHook(() =>
        useTimelineCalculations({
          ...defaultOptions,
          timeline,
          scrollLeft: -100,
        })
      );

      expect(result.current.visibleClips).toBeDefined();
    });

    it('should handle clips with same timeline position', () => {
      const clips = [
        createClip('clip-1', 0, 5, 10, 0),
        createClip('clip-2', 0, 5, 10, 1),
        createClip('clip-3', 0, 5, 10, 2),
      ];

      const timeline: Timeline = {
        clips,
        textOverlays: [],
        transitions: [],
      };

      const { result } = renderHook(() =>
        useTimelineCalculations({
          ...defaultOptions,
          timeline,
          scrollLeft: 100,
          viewportWidth: 300,
          zoom: 10,
        })
      );

      // All clips at same position should be visible if in viewport
      expect(result.current.visibleClips.length).toBe(3);
    });

    it('should handle timeline with only text overlays', () => {
      const timeline: Timeline = {
        clips: [],
        textOverlays: [
          {
            id: 'overlay-1',
            text: 'Test',
            timelinePosition: 0,
            duration: 5,
            style: {},
          },
        ],
        transitions: [],
      };

      const { result } = renderHook(() =>
        useTimelineCalculations({
          ...defaultOptions,
          timeline,
        })
      );

      expect(result.current.timelineDuration).toBeGreaterThan(0);
      expect(result.current.numTracks).toBe(3);
      expect(result.current.visibleClips).toEqual([]);
    });
  });
});
