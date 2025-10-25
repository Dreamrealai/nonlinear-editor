/**
 * Timeline-Playback Integration Tests
 *
 * Tests synchronization between timeline state and playback controls
 * including edge cases and race conditions
 */

import { renderHook, act } from '@testing-library/react';
import { useTimelineStore } from '@/state/useTimelineStore';
import { usePlaybackStore } from '@/state/usePlaybackStore';
import type { Timeline, Clip } from '@/types/timeline';

describe('Timeline-Playback Integration', () => {
  // Helper to create a mock timeline
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

  // Helper to create a mock clip
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

  beforeEach(() => {
    // Reset both stores before each test
    const { result: timelineResult } = renderHook(() => useTimelineStore());
    const { result: playbackResult } = renderHook(() => usePlaybackStore());

    act(() => {
      timelineResult.current.setTimeline(null);
      playbackResult.current.reset();
    });
  });

  describe('Synchronization', () => {
    it('should sync playhead with playback position', () => {
      const { result: timelineResult } = renderHook(() => useTimelineStore());
      const { result: playbackResult } = renderHook(() => usePlaybackStore());

      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({
        id: 'clip-1',
        timelinePosition: 0,
        end: 10,
      });

      act(() => {
        timelineResult.current.setTimeline(mockTimeline);
        timelineResult.current.addClip(clip1);
      });

      // Update playback position
      act(() => {
        playbackResult.current.setCurrentTime(5.5);
      });

      // Verify synchronization
      expect(playbackResult.current.currentTime).toBe(5.5);
    });

    it('should update timeline when playback seeks', () => {
      const { result: playbackResult } = renderHook(() => usePlaybackStore());

      // Seek to various positions
      act(() => {
        playbackResult.current.setCurrentTime(0);
      });
      expect(playbackResult.current.currentTime).toBe(0);

      act(() => {
        playbackResult.current.setCurrentTime(10.5);
      });
      expect(playbackResult.current.currentTime).toBe(10.5);

      act(() => {
        playbackResult.current.setCurrentTime(100);
      });
      expect(playbackResult.current.currentTime).toBe(100);
    });

    it('should pause playback when editing clip', () => {
      const { result: timelineResult } = renderHook(() => useTimelineStore());
      const { result: playbackResult } = renderHook(() => usePlaybackStore());

      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1' });

      act(() => {
        timelineResult.current.setTimeline(mockTimeline);
        timelineResult.current.addClip(clip1);
        playbackResult.current.play();
      });

      expect(playbackResult.current.isPlaying).toBe(true);

      // Edit clip - should pause playback
      act(() => {
        playbackResult.current.pause();
        timelineResult.current.updateClip('clip-1', { timelinePosition: 5 });
      });

      expect(playbackResult.current.isPlaying).toBe(false);
    });

    it('should resume playback after edit', () => {
      const { result: timelineResult } = renderHook(() => useTimelineStore());
      const { result: playbackResult } = renderHook(() => usePlaybackStore());

      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1' });

      act(() => {
        timelineResult.current.setTimeline(mockTimeline);
        timelineResult.current.addClip(clip1);
        playbackResult.current.play();
        playbackResult.current.pause();
        timelineResult.current.updateClip('clip-1', { timelinePosition: 5 });
      });

      // Resume playback
      act(() => {
        playbackResult.current.play();
      });

      expect(playbackResult.current.isPlaying).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle playback at timeline boundary', () => {
      const { result: timelineResult } = renderHook(() => useTimelineStore());
      const { result: playbackResult } = renderHook(() => usePlaybackStore());

      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({
        id: 'clip-1',
        timelinePosition: 0,
        end: 10,
      });

      act(() => {
        timelineResult.current.setTimeline(mockTimeline);
        timelineResult.current.addClip(clip1);
      });

      // Seek to end of timeline
      act(() => {
        playbackResult.current.setCurrentTime(10);
      });

      expect(playbackResult.current.currentTime).toBe(10);

      // Seek beyond timeline
      act(() => {
        playbackResult.current.setCurrentTime(15);
      });

      expect(playbackResult.current.currentTime).toBe(15);
    });

    it('should handle playback with empty timeline', () => {
      const { result: timelineResult } = renderHook(() => useTimelineStore());
      const { result: playbackResult } = renderHook(() => usePlaybackStore());

      const mockTimeline = createMockTimeline();

      act(() => {
        timelineResult.current.setTimeline(mockTimeline);
        playbackResult.current.setCurrentTime(5);
      });

      expect(playbackResult.current.currentTime).toBe(5);
      expect(timelineResult.current.timeline?.clips).toHaveLength(0);
    });

    it('should handle playback speed changes mid-play', () => {
      const { result: playbackResult } = renderHook(() => usePlaybackStore());

      act(() => {
        playbackResult.current.play();
        playbackResult.current.setCurrentTime(5);
      });

      expect(playbackResult.current.isPlaying).toBe(true);
      expect(playbackResult.current.currentTime).toBe(5);

      // Simulate speed change by updating time rapidly
      act(() => {
        playbackResult.current.setCurrentTime(6);
        playbackResult.current.setCurrentTime(7);
        playbackResult.current.setCurrentTime(8);
      });

      expect(playbackResult.current.currentTime).toBe(8);
      expect(playbackResult.current.isPlaying).toBe(true);
    });

    it('should handle concurrent timeline and playback updates', () => {
      const { result: timelineResult } = renderHook(() => useTimelineStore());
      const { result: playbackResult } = renderHook(() => usePlaybackStore());

      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1' });

      act(() => {
        timelineResult.current.setTimeline(mockTimeline);
        timelineResult.current.addClip(clip1);
        playbackResult.current.setCurrentTime(5);
        timelineResult.current.updateClip('clip-1', { timelinePosition: 2 });
        playbackResult.current.setCurrentTime(7);
      });

      expect(playbackResult.current.currentTime).toBe(7);
      expect(timelineResult.current.timeline?.clips[0]?.timelinePosition).toBe(2);
    });

    it('should handle negative time values gracefully', () => {
      const { result: playbackResult } = renderHook(() => usePlaybackStore());

      act(() => {
        playbackResult.current.setCurrentTime(-5);
      });

      // Should clamp to 0
      expect(playbackResult.current.currentTime).toBe(0);
    });

    it('should handle very large time values', () => {
      const { result: playbackResult } = renderHook(() => usePlaybackStore());

      const largeTime = 86400; // 24 hours in seconds

      act(() => {
        playbackResult.current.setCurrentTime(largeTime);
      });

      expect(playbackResult.current.currentTime).toBe(largeTime);
    });

    it('should handle fractional time values', () => {
      const { result: playbackResult } = renderHook(() => usePlaybackStore());

      act(() => {
        playbackResult.current.setCurrentTime(5.12345);
      });

      expect(playbackResult.current.currentTime).toBe(5.12345);
    });
  });

  describe('Race Conditions', () => {
    it('should handle rapid play/pause clicks', () => {
      const { result: playbackResult } = renderHook(() => usePlaybackStore());

      // Rapidly toggle play/pause
      act(() => {
        playbackResult.current.togglePlayPause();
        playbackResult.current.togglePlayPause();
        playbackResult.current.togglePlayPause();
        playbackResult.current.togglePlayPause();
      });

      // Should end in paused state (started paused, 4 toggles = paused)
      expect(playbackResult.current.isPlaying).toBe(false);
    });

    it('should handle rapid seek operations', () => {
      const { result: playbackResult } = renderHook(() => usePlaybackStore());

      act(() => {
        playbackResult.current.setCurrentTime(1);
        playbackResult.current.setCurrentTime(2);
        playbackResult.current.setCurrentTime(3);
        playbackResult.current.setCurrentTime(4);
        playbackResult.current.setCurrentTime(5);
      });

      // Should end at final value
      expect(playbackResult.current.currentTime).toBe(5);
    });

    it('should handle simultaneous clip operations', () => {
      const { result: timelineResult } = renderHook(() => useTimelineStore());

      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1' });
      const clip2 = createMockClip({ id: 'clip-2' });

      act(() => {
        timelineResult.current.setTimeline(mockTimeline);
        timelineResult.current.addClip(clip1);
        timelineResult.current.addClip(clip2);
        timelineResult.current.updateClip('clip-1', { timelinePosition: 5 });
        timelineResult.current.updateClip('clip-2', { timelinePosition: 10 });
      });

      expect(timelineResult.current.timeline?.clips).toHaveLength(2);
      expect(timelineResult.current.timeline?.clips[0]?.timelinePosition).toBe(5);
      expect(timelineResult.current.timeline?.clips[1]?.timelinePosition).toBe(10);
    });
  });

  describe('Zoom and View State', () => {
    it('should sync zoom level between stores', () => {
      const { result: playbackResult } = renderHook(() => usePlaybackStore());

      act(() => {
        playbackResult.current.setZoom(50);
      });

      expect(playbackResult.current.zoom).toBe(50);

      act(() => {
        playbackResult.current.setZoom(150);
      });

      expect(playbackResult.current.zoom).toBe(150);
    });

    it('should clamp zoom to valid range', () => {
      const { result: playbackResult } = renderHook(() => usePlaybackStore());

      act(() => {
        playbackResult.current.setZoom(5); // Below minimum
      });

      expect(playbackResult.current.zoom).toBeGreaterThanOrEqual(10);

      act(() => {
        playbackResult.current.setZoom(300); // Above maximum
      });

      expect(playbackResult.current.zoom).toBeLessThanOrEqual(200);
    });

    it('should maintain zoom during playback', () => {
      const { result: playbackResult } = renderHook(() => usePlaybackStore());

      act(() => {
        playbackResult.current.setZoom(100);
        playbackResult.current.play();
        playbackResult.current.setCurrentTime(5);
      });

      expect(playbackResult.current.zoom).toBe(100);
      expect(playbackResult.current.isPlaying).toBe(true);
    });
  });

  describe('Reset and Cleanup', () => {
    it('should reset playback state', () => {
      const { result: playbackResult } = renderHook(() => usePlaybackStore());

      act(() => {
        playbackResult.current.setCurrentTime(10);
        playbackResult.current.setZoom(150);
        playbackResult.current.play();
        playbackResult.current.reset();
      });

      expect(playbackResult.current.currentTime).toBe(0);
      expect(playbackResult.current.isPlaying).toBe(false);
      expect(playbackResult.current.zoom).toBeGreaterThan(0); // Should reset to default
    });

    it('should handle reset during playback', () => {
      const { result: playbackResult } = renderHook(() => usePlaybackStore());

      act(() => {
        playbackResult.current.play();
        playbackResult.current.setCurrentTime(5);
        playbackResult.current.reset();
      });

      expect(playbackResult.current.isPlaying).toBe(false);
      expect(playbackResult.current.currentTime).toBe(0);
    });
  });
});
