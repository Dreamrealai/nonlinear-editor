import { describe, it, expect } from 'vitest';
import {
  clamp,
  generateCSSFilter,
  generateCSSTransform,
  computeClipMetas,
  computeOpacity,
  formatTimecode,
} from '@/lib/utils/videoUtils';
import type { Clip, ColorCorrection, Transform } from '@/types/timeline';

describe('videoUtils', () => {
  describe('clamp', () => {
    it('should clamp values within default range (0-1)', () => {
      expect(clamp(0.5)).toBe(0.5);
      expect(clamp(0)).toBe(0);
      expect(clamp(1)).toBe(1);
    });

    it('should clamp values below minimum to minimum', () => {
      expect(clamp(-0.5)).toBe(0);
      expect(clamp(-10)).toBe(0);
    });

    it('should clamp values above maximum to maximum', () => {
      expect(clamp(1.5)).toBe(1);
      expect(clamp(10)).toBe(1);
    });

    it('should accept custom min and max values', () => {
      expect(clamp(50, 0, 100)).toBe(50);
      expect(clamp(-10, 0, 100)).toBe(0);
      expect(clamp(150, 0, 100)).toBe(100);
    });
  });

  describe('generateCSSFilter', () => {
    it('should return "none" for undefined color correction', () => {
      expect(generateCSSFilter(undefined)).toBe('none');
    });

    it('should return "none" for default values (no changes)', () => {
      const colorCorrection: ColorCorrection = {
        brightness: 100,
        contrast: 100,
        saturation: 100,
        hue: 0,
      };
      expect(generateCSSFilter(colorCorrection)).toBe('none');
    });

    it('should generate brightness filter', () => {
      const colorCorrection: ColorCorrection = {
        brightness: 120,
        contrast: 100,
        saturation: 100,
        hue: 0,
      };
      expect(generateCSSFilter(colorCorrection)).toBe('brightness(120%)');
    });

    it('should generate contrast filter', () => {
      const colorCorrection: ColorCorrection = {
        brightness: 100,
        contrast: 80,
        saturation: 100,
        hue: 0,
      };
      expect(generateCSSFilter(colorCorrection)).toBe('contrast(80%)');
    });

    it('should generate saturation filter', () => {
      const colorCorrection: ColorCorrection = {
        brightness: 100,
        contrast: 100,
        saturation: 150,
        hue: 0,
      };
      expect(generateCSSFilter(colorCorrection)).toBe('saturate(150%)');
    });

    it('should generate hue-rotate filter', () => {
      const colorCorrection: ColorCorrection = {
        brightness: 100,
        contrast: 100,
        saturation: 100,
        hue: 45,
      };
      expect(generateCSSFilter(colorCorrection)).toBe('hue-rotate(45deg)');
    });

    it('should combine multiple filters', () => {
      const colorCorrection: ColorCorrection = {
        brightness: 120,
        contrast: 90,
        saturation: 110,
        hue: 30,
      };
      const result = generateCSSFilter(colorCorrection);
      expect(result).toContain('brightness(120%)');
      expect(result).toContain('contrast(90%)');
      expect(result).toContain('saturate(110%)');
      expect(result).toContain('hue-rotate(30deg)');
    });
  });

  describe('generateCSSTransform', () => {
    it('should return default transform with translateZ for undefined transform', () => {
      expect(generateCSSTransform(undefined)).toBe('translateZ(0)');
    });

    it('should include translateZ for GPU acceleration', () => {
      const transform: Transform = {
        rotation: 0,
        scale: 1,
        flipHorizontal: false,
        flipVertical: false,
      };
      const result = generateCSSTransform(transform);
      expect(result).toContain('translateZ(0)');
    });

    it('should apply horizontal flip', () => {
      const transform: Transform = {
        rotation: 0,
        scale: 1,
        flipHorizontal: true,
        flipVertical: false,
      };
      const result = generateCSSTransform(transform);
      expect(result).toContain('scale(-1, 1)');
    });

    it('should apply vertical flip', () => {
      const transform: Transform = {
        rotation: 0,
        scale: 1,
        flipHorizontal: false,
        flipVertical: true,
      };
      const result = generateCSSTransform(transform);
      expect(result).toContain('scale(1, -1)');
    });

    it('should apply both flips', () => {
      const transform: Transform = {
        rotation: 0,
        scale: 1,
        flipHorizontal: true,
        flipVertical: true,
      };
      const result = generateCSSTransform(transform);
      expect(result).toContain('scale(-1, -1)');
    });

    it('should apply scale', () => {
      const transform: Transform = {
        rotation: 0,
        scale: 1.5,
        flipHorizontal: false,
        flipVertical: false,
      };
      const result = generateCSSTransform(transform);
      expect(result).toContain('scale(1.5, 1.5)');
    });

    it('should combine scale and flip', () => {
      const transform: Transform = {
        rotation: 0,
        scale: 2,
        flipHorizontal: true,
        flipVertical: false,
      };
      const result = generateCSSTransform(transform);
      expect(result).toContain('scale(-2, 2)');
    });

    it('should apply rotation', () => {
      const transform: Transform = {
        rotation: 45,
        scale: 1,
        flipHorizontal: false,
        flipVertical: false,
      };
      const result = generateCSSTransform(transform);
      expect(result).toContain('rotate(45deg)');
    });

    it('should combine all transforms', () => {
      const transform: Transform = {
        rotation: 90,
        scale: 1.2,
        flipHorizontal: true,
        flipVertical: false,
      };
      const result = generateCSSTransform(transform);
      expect(result).toContain('translateZ(0)');
      expect(result).toContain('scale(-1.2, 1.2)');
      expect(result).toContain('rotate(90deg)');
    });
  });

  describe('computeClipMetas', () => {
    it('should return empty map for empty clips array', () => {
      const result = computeClipMetas([]);
      expect(result.size).toBe(0);
    });

    it('should compute basic metadata for single clip without transitions', () => {
      const clip: Clip = {
        id: 'clip-1',
        start: 0,
        end: 10,
        timelinePosition: 5,
        trackIndex: 0,
        filePath: 'video.mp4',
      };

      const result = computeClipMetas([clip]);
      const meta = result.get('clip-1');

      expect(meta).toBeDefined();
      expect(meta?.length).toBe(10);
      expect(meta?.timelineStart).toBe(5);
      expect(meta?.effectiveStart).toBe(5);
      expect(meta?.fadeIn).toBe(0);
      expect(meta?.fadeOut).toBe(0);
    });

    it('should compute fade-in transition', () => {
      const clip: Clip = {
        id: 'clip-1',
        start: 0,
        end: 10,
        timelinePosition: 0,
        trackIndex: 0,
        filePath: 'video.mp4',
        transitionToNext: { type: 'fade-in', duration: 1 },
      };

      const result = computeClipMetas([clip]);
      const meta = result.get('clip-1');

      expect(meta?.fadeIn).toBe(1);
      expect(meta?.transitionType).toBe('fade-in');
    });

    it('should compute fade-out transition', () => {
      const clip: Clip = {
        id: 'clip-1',
        start: 0,
        end: 10,
        timelinePosition: 0,
        trackIndex: 0,
        filePath: 'video.mp4',
        transitionToNext: { type: 'fade-out', duration: 1.5 },
      };

      const result = computeClipMetas([clip]);
      const meta = result.get('clip-1');

      expect(meta?.fadeOut).toBe(1.5);
      expect(meta?.transitionType).toBe('fade-out');
    });

    it('should compute crossfade transition between adjacent clips', () => {
      const clips: Clip[] = [
        {
          id: 'clip-1',
          start: 0,
          end: 10,
          timelinePosition: 0,
          trackIndex: 0,
          filePath: 'video1.mp4',
          transitionToNext: { type: 'crossfade', duration: 2 },
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

      const result = computeClipMetas(clips);
      const meta1 = result.get('clip-1');
      const meta2 = result.get('clip-2');

      expect(meta1?.fadeOut).toBeGreaterThan(0);
      expect(meta2?.fadeIn).toBeGreaterThan(0);
      expect(meta2?.effectiveStart).toBeLessThan(10); // Overlaps with clip-1
    });

    it('should handle minimum transition duration (50ms)', () => {
      const clip: Clip = {
        id: 'clip-1',
        start: 0,
        end: 10,
        timelinePosition: 0,
        trackIndex: 0,
        filePath: 'video.mp4',
        transitionToNext: { type: 'fade-in', duration: 0.01 }, // Less than min
      };

      const result = computeClipMetas([clip]);
      const meta = result.get('clip-1');

      expect(meta?.fadeIn).toBeGreaterThanOrEqual(0.05); // Minimum 50ms
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
          end: 10,
          timelinePosition: 0,
          trackIndex: 1,
          filePath: 'video2.mp4',
        },
      ];

      const result = computeClipMetas(clips);

      expect(result.size).toBe(2);
      expect(result.get('clip-1')?.effectiveStart).toBe(0);
      expect(result.get('clip-2')?.effectiveStart).toBe(0);
    });
  });

  describe('computeOpacity', () => {
    const basicMeta = {
      length: 10,
      timelineStart: 0,
      effectiveStart: 0,
      fadeIn: 0,
      fadeOut: 0,
      transitionType: 'none' as const,
      transitionDuration: 0,
    };

    it('should return 0 for progress outside clip duration', () => {
      expect(computeOpacity(basicMeta, -1)).toBe(0);
      expect(computeOpacity(basicMeta, 11)).toBe(0);
    });

    it('should return 1 for progress within clip without fades', () => {
      expect(computeOpacity(basicMeta, 5)).toBe(1);
      expect(computeOpacity(basicMeta, 0)).toBe(1);
      expect(computeOpacity(basicMeta, 10)).toBe(1);
    });

    it('should apply fade-in', () => {
      const meta = { ...basicMeta, fadeIn: 2 };

      expect(computeOpacity(meta, 0)).toBe(0);
      expect(computeOpacity(meta, 1)).toBe(0.5);
      expect(computeOpacity(meta, 2)).toBe(1);
      expect(computeOpacity(meta, 5)).toBe(1);
    });

    it('should apply fade-out', () => {
      const meta = { ...basicMeta, fadeOut: 2 };

      expect(computeOpacity(meta, 5)).toBe(1);
      expect(computeOpacity(meta, 8)).toBe(1);
      expect(computeOpacity(meta, 9)).toBe(0.5);
      expect(computeOpacity(meta, 10)).toBe(0);
    });

    it('should apply both fade-in and fade-out', () => {
      const meta = { ...basicMeta, fadeIn: 2, fadeOut: 2 };

      expect(computeOpacity(meta, 0)).toBe(0); // Fade in start
      expect(computeOpacity(meta, 1)).toBe(0.5); // Fade in middle
      expect(computeOpacity(meta, 2)).toBe(1); // Fade in end
      expect(computeOpacity(meta, 5)).toBe(1); // Middle
      expect(computeOpacity(meta, 8)).toBe(1); // Fade out start
      expect(computeOpacity(meta, 9)).toBe(0.5); // Fade out middle
      expect(computeOpacity(meta, 10)).toBe(0); // Fade out end
    });

    it('should clamp opacity between 0 and 1', () => {
      const meta = { ...basicMeta, fadeIn: 1 };
      const opacity = computeOpacity(meta, 0.5);
      expect(opacity).toBeGreaterThanOrEqual(0);
      expect(opacity).toBeLessThanOrEqual(1);
    });
  });

  describe('formatTimecode', () => {
    it('should format zero time', () => {
      expect(formatTimecode(0)).toBe('00:00:00');
    });

    it('should format seconds only', () => {
      expect(formatTimecode(30)).toBe('00:30:00');
    });

    it('should format minutes and seconds', () => {
      expect(formatTimecode(90)).toBe('01:30:00');
    });

    it('should format frames (30fps)', () => {
      expect(formatTimecode(1.5)).toBe('00:01:15'); // 0.5s = 15 frames at 30fps
    });

    it('should format complete timecode', () => {
      expect(formatTimecode(125.5)).toBe('02:05:15'); // 2m 5s 15f
    });

    it('should handle non-finite values', () => {
      expect(formatTimecode(NaN)).toBe('00:00:00');
      expect(formatTimecode(Infinity)).toBe('00:00:00');
      expect(formatTimecode(-Infinity)).toBe('00:00:00');
    });

    it('should handle negative values as zero', () => {
      expect(formatTimecode(-10)).toBe('00:00:00');
    });

    it('should pad single digits with zeros', () => {
      expect(formatTimecode(5.1)).toBe('00:05:03'); // 0m 5s 3f
    });

    it('should handle large values correctly', () => {
      expect(formatTimecode(3661)).toBe('61:01:00'); // 61m 1s 0f
    });

    it('should calculate frames correctly', () => {
      expect(formatTimecode(1.0333)).toBe('00:01:00'); // ~1.033s = 1 frame
      expect(formatTimecode(1.0666)).toBe('00:01:01'); // ~1.066s = 2 frames
    });
  });
});
