/**
 * Tests for Timeline Utility Functions
 */

import {
  formatTime,
  getClipFileName,
  snapToGrid,
  isWithinSnapThreshold,
  computeSafeClipPosition,
  calculateTimelineDuration,
  findClipAtTime,
} from '@/lib/utils/timelineUtils';
import type { Clip } from '@/types/timeline';

describe('timelineUtils', () => {
  describe('formatTime', () => {
    it('should format zero seconds', () => {
      expect(formatTime(0)).toBe('0:00.00');
    });

    it('should format seconds only', () => {
      expect(formatTime(30)).toBe('0:30.00');
    });

    it('should format minutes and seconds', () => {
      expect(formatTime(90)).toBe('1:30.00');
    });

    it('should format fractional seconds as centiseconds', () => {
      expect(formatTime(1.5)).toBe('0:01.50');
      expect(formatTime(1.123)).toBe('0:01.12');
      expect(formatTime(1.999)).toBe('0:01.99');
    });

    it('should pad seconds with leading zero', () => {
      expect(formatTime(5)).toBe('0:05.00');
      expect(formatTime(65)).toBe('1:05.00');
    });

    it('should handle large times', () => {
      expect(formatTime(3661.5)).toBe('61:01.50');
    });

    it('should handle fractional minutes', () => {
      expect(formatTime(123.456)).toBe('2:03.45');
    });
  });

  describe('getClipFileName', () => {
    it('should extract filename from standard path', () => {
      const clip: Clip = {
        id: 'clip-1',
        trackIndex: 0,
        timelinePosition: 0,
        start: 0,
        end: 10,
        filePath: '/path/to/video.mp4',
        type: 'video',
        assetId: 'asset-1',
      };
      expect(getClipFileName(clip)).toBe('video.mp4');
    });

    it('should extract filename from supabase:// protocol', () => {
      const clip: Clip = {
        id: 'clip-1',
        trackIndex: 0,
        timelinePosition: 0,
        start: 0,
        end: 10,
        filePath: 'supabase://bucket/user/project/video.mp4',
        type: 'video',
        assetId: 'asset-1',
      };
      expect(getClipFileName(clip)).toBe('video.mp4');
    });

    it('should handle paths with leading slashes', () => {
      const clip: Clip = {
        id: 'clip-1',
        trackIndex: 0,
        timelinePosition: 0,
        start: 0,
        end: 10,
        filePath: '///path/to/video.mp4',
        type: 'video',
        assetId: 'asset-1',
      };
      expect(getClipFileName(clip)).toBe('video.mp4');
    });

    it('should return "Clip" for empty path', () => {
      const clip: Clip = {
        id: 'clip-1',
        trackIndex: 0,
        timelinePosition: 0,
        start: 0,
        end: 10,
        filePath: '',
        type: 'video',
        assetId: 'asset-1',
      };
      expect(getClipFileName(clip)).toBe('Clip');
    });

    it('should return "Clip" for undefined filePath', () => {
      const clip: Clip = {
        id: 'clip-1',
        trackIndex: 0,
        timelinePosition: 0,
        start: 0,
        end: 10,
        filePath: undefined,
        type: 'video',
        assetId: 'asset-1',
      };
      expect(getClipFileName(clip)).toBe('Clip');
    });

    it('should handle single filename without path', () => {
      const clip: Clip = {
        id: 'clip-1',
        trackIndex: 0,
        timelinePosition: 0,
        start: 0,
        end: 10,
        filePath: 'video.mp4',
        type: 'video',
        assetId: 'asset-1',
      };
      expect(getClipFileName(clip)).toBe('video.mp4');
    });
  });

  describe('snapToGrid', () => {
    it('should snap to nearest grid interval', () => {
      expect(snapToGrid(5.4, 1)).toBe(5);
      expect(snapToGrid(5.6, 1)).toBe(6);
    });

    it('should snap to larger intervals', () => {
      expect(snapToGrid(12, 5)).toBe(10);
      expect(snapToGrid(13, 5)).toBe(15);
    });

    it('should handle zero interval', () => {
      expect(snapToGrid(5, 0)).toBe(NaN);
    });

    it('should snap exact multiples correctly', () => {
      expect(snapToGrid(10, 5)).toBe(10);
      expect(snapToGrid(15, 5)).toBe(15);
    });

    it('should handle fractional intervals', () => {
      expect(snapToGrid(5.25, 0.5)).toBe(5.5);
      expect(snapToGrid(5.1, 0.5)).toBe(5);
    });

    it('should handle negative values', () => {
      expect(snapToGrid(-5.4, 1)).toBe(-5);
      expect(snapToGrid(-5.6, 1)).toBe(-6);
    });
  });

  describe('isWithinSnapThreshold', () => {
    it('should return true when within threshold', () => {
      expect(isWithinSnapThreshold(5, 5.2, 0.5)).toBe(true);
      expect(isWithinSnapThreshold(5, 4.8, 0.5)).toBe(true);
    });

    it('should return false when outside threshold', () => {
      expect(isWithinSnapThreshold(5, 5.6, 0.5)).toBe(false);
      expect(isWithinSnapThreshold(5, 4.4, 0.5)).toBe(false);
    });

    it('should return true at exact threshold boundary', () => {
      expect(isWithinSnapThreshold(5, 5.5, 0.5)).toBe(true);
      expect(isWithinSnapThreshold(5, 4.5, 0.5)).toBe(true);
    });

    it('should return true for identical values', () => {
      expect(isWithinSnapThreshold(5, 5, 0.1)).toBe(true);
    });

    it('should handle zero threshold', () => {
      expect(isWithinSnapThreshold(5, 5, 0)).toBe(true);
      expect(isWithinSnapThreshold(5, 5.001, 0)).toBe(false);
    });

    it('should handle negative values', () => {
      expect(isWithinSnapThreshold(-5, -5.2, 0.5)).toBe(true);
      expect(isWithinSnapThreshold(-5, -5.6, 0.5)).toBe(false);
    });
  });

  describe('computeSafeClipPosition', () => {
    const createClip = (
      id: string,
      trackIndex: number,
      position: number,
      duration: number
    ): Clip => ({
      id,
      trackIndex,
      timelinePosition: position,
      start: 0,
      end: duration,
      filePath: `/test-${id}.mp4`,
      type: 'video',
      assetId: `asset-${id}`,
    });

    it('should return snapped position for empty timeline', () => {
      const result = computeSafeClipPosition('new-clip', 5.4, [], 1, 0.1);
      expect(result).toBe(5);
    });

    it('should return 0 for non-existent clip', () => {
      const clips = [createClip('clip-1', 0, 0, 10)];
      const result = computeSafeClipPosition('non-existent', 5, clips, 1, 0.1);
      expect(result).toBeGreaterThanOrEqual(0);
    });

    it('should avoid overlap with previous clip', () => {
      const clips = [createClip('clip-1', 0, 0, 10), createClip('clip-2', 0, 20, 5)];
      const result = computeSafeClipPosition('clip-2', 5, clips, 1, 0.1);
      expect(result).toBeGreaterThanOrEqual(10);
    });

    it('should avoid overlap with next clip', () => {
      const clips = [createClip('clip-1', 0, 0, 5), createClip('clip-2', 0, 20, 10)];
      const result = computeSafeClipPosition('clip-1', 15, clips, 1, 0.1);
      expect(result).toBeLessThanOrEqual(15);
    });

    it('should handle clips on different tracks independently', () => {
      const clips = [createClip('clip-1', 0, 0, 10), createClip('clip-2', 1, 0, 5)];
      const result = computeSafeClipPosition('clip-2', 5, clips, 1, 0.1);
      expect(result).toBe(5);
    });

    it('should snap to grid when safe', () => {
      const clips = [createClip('clip-1', 0, 0, 5)];
      const result = computeSafeClipPosition('clip-1', 5.4, clips, 1, 0.1);
      expect(result % 1).toBe(0);
    });

    it('should snap to adjacent clips', () => {
      const clips = [createClip('clip-1', 0, 0, 10), createClip('clip-2', 0, 20, 5)];
      const result = computeSafeClipPosition('clip-2', 10.3, clips, 1, 0.5);
      expect(result).toBe(10);
    });

    it('should handle negative desired position', () => {
      const clips = [createClip('clip-1', 0, 10, 5)];
      const result = computeSafeClipPosition('clip-1', -5, clips, 1, 0.1);
      expect(result).toBeGreaterThanOrEqual(0);
    });

    it('should respect target track index', () => {
      const clips = [createClip('clip-1', 0, 0, 10), createClip('clip-2', 1, 0, 10)];
      const result = computeSafeClipPosition('clip-1', 5, clips, 1, 0.1, 1);
      expect(result).toBe(5);
    });

    it('should handle tight space between clips', () => {
      const clips = [
        createClip('clip-1', 0, 0, 10),
        createClip('clip-2', 0, 11, 5),
        createClip('clip-3', 0, 20, 10),
      ];
      const result = computeSafeClipPosition('clip-2', 8, clips, 1, 0.1);
      expect(result).toBeGreaterThanOrEqual(10);
      expect(result).toBeLessThanOrEqual(15);
    });

    it('should use minimum snap interval for duration', () => {
      const clips = [createClip('clip-1', 0, 0, 0.1)];
      const result = computeSafeClipPosition('clip-1', 5, clips, 1, 0.1);
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculateTimelineDuration', () => {
    const createClip = (position: number, duration: number): Clip => ({
      id: `clip-${position}`,
      trackIndex: 0,
      timelinePosition: position,
      start: 0,
      end: duration,
      filePath: `/test.mp4`,
      type: 'video',
      assetId: 'asset-1',
    });

    it('should return minimum duration for empty timeline', () => {
      expect(calculateTimelineDuration([], [])).toBe(30);
    });

    it('should return custom minimum duration', () => {
      expect(calculateTimelineDuration([], [], 60)).toBe(60);
    });

    it('should calculate duration from single clip', () => {
      const clips = [createClip(0, 10)];
      expect(calculateTimelineDuration(clips, [])).toBe(30);
    });

    it('should calculate duration from multiple clips', () => {
      const clips = [createClip(0, 10), createClip(10, 20), createClip(30, 15)];
      expect(calculateTimelineDuration(clips, [])).toBe(45);
    });

    it('should include text overlay duration', () => {
      const textOverlays = [{ timelinePosition: 0, duration: 50 }];
      expect(calculateTimelineDuration([], textOverlays)).toBe(50);
    });

    it('should use maximum of clips and overlays', () => {
      const clips = [createClip(0, 40)];
      const textOverlays = [{ timelinePosition: 50, duration: 20 }];
      expect(calculateTimelineDuration(clips, textOverlays)).toBe(70);
    });

    it('should respect minimum duration even with content', () => {
      const clips = [createClip(0, 5)];
      expect(calculateTimelineDuration(clips, [], 30)).toBe(30);
    });

    it('should handle overlapping clips correctly', () => {
      const clips = [createClip(0, 30), createClip(10, 20)];
      expect(calculateTimelineDuration(clips, [])).toBe(30);
    });

    it('should handle clips starting at different positions', () => {
      const clips = [createClip(5, 10), createClip(20, 15)];
      expect(calculateTimelineDuration(clips, [])).toBe(35);
    });
  });

  describe('findClipAtTime', () => {
    const createClip = (id: string, position: number, duration: number): Clip => ({
      id,
      trackIndex: 0,
      timelinePosition: position,
      start: 0,
      end: duration,
      filePath: `/test-${id}.mp4`,
      type: 'video',
      assetId: `asset-${id}`,
    });

    it('should find clip at given time', () => {
      const clips = [createClip('clip-1', 0, 10), createClip('clip-2', 10, 10)];
      const result = findClipAtTime(clips, 5);
      expect(result?.id).toBe('clip-1');
    });

    it('should return undefined when no clip at time', () => {
      const clips = [createClip('clip-1', 0, 10), createClip('clip-2', 20, 10)];
      const result = findClipAtTime(clips, 15);
      expect(result).toBeUndefined();
    });

    it('should not include clip boundaries', () => {
      const clips = [createClip('clip-1', 0, 10)];
      expect(findClipAtTime(clips, 0)).toBeUndefined();
      expect(findClipAtTime(clips, 10)).toBeUndefined();
    });

    it('should find clip in middle of duration', () => {
      const clips = [createClip('clip-1', 5, 10)];
      const result = findClipAtTime(clips, 10);
      expect(result?.id).toBe('clip-1');
    });

    it('should find first matching clip when multiple overlap', () => {
      const clips = [createClip('clip-1', 0, 20), createClip('clip-2', 5, 10)];
      const result = findClipAtTime(clips, 10);
      expect(result?.id).toBe('clip-1');
    });

    it('should handle empty clips array', () => {
      expect(findClipAtTime([], 5)).toBeUndefined();
    });

    it('should handle time before all clips', () => {
      const clips = [createClip('clip-1', 10, 10)];
      expect(findClipAtTime(clips, 5)).toBeUndefined();
    });

    it('should handle time after all clips', () => {
      const clips = [createClip('clip-1', 0, 10)];
      expect(findClipAtTime(clips, 20)).toBeUndefined();
    });

    it('should handle clips on different tracks', () => {
      const clips = [
        { ...createClip('clip-1', 0, 10), trackIndex: 0 },
        { ...createClip('clip-2', 0, 10), trackIndex: 1 },
      ];
      const result = findClipAtTime(clips, 5);
      expect(result).toBeDefined();
      expect(['clip-1', 'clip-2']).toContain(result?.id);
    });
  });
});
