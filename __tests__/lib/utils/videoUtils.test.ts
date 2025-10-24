/**
 * Tests for Video Utility Functions
 */

import {
  clamp,
  generateCSSFilter,
  generateCSSTransform,
  computeClipMetas,
  computeOpacity,
  formatTimecode,
  ensureBuffered,
  SIGNED_URL_TTL_DEFAULT,
  SIGNED_URL_BUFFER_MS,
} from '@/lib/utils/videoUtils';
import type { Clip, ColorCorrection, Transform } from '@/types/timeline';

describe('videoUtils', () => {
  describe('Constants', () => {
    it('should export SIGNED_URL_TTL_DEFAULT as 600 seconds', () => {
      expect(SIGNED_URL_TTL_DEFAULT).toBe(600);
    });

    it('should export SIGNED_URL_BUFFER_MS as 5000 milliseconds', () => {
      expect(SIGNED_URL_BUFFER_MS).toBe(5_000);
    });
  });

  describe('clamp', () => {
    it('should clamp value within default range 0-1', () => {
      expect(clamp(0.5)).toBe(0.5);
      expect(clamp(-0.5)).toBe(0);
      expect(clamp(1.5)).toBe(1);
    });

    it('should clamp value within custom range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });

    it('should handle edge cases', () => {
      expect(clamp(0, 0, 1)).toBe(0);
      expect(clamp(1, 0, 1)).toBe(1);
      expect(clamp(0.5, 0.5, 0.5)).toBe(0.5);
    });

    it('should handle negative ranges', () => {
      expect(clamp(0, -10, -5)).toBe(-5);
      expect(clamp(-20, -10, -5)).toBe(-10);
    });
  });

  describe('generateCSSFilter', () => {
    it('should return "none" when no color correction provided', () => {
      expect(generateCSSFilter()).toBe('none');
      expect(generateCSSFilter(undefined)).toBe('none');
    });

    it('should generate brightness filter', () => {
      const colorCorrection: ColorCorrection = {
        brightness: 150,
        contrast: 100,
        saturation: 100,
        hue: 0,
      };
      expect(generateCSSFilter(colorCorrection)).toBe('brightness(150%)');
    });

    it('should generate contrast filter', () => {
      const colorCorrection: ColorCorrection = {
        brightness: 100,
        contrast: 150,
        saturation: 100,
        hue: 0,
      };
      expect(generateCSSFilter(colorCorrection)).toBe('contrast(150%)');
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
        hue: 180,
      };
      expect(generateCSSFilter(colorCorrection)).toBe('hue-rotate(180deg)');
    });

    it('should combine multiple filters', () => {
      const colorCorrection: ColorCorrection = {
        brightness: 120,
        contrast: 110,
        saturation: 90,
        hue: 45,
      };
      const result = generateCSSFilter(colorCorrection);
      expect(result).toContain('brightness(120%)');
      expect(result).toContain('contrast(110%)');
      expect(result).toContain('saturate(90%)');
      expect(result).toContain('hue-rotate(45deg)');
    });

    it('should return "none" when all values are defaults', () => {
      const colorCorrection: ColorCorrection = {
        brightness: 100,
        contrast: 100,
        saturation: 100,
        hue: 0,
      };
      expect(generateCSSFilter(colorCorrection)).toBe('none');
    });

    it('should handle extreme values', () => {
      const colorCorrection: ColorCorrection = {
        brightness: 200,
        contrast: 0,
        saturation: 200,
        hue: 360,
      };
      const result = generateCSSFilter(colorCorrection);
      expect(result).toContain('brightness(200%)');
      expect(result).toContain('contrast(0%)');
      expect(result).toContain('saturate(200%)');
      expect(result).toContain('hue-rotate(360deg)');
    });
  });

  describe('generateCSSTransform', () => {
    it('should return basic transform when no transform provided', () => {
      expect(generateCSSTransform()).toBe('translateZ(0)');
      expect(generateCSSTransform(undefined)).toBe('translateZ(0)');
    });

    it('should apply scale', () => {
      const transform: Transform = {
        scale: 2.0,
        rotation: 0,
        flipHorizontal: false,
        flipVertical: false,
      };
      expect(generateCSSTransform(transform)).toBe('translateZ(0) scale(2, 2)');
    });

    it('should apply rotation', () => {
      const transform: Transform = {
        scale: 1.0,
        rotation: 90,
        flipHorizontal: false,
        flipVertical: false,
      };
      expect(generateCSSTransform(transform)).toBe('translateZ(0) scale(1, 1) rotate(90deg)');
    });

    it('should apply horizontal flip', () => {
      const transform: Transform = {
        scale: 1.0,
        rotation: 0,
        flipHorizontal: true,
        flipVertical: false,
      };
      expect(generateCSSTransform(transform)).toBe('translateZ(0) scale(-1, 1)');
    });

    it('should apply vertical flip', () => {
      const transform: Transform = {
        scale: 1.0,
        rotation: 0,
        flipHorizontal: false,
        flipVertical: true,
      };
      expect(generateCSSTransform(transform)).toBe('translateZ(0) scale(1, -1)');
    });

    it('should combine flip and scale', () => {
      const transform: Transform = {
        scale: 2.0,
        rotation: 0,
        flipHorizontal: true,
        flipVertical: true,
      };
      expect(generateCSSTransform(transform)).toBe('translateZ(0) scale(-2, -2)');
    });

    it('should combine all transformations', () => {
      const transform: Transform = {
        scale: 1.5,
        rotation: 45,
        flipHorizontal: true,
        flipVertical: false,
      };
      expect(generateCSSTransform(transform)).toBe('translateZ(0) scale(-1.5, 1.5) rotate(45deg)');
    });

    it('should not include rotation when 0', () => {
      const transform: Transform = {
        scale: 1.0,
        rotation: 0,
        flipHorizontal: false,
        flipVertical: false,
      };
      const result = generateCSSTransform(transform);
      expect(result).not.toContain('rotate');
      expect(result).toBe('translateZ(0) scale(1, 1)');
    });
  });

  describe('formatTimecode', () => {
    it('should format zero seconds', () => {
      expect(formatTimecode(0)).toBe('00:00:00');
    });

    it('should format seconds only', () => {
      expect(formatTimecode(30)).toBe('00:30:00');
    });

    it('should format minutes and seconds', () => {
      expect(formatTimecode(90)).toBe('01:30:00');
    });

    it('should format with frames', () => {
      expect(formatTimecode(90.5)).toBe('01:30:15');
    });

    it('should handle fractional seconds for frames', () => {
      expect(formatTimecode(1.033)).toBe('00:01:00');
      expect(formatTimecode(1.5)).toBe('00:01:15');
      expect(formatTimecode(1.966)).toBe('00:01:28');
    });

    it('should handle large times', () => {
      expect(formatTimecode(3661.5)).toBe('61:01:15');
    });

    it('should handle negative values as zero', () => {
      expect(formatTimecode(-10)).toBe('00:00:00');
    });

    it('should handle non-finite values', () => {
      expect(formatTimecode(Infinity)).toBe('00:00:00');
      expect(formatTimecode(NaN)).toBe('00:00:00');
    });

    it('should pad single digits correctly', () => {
      expect(formatTimecode(65.1)).toBe('01:05:03');
    });
  });

  describe('computeClipMetas', () => {
    it('should return empty map for no clips', () => {
      const result = computeClipMetas([]);
      expect(result.size).toBe(0);
    });

    it('should compute basic metadata for single clip', () => {
      const clips: Clip[] = [
        {
          id: 'clip-1',
          trackIndex: 0,
          timelinePosition: 0,
          start: 0,
          end: 10,
          filePath: '/test.mp4',
          type: 'video',
          assetId: 'asset-1',
        },
      ];

      const result = computeClipMetas(clips);
      const meta = result.get('clip-1');

      expect(meta).toBeDefined();
      expect(meta?.length).toBe(10);
      expect(meta?.timelineStart).toBe(0);
      expect(meta?.effectiveStart).toBe(0);
      expect(meta?.fadeIn).toBe(0);
      expect(meta?.fadeOut).toBe(0);
    });

    it('should compute fade-in transition', () => {
      const clips: Clip[] = [
        {
          id: 'clip-1',
          trackIndex: 0,
          timelinePosition: 0,
          start: 0,
          end: 10,
          filePath: '/test.mp4',
          type: 'video',
          assetId: 'asset-1',
          transitionToNext: {
            type: 'fade-in',
            duration: 1.0,
          },
        },
      ];

      const result = computeClipMetas(clips);
      const meta = result.get('clip-1');

      expect(meta?.fadeIn).toBe(1.0);
      expect(meta?.transitionType).toBe('fade-in');
      expect(meta?.transitionDuration).toBe(1.0);
    });

    it('should compute fade-out transition', () => {
      const clips: Clip[] = [
        {
          id: 'clip-1',
          trackIndex: 0,
          timelinePosition: 0,
          start: 0,
          end: 10,
          filePath: '/test.mp4',
          type: 'video',
          assetId: 'asset-1',
          transitionToNext: {
            type: 'fade-out',
            duration: 0.5,
          },
        },
      ];

      const result = computeClipMetas(clips);
      const meta = result.get('clip-1');

      expect(meta?.fadeOut).toBe(0.5);
      expect(meta?.transitionType).toBe('fade-out');
    });

    it('should handle crossfade between clips on same track', () => {
      const clips: Clip[] = [
        {
          id: 'clip-1',
          trackIndex: 0,
          timelinePosition: 0,
          start: 0,
          end: 10,
          filePath: '/test1.mp4',
          type: 'video',
          assetId: 'asset-1',
          transitionToNext: {
            type: 'crossfade',
            duration: 1.0,
          },
        },
        {
          id: 'clip-2',
          trackIndex: 0,
          timelinePosition: 10,
          start: 0,
          end: 10,
          filePath: '/test2.mp4',
          type: 'video',
          assetId: 'asset-2',
        },
      ];

      const result = computeClipMetas(clips);
      const meta1 = result.get('clip-1');
      const meta2 = result.get('clip-2');

      expect(meta1?.fadeOut).toBe(1.0);
      expect(meta2?.fadeIn).toBe(1.0);
      expect(meta2?.effectiveStart).toBeLessThan(10);
    });

    it('should handle minimum transition duration', () => {
      const clips: Clip[] = [
        {
          id: 'clip-1',
          trackIndex: 0,
          timelinePosition: 0,
          start: 0,
          end: 10,
          filePath: '/test.mp4',
          type: 'video',
          assetId: 'asset-1',
          transitionToNext: {
            type: 'fade-in',
            duration: 0.01,
          },
        },
      ];

      const result = computeClipMetas(clips);
      const meta = result.get('clip-1');

      expect(meta?.fadeIn).toBeGreaterThanOrEqual(0.05);
    });

    it('should limit crossfade duration to clip length', () => {
      const clips: Clip[] = [
        {
          id: 'clip-1',
          trackIndex: 0,
          timelinePosition: 0,
          start: 0,
          end: 1,
          filePath: '/test.mp4',
          type: 'video',
          assetId: 'asset-1',
          transitionToNext: {
            type: 'crossfade',
            duration: 10.0,
          },
        },
      ];

      const result = computeClipMetas(clips);
      const meta = result.get('clip-1');

      expect(meta?.fadeOut).toBeLessThanOrEqual(1);
    });

    it('should handle clips on different tracks independently', () => {
      const clips: Clip[] = [
        {
          id: 'clip-1',
          trackIndex: 0,
          timelinePosition: 0,
          start: 0,
          end: 10,
          filePath: '/test1.mp4',
          type: 'video',
          assetId: 'asset-1',
          transitionToNext: {
            type: 'crossfade',
            duration: 1.0,
          },
        },
        {
          id: 'clip-2',
          trackIndex: 1,
          timelinePosition: 10,
          start: 0,
          end: 10,
          filePath: '/test2.mp4',
          type: 'video',
          assetId: 'asset-2',
        },
      ];

      const result = computeClipMetas(clips);
      const meta2 = result.get('clip-2');

      expect(meta2?.fadeIn).toBe(0);
      expect(meta2?.effectiveStart).toBe(10);
    });

    it('should handle negative values as zero', () => {
      const clips: Clip[] = [
        {
          id: 'clip-1',
          trackIndex: 0,
          timelinePosition: -5,
          start: -2,
          end: 10,
          filePath: '/test.mp4',
          type: 'video',
          assetId: 'asset-1',
        },
      ];

      const result = computeClipMetas(clips);
      const meta = result.get('clip-1');

      expect(meta?.timelineStart).toBeGreaterThanOrEqual(0);
      expect(meta?.effectiveStart).toBeGreaterThanOrEqual(0);
    });
  });

  describe('computeOpacity', () => {
    const baseMeta = {
      length: 10,
      timelineStart: 0,
      effectiveStart: 0,
      fadeIn: 0,
      fadeOut: 0,
      transitionType: 'none' as const,
      transitionDuration: 0,
    };

    it('should return 1 for progress within clip without fades', () => {
      expect(computeOpacity(baseMeta, 5)).toBe(1);
    });

    it('should return 0 for progress before clip starts', () => {
      expect(computeOpacity(baseMeta, -1)).toBe(0);
    });

    it('should return 0 for progress after clip ends', () => {
      expect(computeOpacity(baseMeta, 11)).toBe(0);
    });

    it('should apply fade-in', () => {
      const meta = { ...baseMeta, fadeIn: 2 };
      expect(computeOpacity(meta, 0)).toBe(0);
      expect(computeOpacity(meta, 1)).toBe(0.5);
      expect(computeOpacity(meta, 2)).toBe(1);
      expect(computeOpacity(meta, 5)).toBe(1);
    });

    it('should apply fade-out', () => {
      const meta = { ...baseMeta, fadeOut: 2 };
      expect(computeOpacity(meta, 5)).toBe(1);
      expect(computeOpacity(meta, 8)).toBe(1);
      expect(computeOpacity(meta, 9)).toBe(0.5);
      expect(computeOpacity(meta, 10)).toBe(0);
    });

    it('should combine fade-in and fade-out', () => {
      const meta = { ...baseMeta, fadeIn: 2, fadeOut: 2 };
      expect(computeOpacity(meta, 0)).toBe(0);
      expect(computeOpacity(meta, 1)).toBe(0.5);
      expect(computeOpacity(meta, 5)).toBe(1);
      expect(computeOpacity(meta, 9)).toBe(0.5);
      expect(computeOpacity(meta, 10)).toBe(0);
    });

    it('should handle overlapping fades', () => {
      const meta = { ...baseMeta, fadeIn: 6, fadeOut: 6 };
      expect(computeOpacity(meta, 5)).toBeLessThan(1);
      expect(computeOpacity(meta, 5)).toBeGreaterThan(0);
    });

    it('should clamp opacity between 0 and 1', () => {
      const meta = { ...baseMeta, fadeIn: 2 };
      expect(computeOpacity(meta, 0)).toBe(0);
      expect(computeOpacity(meta, 3)).toBe(1);
    });
  });

  describe('ensureBuffered', () => {
    let mockVideo: Partial<HTMLVideoElement>;

    beforeEach(() => {
      mockVideo = {
        readyState: 0,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        error: null,
      };
    });

    it('should resolve immediately if already buffered', async () => {
      mockVideo.readyState = 3;
      await expect(ensureBuffered(mockVideo as HTMLVideoElement)).resolves.toBeUndefined();
    });

    it('should resolve immediately if readyState >= 3', async () => {
      mockVideo.readyState = 4;
      await expect(ensureBuffered(mockVideo as HTMLVideoElement)).resolves.toBeUndefined();
    });

    it('should wait for canplay event', async () => {
      mockVideo.readyState = 2;
      const addEventListener = jest.fn((event: string, handler: () => void) => {
        if (event === 'canplay') {
          setTimeout(() => {
            mockVideo.readyState = 3;
            handler();
          }, 10);
        }
      });
      mockVideo.addEventListener = addEventListener;

      await expect(ensureBuffered(mockVideo as HTMLVideoElement)).resolves.toBeUndefined();
    });

    it('should reject on timeout', async () => {
      mockVideo.readyState = 1;
      mockVideo.addEventListener = jest.fn();

      await expect(ensureBuffered(mockVideo as HTMLVideoElement, 100)).rejects.toThrow(
        'Video buffering timeout'
      );
    });

    it('should reject on video error', async () => {
      mockVideo.readyState = 1;
      const addEventListener = jest.fn((event: string, handler: () => void) => {
        if (event === 'error') {
          setTimeout(() => {
            mockVideo.error = { message: 'Failed to load' } as MediaError;
            handler();
          }, 10);
        }
      });
      mockVideo.addEventListener = addEventListener;

      await expect(ensureBuffered(mockVideo as HTMLVideoElement)).rejects.toThrow(
        'Video loading error'
      );
    });

    it('should clean up event listeners on success', async () => {
      mockVideo.readyState = 2;
      const removeEventListener = jest.fn();
      const addEventListener = jest.fn((event: string, handler: () => void) => {
        if (event === 'canplay') {
          setTimeout(() => {
            mockVideo.readyState = 3;
            handler();
          }, 10);
        }
      });
      mockVideo.addEventListener = addEventListener;
      mockVideo.removeEventListener = removeEventListener;

      await ensureBuffered(mockVideo as HTMLVideoElement);

      expect(removeEventListener).toHaveBeenCalledWith('canplay', expect.any(Function));
      expect(removeEventListener).toHaveBeenCalledWith('canplaythrough', expect.any(Function));
      expect(removeEventListener).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });
});
