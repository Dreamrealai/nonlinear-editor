/**
 * Test Suite: Playback Slice
 *
 * Tests playback-related state including:
 * - Current time / playhead position
 * - Timecode display mode
 * - Auto-scroll settings
 * - State transitions and edge cases
 */

import { renderHook, act } from '@testing-library/react';
import { useEditorStore } from '@/state/useEditorStore';

describe('Playback Slice', () => {
  beforeEach((): void => {
    // Reset store before each test
    const { result } = renderHook(() => useEditorStore());
    act(() => {
      result.current.setCurrentTime(0);
      result.current.toggleAutoScroll();
      if (result.current.timecodeDisplayMode === 'timecode') {
        result.current.toggleTimecodeDisplayMode();
      }
    });
  });

  describe('Initial State', () => {
    it('should have initial currentTime of 0', () => {
      const { result } = renderHook(() => useEditorStore());
      expect(result.current.currentTime).toBe(0);
    });

    it('should have initial timecodeDisplayMode of duration', () => {
      const { result } = renderHook(() => useEditorStore());
      expect(result.current.timecodeDisplayMode).toBe('duration');
    });

    it('should have initial autoScrollEnabled of true', () => {
      const { result } = renderHook(() => useEditorStore());
      expect(result.current.autoScrollEnabled).toBe(true);
    });
  });

  describe('setCurrentTime', () => {
    it('should set current time to positive value', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.setCurrentTime(10.5);
      });

      expect(result.current.currentTime).toBe(10.5);
    });

    it('should set current time to 0', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.setCurrentTime(5);
        result.current.setCurrentTime(0);
      });

      expect(result.current.currentTime).toBe(0);
    });

    it('should set current time to large value', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.setCurrentTime(3600.75); // 1 hour + 0.75 seconds
      });

      expect(result.current.currentTime).toBe(3600.75);
    });

    it('should update current time multiple times', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.setCurrentTime(1);
      });

      expect(result.current.currentTime).toBe(1);

      act(() => {
        result.current.setCurrentTime(2.5);
      });

      expect(result.current.currentTime).toBe(2.5);

      act(() => {
        result.current.setCurrentTime(5);
      });

      expect(result.current.currentTime).toBe(5);
    });

    it('should handle fractional seconds', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.setCurrentTime(0.033333); // ~1 frame at 30fps
      });

      expect(result.current.currentTime).toBeCloseTo(0.033333);
    });

    it('should handle very small time values', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.setCurrentTime(0.001);
      });

      expect(result.current.currentTime).toBe(0.001);
    });

    it('should allow setting negative time', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.setCurrentTime(-5);
      });

      expect(result.current.currentTime).toBe(-5);
    });

    it('should replace previous time value', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.setCurrentTime(10);
        result.current.setCurrentTime(20);
      });

      expect(result.current.currentTime).toBe(20);
    });
  });

  describe('toggleTimecodeDisplayMode', () => {
    it('should toggle from duration to timecode', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.toggleTimecodeDisplayMode();
      });

      expect(result.current.timecodeDisplayMode).toBe('timecode');
    });

    it('should toggle from timecode to duration', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.toggleTimecodeDisplayMode();
        result.current.toggleTimecodeDisplayMode();
      });

      expect(result.current.timecodeDisplayMode).toBe('duration');
    });

    it('should toggle multiple times', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.toggleTimecodeDisplayMode();
      });

      expect(result.current.timecodeDisplayMode).toBe('timecode');

      act(() => {
        result.current.toggleTimecodeDisplayMode();
      });

      expect(result.current.timecodeDisplayMode).toBe('duration');

      act(() => {
        result.current.toggleTimecodeDisplayMode();
      });

      expect(result.current.timecodeDisplayMode).toBe('timecode');
    });

    it('should maintain current time when toggling display mode', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.setCurrentTime(15.5);
        result.current.toggleTimecodeDisplayMode();
      });

      expect(result.current.currentTime).toBe(15.5);
      expect(result.current.timecodeDisplayMode).toBe('timecode');
    });
  });

  describe('toggleAutoScroll', () => {
    it('should toggle auto-scroll from true to false', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.toggleAutoScroll();
      });

      expect(result.current.autoScrollEnabled).toBe(false);
    });

    it('should toggle auto-scroll from false to true', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.toggleAutoScroll();
        result.current.toggleAutoScroll();
      });

      expect(result.current.autoScrollEnabled).toBe(true);
    });

    it('should toggle auto-scroll multiple times', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.toggleAutoScroll();
      });

      expect(result.current.autoScrollEnabled).toBe(false);

      act(() => {
        result.current.toggleAutoScroll();
      });

      expect(result.current.autoScrollEnabled).toBe(true);

      act(() => {
        result.current.toggleAutoScroll();
      });

      expect(result.current.autoScrollEnabled).toBe(false);
    });

    it('should maintain current time when toggling auto-scroll', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.setCurrentTime(25.75);
        result.current.toggleAutoScroll();
      });

      expect(result.current.currentTime).toBe(25.75);
      expect(result.current.autoScrollEnabled).toBe(false);
    });

    it('should maintain display mode when toggling auto-scroll', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.toggleTimecodeDisplayMode();
        result.current.toggleAutoScroll();
      });

      expect(result.current.timecodeDisplayMode).toBe('timecode');
      expect(result.current.autoScrollEnabled).toBe(false);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle all playback state changes together', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.setCurrentTime(10);
        result.current.toggleTimecodeDisplayMode();
        result.current.toggleAutoScroll();
      });

      expect(result.current.currentTime).toBe(10);
      expect(result.current.timecodeDisplayMode).toBe('timecode');
      expect(result.current.autoScrollEnabled).toBe(false);
    });

    it('should maintain independent state for each property', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.setCurrentTime(5);
      });

      expect(result.current.timecodeDisplayMode).toBe('duration');
      expect(result.current.autoScrollEnabled).toBe(true);

      act(() => {
        result.current.toggleTimecodeDisplayMode();
      });

      expect(result.current.currentTime).toBe(5);
      expect(result.current.autoScrollEnabled).toBe(true);

      act(() => {
        result.current.toggleAutoScroll();
      });

      expect(result.current.currentTime).toBe(5);
      expect(result.current.timecodeDisplayMode).toBe('timecode');
    });

    it('should handle rapid state changes', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.setCurrentTime(1);
        result.current.setCurrentTime(2);
        result.current.setCurrentTime(3);
        result.current.toggleTimecodeDisplayMode();
        result.current.toggleTimecodeDisplayMode();
        result.current.toggleAutoScroll();
      });

      expect(result.current.currentTime).toBe(3);
      expect(result.current.timecodeDisplayMode).toBe('duration');
      expect(result.current.autoScrollEnabled).toBe(false);
    });

    it('should simulate playback scenario', () => {
      const { result } = renderHook(() => useEditorStore());

      // Start playback
      act(() => {
        result.current.setCurrentTime(0);
      });

      expect(result.current.currentTime).toBe(0);

      // Advance playhead
      act(() => {
        result.current.setCurrentTime(1);
      });

      expect(result.current.currentTime).toBe(1);

      // Continue advancing
      act(() => {
        result.current.setCurrentTime(2);
      });

      expect(result.current.currentTime).toBe(2);

      // Seek to different position
      act(() => {
        result.current.setCurrentTime(10);
      });

      expect(result.current.currentTime).toBe(10);

      // Reset
      act(() => {
        result.current.setCurrentTime(0);
      });

      expect(result.current.currentTime).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle setting time to 0 repeatedly', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.setCurrentTime(0);
        result.current.setCurrentTime(0);
        result.current.setCurrentTime(0);
      });

      expect(result.current.currentTime).toBe(0);
    });

    it('should handle very large time values', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.setCurrentTime(999999);
      });

      expect(result.current.currentTime).toBe(999999);
    });

    it('should handle time precision', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.setCurrentTime(0.123456789);
      });

      expect(result.current.currentTime).toBeCloseTo(0.123456789);
    });

    it('should handle toggling display mode rapidly', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.toggleTimecodeDisplayMode();
        }
      });

      expect(result.current.timecodeDisplayMode).toBe('duration');
    });

    it('should handle toggling auto-scroll rapidly', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.toggleAutoScroll();
        }
      });

      expect(result.current.autoScrollEnabled).toBe(true);
    });

    it('should handle all state resets', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.setCurrentTime(100);
        result.current.toggleTimecodeDisplayMode();
        result.current.toggleAutoScroll();
      });

      act(() => {
        result.current.setCurrentTime(0);
        result.current.toggleTimecodeDisplayMode();
        result.current.toggleAutoScroll();
      });

      expect(result.current.currentTime).toBe(0);
      expect(result.current.timecodeDisplayMode).toBe('duration');
      expect(result.current.autoScrollEnabled).toBe(true);
    });
  });

  describe('Timecode Modes', () => {
    it('should only have two valid timecode modes', () => {
      const { result } = renderHook(() => useEditorStore());

      const mode1 = result.current.timecodeDisplayMode;

      act(() => {
        result.current.toggleTimecodeDisplayMode();
      });

      const mode2 = result.current.timecodeDisplayMode;

      act(() => {
        result.current.toggleTimecodeDisplayMode();
      });

      const mode3 = result.current.timecodeDisplayMode;

      expect(['duration', 'timecode']).toContain(mode1);
      expect(['duration', 'timecode']).toContain(mode2);
      expect(mode1).toBe(mode3);
      expect(mode1).not.toBe(mode2);
    });
  });

  describe('Auto-Scroll Behavior', () => {
    it('should reflect auto-scroll preference changes', () => {
      const { result } = renderHook(() => useEditorStore());

      const initialState = result.current.autoScrollEnabled;

      act(() => {
        result.current.toggleAutoScroll();
      });

      expect(result.current.autoScrollEnabled).toBe(!initialState);

      act(() => {
        result.current.toggleAutoScroll();
      });

      expect(result.current.autoScrollEnabled).toBe(initialState);
    });
  });
});
