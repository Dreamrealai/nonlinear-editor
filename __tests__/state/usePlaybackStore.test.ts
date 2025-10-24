import { renderHook, act } from '@testing-library/react';
import { usePlaybackStore } from '@/state/usePlaybackStore';
import { ZOOM_CONSTANTS } from '@/lib/constants';

const { MIN_ZOOM, MAX_ZOOM, DEFAULT_ZOOM } = ZOOM_CONSTANTS;

describe('usePlaybackStore', () => {
  beforeEach(() => {
    // Reset store before each test
    const { result } = renderHook(() => usePlaybackStore());
    act(() => {
      result.current.setCurrentTime(0);
      result.current.setZoom(DEFAULT_ZOOM);
      result.current.setIsPlaying(false);
    });
  });

  describe('Initial State', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => usePlaybackStore());

      expect(result.current.currentTime).toBe(0);
      expect(result.current.zoom).toBe(DEFAULT_ZOOM);
      expect(result.current.isPlaying).toBe(false);
    });

    it('should have all expected properties', () => {
      const { result } = renderHook(() => usePlaybackStore());

      expect(result.current).toHaveProperty('currentTime');
      expect(result.current).toHaveProperty('zoom');
      expect(result.current).toHaveProperty('isPlaying');
      expect(result.current).toHaveProperty('setCurrentTime');
      expect(result.current).toHaveProperty('setZoom');
      expect(result.current).toHaveProperty('setIsPlaying');
      expect(result.current).toHaveProperty('play');
      expect(result.current).toHaveProperty('pause');
      expect(result.current).toHaveProperty('togglePlayPause');
    });

    it('should have all actions as functions', () => {
      const { result } = renderHook(() => usePlaybackStore());

      expect(typeof result.current.setCurrentTime).toBe('function');
      expect(typeof result.current.setZoom).toBe('function');
      expect(typeof result.current.setIsPlaying).toBe('function');
      expect(typeof result.current.play).toBe('function');
      expect(typeof result.current.pause).toBe('function');
      expect(typeof result.current.togglePlayPause).toBe('function');
    });
  });

  describe('Current Time Management', () => {
    it('should set current time', () => {
      const { result } = renderHook(() => usePlaybackStore());

      act(() => {
        result.current.setCurrentTime(5.5);
      });

      expect(result.current.currentTime).toBe(5.5);
    });

    it('should update current time to different values', () => {
      const { result } = renderHook(() => usePlaybackStore());

      act(() => {
        result.current.setCurrentTime(10);
      });
      expect(result.current.currentTime).toBe(10);

      act(() => {
        result.current.setCurrentTime(20);
      });
      expect(result.current.currentTime).toBe(20);

      act(() => {
        result.current.setCurrentTime(0);
      });
      expect(result.current.currentTime).toBe(0);
    });

    it('should clamp negative time to 0', () => {
      const { result } = renderHook(() => usePlaybackStore());

      act(() => {
        result.current.setCurrentTime(-10);
      });

      expect(result.current.currentTime).toBe(0);
    });

    it('should clamp very negative time to 0', () => {
      const { result } = renderHook(() => usePlaybackStore());

      act(() => {
        result.current.setCurrentTime(-999999);
      });

      expect(result.current.currentTime).toBe(0);
    });

    it('should accept zero time', () => {
      const { result } = renderHook(() => usePlaybackStore());

      act(() => {
        result.current.setCurrentTime(100);
        result.current.setCurrentTime(0);
      });

      expect(result.current.currentTime).toBe(0);
    });

    it('should accept fractional times', () => {
      const { result } = renderHook(() => usePlaybackStore());

      act(() => {
        result.current.setCurrentTime(1.23456);
      });

      expect(result.current.currentTime).toBe(1.23456);
    });

    it('should accept very large times', () => {
      const { result } = renderHook(() => usePlaybackStore());

      act(() => {
        result.current.setCurrentTime(9999999);
      });

      expect(result.current.currentTime).toBe(9999999);
    });

    it('should handle rapid time updates', () => {
      const { result } = renderHook(() => usePlaybackStore());

      act(() => {
        result.current.setCurrentTime(1);
        result.current.setCurrentTime(2);
        result.current.setCurrentTime(3);
        result.current.setCurrentTime(4);
        result.current.setCurrentTime(5);
      });

      expect(result.current.currentTime).toBe(5);
    });

    it('should handle frame-accurate times (30fps)', () => {
      const { result } = renderHook(() => usePlaybackStore());
      const frameTime = 1 / 30; // ~0.0333

      act(() => {
        result.current.setCurrentTime(frameTime);
      });

      expect(result.current.currentTime).toBeCloseTo(0.0333, 4);
    });

    it('should handle frame-accurate times (60fps)', () => {
      const { result } = renderHook(() => usePlaybackStore());
      const frameTime = 1 / 60; // ~0.0167

      act(() => {
        result.current.setCurrentTime(frameTime);
      });

      expect(result.current.currentTime).toBeCloseTo(0.0167, 4);
    });
  });

  describe('Zoom Management', () => {
    it('should set zoom level', () => {
      const { result } = renderHook(() => usePlaybackStore());

      act(() => {
        result.current.setZoom(100);
      });

      expect(result.current.zoom).toBe(100);
    });

    it('should update zoom to different values', () => {
      const { result } = renderHook(() => usePlaybackStore());

      act(() => {
        result.current.setZoom(50);
      });
      expect(result.current.zoom).toBe(50);

      act(() => {
        result.current.setZoom(100);
      });
      expect(result.current.zoom).toBe(100);

      act(() => {
        result.current.setZoom(150);
      });
      expect(result.current.zoom).toBe(150);
    });

    it('should clamp zoom to minimum value', () => {
      const { result } = renderHook(() => usePlaybackStore());

      act(() => {
        result.current.setZoom(5); // Below MIN_ZOOM (10)
      });

      expect(result.current.zoom).toBe(MIN_ZOOM);
    });

    it('should clamp very low zoom to minimum value', () => {
      const { result } = renderHook(() => usePlaybackStore());

      act(() => {
        result.current.setZoom(-100);
      });

      expect(result.current.zoom).toBe(MIN_ZOOM);
    });

    it('should clamp zoom to maximum value', () => {
      const { result } = renderHook(() => usePlaybackStore());

      act(() => {
        result.current.setZoom(300); // Above MAX_ZOOM (200)
      });

      expect(result.current.zoom).toBe(MAX_ZOOM);
    });

    it('should clamp very high zoom to maximum value', () => {
      const { result } = renderHook(() => usePlaybackStore());

      act(() => {
        result.current.setZoom(9999);
      });

      expect(result.current.zoom).toBe(MAX_ZOOM);
    });

    it('should accept zoom at minimum boundary', () => {
      const { result } = renderHook(() => usePlaybackStore());

      act(() => {
        result.current.setZoom(MIN_ZOOM);
      });

      expect(result.current.zoom).toBe(MIN_ZOOM);
    });

    it('should accept zoom at maximum boundary', () => {
      const { result } = renderHook(() => usePlaybackStore());

      act(() => {
        result.current.setZoom(MAX_ZOOM);
      });

      expect(result.current.zoom).toBe(MAX_ZOOM);
    });

    it('should accept zoom at default value', () => {
      const { result } = renderHook(() => usePlaybackStore());

      act(() => {
        result.current.setZoom(DEFAULT_ZOOM);
      });

      expect(result.current.zoom).toBe(DEFAULT_ZOOM);
    });

    it('should accept fractional zoom values', () => {
      const { result } = renderHook(() => usePlaybackStore());

      act(() => {
        result.current.setZoom(75.5);
      });

      expect(result.current.zoom).toBe(75.5);
    });

    it('should handle rapid zoom changes', () => {
      const { result } = renderHook(() => usePlaybackStore());

      act(() => {
        result.current.setZoom(50);
        result.current.setZoom(100);
        result.current.setZoom(150);
        result.current.setZoom(75);
        result.current.setZoom(125);
      });

      expect(result.current.zoom).toBe(125);
    });

    it('should clamp zoom in valid range (MIN to MAX)', () => {
      const { result } = renderHook(() => usePlaybackStore());

      const testCases = [
        { input: 0, expected: MIN_ZOOM },
        { input: MIN_ZOOM - 1, expected: MIN_ZOOM },
        { input: MIN_ZOOM, expected: MIN_ZOOM },
        { input: MIN_ZOOM + 10, expected: MIN_ZOOM + 10 },
        { input: (MIN_ZOOM + MAX_ZOOM) / 2, expected: (MIN_ZOOM + MAX_ZOOM) / 2 },
        { input: MAX_ZOOM - 10, expected: MAX_ZOOM - 10 },
        { input: MAX_ZOOM, expected: MAX_ZOOM },
        { input: MAX_ZOOM + 1, expected: MAX_ZOOM },
        { input: 1000, expected: MAX_ZOOM },
      ];

      testCases.forEach(({ input, expected }) => {
        act(() => {
          result.current.setZoom(input);
        });
        expect(result.current.zoom).toBe(expected);
      });
    });
  });

  describe('Playback State Management', () => {
    it('should set isPlaying to true', () => {
      const { result } = renderHook(() => usePlaybackStore());

      act(() => {
        result.current.setIsPlaying(true);
      });

      expect(result.current.isPlaying).toBe(true);
    });

    it('should set isPlaying to false', () => {
      const { result } = renderHook(() => usePlaybackStore());

      act(() => {
        result.current.setIsPlaying(true);
        result.current.setIsPlaying(false);
      });

      expect(result.current.isPlaying).toBe(false);
    });

    it('should toggle isPlaying state multiple times', () => {
      const { result } = renderHook(() => usePlaybackStore());

      act(() => {
        result.current.setIsPlaying(true);
      });
      expect(result.current.isPlaying).toBe(true);

      act(() => {
        result.current.setIsPlaying(false);
      });
      expect(result.current.isPlaying).toBe(false);

      act(() => {
        result.current.setIsPlaying(true);
      });
      expect(result.current.isPlaying).toBe(true);
    });
  });

  describe('Play/Pause Actions', () => {
    it('should play (set isPlaying to true)', () => {
      const { result } = renderHook(() => usePlaybackStore());

      act(() => {
        result.current.play();
      });

      expect(result.current.isPlaying).toBe(true);
    });

    it('should pause (set isPlaying to false)', () => {
      const { result } = renderHook(() => usePlaybackStore());

      act(() => {
        result.current.play();
        result.current.pause();
      });

      expect(result.current.isPlaying).toBe(false);
    });

    it('should remain playing when play is called multiple times', () => {
      const { result } = renderHook(() => usePlaybackStore());

      act(() => {
        result.current.play();
        result.current.play();
        result.current.play();
      });

      expect(result.current.isPlaying).toBe(true);
    });

    it('should remain paused when pause is called multiple times', () => {
      const { result } = renderHook(() => usePlaybackStore());

      act(() => {
        result.current.pause();
        result.current.pause();
        result.current.pause();
      });

      expect(result.current.isPlaying).toBe(false);
    });

    it('should alternate between play and pause', () => {
      const { result } = renderHook(() => usePlaybackStore());

      act(() => {
        result.current.play();
      });
      expect(result.current.isPlaying).toBe(true);

      act(() => {
        result.current.pause();
      });
      expect(result.current.isPlaying).toBe(false);

      act(() => {
        result.current.play();
      });
      expect(result.current.isPlaying).toBe(true);

      act(() => {
        result.current.pause();
      });
      expect(result.current.isPlaying).toBe(false);
    });
  });

  describe('Toggle Play/Pause', () => {
    it('should toggle from paused to playing', () => {
      const { result } = renderHook(() => usePlaybackStore());

      act(() => {
        result.current.togglePlayPause();
      });

      expect(result.current.isPlaying).toBe(true);
    });

    it('should toggle from playing to paused', () => {
      const { result } = renderHook(() => usePlaybackStore());

      act(() => {
        result.current.play();
        result.current.togglePlayPause();
      });

      expect(result.current.isPlaying).toBe(false);
    });

    it('should toggle multiple times correctly', () => {
      const { result } = renderHook(() => usePlaybackStore());

      act(() => {
        result.current.togglePlayPause(); // false -> true
      });
      expect(result.current.isPlaying).toBe(true);

      act(() => {
        result.current.togglePlayPause(); // true -> false
      });
      expect(result.current.isPlaying).toBe(false);

      act(() => {
        result.current.togglePlayPause(); // false -> true
      });
      expect(result.current.isPlaying).toBe(true);

      act(() => {
        result.current.togglePlayPause(); // true -> false
      });
      expect(result.current.isPlaying).toBe(false);
    });

    it('should toggle even after explicit play call', () => {
      const { result } = renderHook(() => usePlaybackStore());

      act(() => {
        result.current.play();
        result.current.togglePlayPause();
      });

      expect(result.current.isPlaying).toBe(false);
    });

    it('should toggle even after explicit pause call', () => {
      const { result } = renderHook(() => usePlaybackStore());

      act(() => {
        result.current.pause();
        result.current.togglePlayPause();
      });

      expect(result.current.isPlaying).toBe(true);
    });
  });

  describe('State Independence', () => {
    it('should not affect zoom when changing current time', () => {
      const { result } = renderHook(() => usePlaybackStore());

      act(() => {
        result.current.setZoom(100);
        result.current.setCurrentTime(50);
      });

      expect(result.current.zoom).toBe(100);
      expect(result.current.currentTime).toBe(50);
    });

    it('should not affect current time when changing zoom', () => {
      const { result } = renderHook(() => usePlaybackStore());

      act(() => {
        result.current.setCurrentTime(50);
        result.current.setZoom(100);
      });

      expect(result.current.currentTime).toBe(50);
      expect(result.current.zoom).toBe(100);
    });

    it('should not affect zoom or time when changing playback state', () => {
      const { result } = renderHook(() => usePlaybackStore());

      act(() => {
        result.current.setCurrentTime(50);
        result.current.setZoom(100);
        result.current.play();
      });

      expect(result.current.currentTime).toBe(50);
      expect(result.current.zoom).toBe(100);
      expect(result.current.isPlaying).toBe(true);
    });

    it('should maintain all state independently', () => {
      const { result } = renderHook(() => usePlaybackStore());

      act(() => {
        result.current.setCurrentTime(25);
        result.current.setZoom(75);
        result.current.play();
      });

      expect(result.current.currentTime).toBe(25);
      expect(result.current.zoom).toBe(75);
      expect(result.current.isPlaying).toBe(true);

      act(() => {
        result.current.setCurrentTime(100);
      });

      expect(result.current.currentTime).toBe(100);
      expect(result.current.zoom).toBe(75); // Unchanged
      expect(result.current.isPlaying).toBe(true); // Unchanged

      act(() => {
        result.current.setZoom(150);
      });

      expect(result.current.currentTime).toBe(100); // Unchanged
      expect(result.current.zoom).toBe(150);
      expect(result.current.isPlaying).toBe(true); // Unchanged

      act(() => {
        result.current.pause();
      });

      expect(result.current.currentTime).toBe(100); // Unchanged
      expect(result.current.zoom).toBe(150); // Unchanged
      expect(result.current.isPlaying).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle Infinity for current time', () => {
      const { result } = renderHook(() => usePlaybackStore());

      act(() => {
        result.current.setCurrentTime(Infinity);
      });

      expect(result.current.currentTime).toBe(Infinity);
    });

    it('should handle very precise fractional seconds', () => {
      const { result } = renderHook(() => usePlaybackStore());

      act(() => {
        result.current.setCurrentTime(0.0000001);
      });

      expect(result.current.currentTime).toBe(0.0000001);
    });

    it('should handle zoom at exact boundaries', () => {
      const { result } = renderHook(() => usePlaybackStore());

      act(() => {
        result.current.setZoom(MIN_ZOOM);
      });
      expect(result.current.zoom).toBe(MIN_ZOOM);

      act(() => {
        result.current.setZoom(MAX_ZOOM);
      });
      expect(result.current.zoom).toBe(MAX_ZOOM);
    });

    it('should handle rapid state changes', () => {
      const { result } = renderHook(() => usePlaybackStore());

      act(() => {
        for (let i = 0; i < 100; i++) {
          result.current.setCurrentTime(i);
          result.current.setZoom(MIN_ZOOM + (i % (MAX_ZOOM - MIN_ZOOM)));
          result.current.togglePlayPause();
        }
      });

      // Should complete without errors and have valid final state
      expect(result.current.currentTime).toBe(99);
      expect(result.current.zoom).toBeGreaterThanOrEqual(MIN_ZOOM);
      expect(result.current.zoom).toBeLessThanOrEqual(MAX_ZOOM);
      expect(typeof result.current.isPlaying).toBe('boolean');
    });

    it('should handle simultaneous state updates', () => {
      const { result } = renderHook(() => usePlaybackStore());

      act(() => {
        result.current.setCurrentTime(123.456);
        result.current.setZoom(89);
        result.current.play();
      });

      expect(result.current.currentTime).toBe(123.456);
      expect(result.current.zoom).toBe(89);
      expect(result.current.isPlaying).toBe(true);
    });
  });

  describe('Typical Use Cases', () => {
    it('should support seek while playing', () => {
      const { result } = renderHook(() => usePlaybackStore());

      act(() => {
        result.current.play();
        result.current.setCurrentTime(30);
      });

      expect(result.current.isPlaying).toBe(true);
      expect(result.current.currentTime).toBe(30);
    });

    it('should support seek while paused', () => {
      const { result } = renderHook(() => usePlaybackStore());

      act(() => {
        result.current.pause();
        result.current.setCurrentTime(45);
      });

      expect(result.current.isPlaying).toBe(false);
      expect(result.current.currentTime).toBe(45);
    });

    it('should support zoom in while playing', () => {
      const { result } = renderHook(() => usePlaybackStore());

      act(() => {
        result.current.play();
        result.current.setZoom(150);
      });

      expect(result.current.isPlaying).toBe(true);
      expect(result.current.zoom).toBe(150);
    });

    it('should support zoom out while paused', () => {
      const { result } = renderHook(() => usePlaybackStore());

      act(() => {
        result.current.pause();
        result.current.setZoom(25);
      });

      expect(result.current.isPlaying).toBe(false);
      expect(result.current.zoom).toBe(25);
    });

    it('should support reset to beginning', () => {
      const { result } = renderHook(() => usePlaybackStore());

      act(() => {
        result.current.setCurrentTime(100);
        result.current.play();
      });

      act(() => {
        result.current.setCurrentTime(0);
        result.current.pause();
      });

      expect(result.current.currentTime).toBe(0);
      expect(result.current.isPlaying).toBe(false);
    });

    it('should support playback workflow (play -> seek -> pause)', () => {
      const { result } = renderHook(() => usePlaybackStore());

      // Start playback
      act(() => {
        result.current.play();
      });
      expect(result.current.isPlaying).toBe(true);

      // Seek during playback
      act(() => {
        result.current.setCurrentTime(60);
      });
      expect(result.current.currentTime).toBe(60);
      expect(result.current.isPlaying).toBe(true);

      // Pause
      act(() => {
        result.current.pause();
      });
      expect(result.current.isPlaying).toBe(false);
      expect(result.current.currentTime).toBe(60);
    });

    it('should support zoom workflow', () => {
      const { result } = renderHook(() => usePlaybackStore());

      // Zoom in
      act(() => {
        result.current.setZoom(100);
      });
      expect(result.current.zoom).toBe(100);

      // Zoom in more
      act(() => {
        result.current.setZoom(150);
      });
      expect(result.current.zoom).toBe(150);

      // Zoom out
      act(() => {
        result.current.setZoom(75);
      });
      expect(result.current.zoom).toBe(75);

      // Reset to default
      act(() => {
        result.current.setZoom(DEFAULT_ZOOM);
      });
      expect(result.current.zoom).toBe(DEFAULT_ZOOM);
    });
  });
});
