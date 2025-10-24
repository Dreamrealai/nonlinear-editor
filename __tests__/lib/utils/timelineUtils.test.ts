import { describe, it, expect } from 'vitest';
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
    it('should format zero time', () => {
      expect(formatTime(0)).toBe('0:00.00');
    });

    it('should format seconds only', () => {
      expect(formatTime(30)).toBe('0:30.00');
    });

    it('should format minutes and seconds', () => {
      expect(formatTime(90)).toBe('1:30.00');
    });

    it('should format centiseconds', () => {
      expect(formatTime(1.5)).toBe('0:01.50');
      expect(formatTime(1.25)).toBe('0:01.25');
    });

    it('should pad single-digit seconds', () => {
      expect(formatTime(5.5)).toBe('0:05.50');
    });

    it('should pad single-digit centiseconds', () => {
      expect(formatTime(1.05)).toBe('0:01.05');
    });

    it('should handle large values', () => {
      expect(formatTime(3661.5)).toBe('61:01.50'); // 61 minutes
    });
  });

  describe('getClipFileName', () => {
    it('should extract filename from standard path', () => {
      const clip: Clip = {
        id: 'clip-1',
        filePath: '/path/to/video.mp4',
        start: 0,
        end: 10,
        timelinePosition: 0,
        trackIndex: 0,
      };
      expect(getClipFileName(clip)).toBe('video.mp4');
    });

    it('should extract filename from supabase:// protocol', () => {
      const clip: Clip = {
        id: 'clip-1',
        filePath: 'supabase://assets/user123/project456/video.mp4',
        start: 0,
        end: 10,
        timelinePosition: 0,
        trackIndex: 0,
      };
      expect(getClipFileName(clip)).toBe('video.mp4');
    });

    it('should handle paths with leading slashes', () => {
      const clip: Clip = {
        id: 'clip-1',
        filePath: '///path/to/video.mp4',
        start: 0,
        end: 10,
        timelinePosition: 0,
        trackIndex: 0,
      };
      expect(getClipFileName(clip)).toBe('video.mp4');
    });

    it('should return "Clip" for empty path', () => {
      const clip: Clip = {
        id: 'clip-1',
        filePath: '',
        start: 0,
        end: 10,
        timelinePosition: 0,
        trackIndex: 0,
      };
      expect(getClipFileName(clip)).toBe('Clip');
    });

    it('should return "Clip" for undefined filePath', () => {
      const clip: Clip = {
        id: 'clip-1',
        start: 0,
        end: 10,
        timelinePosition: 0,
        trackIndex: 0,
      };
      expect(getClipFileName(clip)).toBe('Clip');
    });

    it('should handle nested directories', () => {
      const clip: Clip = {
        id: 'clip-1',
        filePath: '/a/b/c/d/e/video.mp4',
        start: 0,
        end: 10,
        timelinePosition: 0,
        trackIndex: 0,
      };
      expect(getClipFileName(clip)).toBe('video.mp4');
    });
  });

  describe('snapToGrid', () => {
    it('should snap to nearest grid interval', () => {
      expect(snapToGrid(0.3, 0.1)).toBe(0.3);
      expect(snapToGrid(0.34, 0.1)).toBe(0.3);
      expect(snapToGrid(0.36, 0.1)).toBe(0.4);
    });

    it('should handle exact multiples', () => {
      expect(snapToGrid(1.0, 0.5)).toBe(1.0);
      expect(snapToGrid(2.0, 0.5)).toBe(2.0);
    });

    it('should snap to larger intervals', () => {
      expect(snapToGrid(5.2, 1)).toBe(5);
      expect(snapToGrid(5.7, 1)).toBe(6);
    });

    it('should handle zero', () => {
      expect(snapToGrid(0, 0.1)).toBe(0);
    });

    it('should handle negative values', () => {
      expect(snapToGrid(-0.3, 0.1)).toBe(-0.3);
      expect(snapToGrid(-0.36, 0.1)).toBe(-0.4);
    });
  });

  describe('isWithinSnapThreshold', () => {
    it('should return true when within threshold', () => {
      expect(isWithinSnapThreshold(10, 10.05, 0.1)).toBe(true);
      expect(isWithinSnapThreshold(10, 9.95, 0.1)).toBe(true);
    });

    it('should return false when outside threshold', () => {
      expect(isWithinSnapThreshold(10, 10.2, 0.1)).toBe(false);
      expect(isWithinSnapThreshold(10, 9.8, 0.1)).toBe(false);
    });

    it('should return true at exact threshold boundary', () => {
      expect(isWithinSnapThreshold(10, 10.1, 0.1)).toBe(true);
      expect(isWithinSnapThreshold(10, 9.9, 0.1)).toBe(true);
    });

    it('should return true for exact match', () => {
      expect(isWithinSnapThreshold(10, 10, 0.1)).toBe(true);
    });
  });

  describe('computeSafeClipPosition', () => {
    it('should return snapped position for clip without overlaps', () => {
      const clips: Clip[] = [];
      const position = computeSafeClipPosition('clip-1', 5.3, clips, 0.1, 0.05);
      expect(position).toBe(5.3); // Snapped to 0.1 grid
    });

    it('should avoid overlap with previous clip', () => {
      const clips: Clip[] = [
        {
          id: 'clip-1',
          start: 0,
          end: 10,
          timelinePosition: 0,
          trackIndex: 0,
          filePath: 'video1.mp4',
        },
        {
          id: 'clip-2',
          start: 0,
          end: 5,
          timelinePosition: 5, // Will be moved
          trackIndex: 0,
          filePath: 'video2.mp4',
        },
      ];

      const position = computeSafeClipPosition('clip-2', 5, clips, 0.1, 0.05, 0);
      expect(position).toBeGreaterThanOrEqual(10); // After clip-1 ends
    });

    it('should avoid overlap with next clip', () => {
      const clips: Clip[] = [
        {
          id: 'clip-1',
          start: 0,
          end: 5,
          timelinePosition: 15, // Will be moved
          trackIndex: 0,
          filePath: 'video1.mp4',
        },
        {
          id: 'clip-2',
          start: 0,
          end: 10,
          timelinePosition: 10,
          trackIndex: 0,
          filePath: 'video2.mp4',
        },
      ];

      const position = computeSafeClipPosition('clip-1', 15, clips, 0.1, 0.05, 0);
      expect(position).toBeLessThanOrEqual(5); // Before clip-2 starts
    });

    it('should snap to 0 position', () => {
      const clips: Clip[] = [
        {
          id: 'clip-1',
          start: 0,
          end: 10,
          timelinePosition: 0.04, // Close to 0
          trackIndex: 0,
          filePath: 'video1.mp4',
        },
      ];

      const position = computeSafeClipPosition('clip-1', 0.04, clips, 0.1, 0.1, 0);
      expect(position).toBe(0);
    });

    it('should handle clips on different tracks independently', () => {
      const clips: Clip[] = [
        {
          id: 'clip-1',
          start: 0,
          end: 10,
          timelinePosition: 0,
          trackIndex: 0,
          filePath: 'video1.mp4',
        },
        {
          id: 'clip-2',
          start: 0,
          end: 5,
          timelinePosition: 2,
          trackIndex: 1, // Different track
          filePath: 'video2.mp4',
        },
      ];

      const position = computeSafeClipPosition('clip-2', 2, clips, 0.1, 0.05, 1);
      expect(position).toBe(2); // No conflict with clip-1 on different track
    });

    it('should never return negative position', () => {
      const clips: Clip[] = [];
      const position = computeSafeClipPosition('clip-1', -10, clips, 0.1, 0.05);
      expect(position).toBeGreaterThanOrEqual(0);
    });

    it('should return 0 when clip is not found', () => {
      const clips: Clip[] = [];
      const position = computeSafeClipPosition('non-existent', 5, clips, 0.1, 0.05);
      expect(position).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculateTimelineDuration', () => {
    it('should return minimum duration for empty timeline', () => {
      expect(calculateTimelineDuration([], [], 30)).toBe(30);
    });

    it('should calculate duration from clips', () => {
      const clips: Clip[] = [
        {
          id: 'clip-1',
          start: 0,
          end: 10,
          timelinePosition: 0,
          trackIndex: 0,
          filePath: 'video1.mp4',
        },
        {
          id: 'clip-2',
          start: 0,
          end: 5,
          timelinePosition: 15,
          trackIndex: 0,
          filePath: 'video2.mp4',
        },
      ];

      const duration = calculateTimelineDuration(clips, []);
      expect(duration).toBe(20); // Clip-2 ends at 15 + 5 = 20
    });

    it('should calculate duration from text overlays', () => {
      const overlays = [
        { timelinePosition: 10, duration: 5 },
        { timelinePosition: 20, duration: 8 },
      ];

      const duration = calculateTimelineDuration([], overlays);
      expect(duration).toBe(28); // Last overlay ends at 20 + 8 = 28
    });

    it('should use maximum duration from clips and overlays', () => {
      const clips: Clip[] = [
        {
          id: 'clip-1',
          start: 0,
          end: 10,
          timelinePosition: 0,
          trackIndex: 0,
          filePath: 'video1.mp4',
        },
      ];

      const overlays = [{ timelinePosition: 5, duration: 20 }];

      const duration = calculateTimelineDuration(clips, overlays);
      expect(duration).toBe(25); // Overlay ends at 5 + 20 = 25
    });

    it('should respect minimum duration', () => {
      const clips: Clip[] = [
        {
          id: 'clip-1',
          start: 0,
          end: 5,
          timelinePosition: 0,
          trackIndex: 0,
          filePath: 'video1.mp4',
        },
      ];

      const duration = calculateTimelineDuration(clips, [], 30);
      expect(duration).toBe(30); // Minimum takes precedence
    });

    it('should use default minimum duration', () => {
      const duration = calculateTimelineDuration([], []);
      expect(duration).toBe(30); // Default minimum
    });
  });

  describe('findClipAtTime', () => {
    const clips: Clip[] = [
      {
        id: 'clip-1',
        start: 0,
        end: 10,
        timelinePosition: 0,
        trackIndex: 0,
        filePath: 'video1.mp4',
      },
      {
        id: 'clip-2',
        start: 0,
        end: 5,
        timelinePosition: 15,
        trackIndex: 0,
        filePath: 'video2.mp4',
      },
    ];

    it('should find clip at given time', () => {
      const clip = findClipAtTime(clips, 5);
      expect(clip?.id).toBe('clip-1');
    });

    it('should find second clip', () => {
      const clip = findClipAtTime(clips, 17);
      expect(clip?.id).toBe('clip-2');
    });

    it('should return undefined when no clip at time', () => {
      const clip = findClipAtTime(clips, 25);
      expect(clip).toBeUndefined();
    });

    it('should return undefined for gap between clips', () => {
      const clip = findClipAtTime(clips, 12);
      expect(clip).toBeUndefined();
    });

    it('should not include clip start boundary', () => {
      const clip = findClipAtTime(clips, 0);
      expect(clip).toBeUndefined();
    });

    it('should not include clip end boundary', () => {
      const clip = findClipAtTime(clips, 10);
      expect(clip).toBeUndefined();
    });

    it('should return undefined for empty clips array', () => {
      const clip = findClipAtTime([], 5);
      expect(clip).toBeUndefined();
    });
  });
});
