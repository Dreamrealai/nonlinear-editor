/**
 * Test Suite: useTimelineScrolling Hook
 *
 * Tests timeline scrolling functionality including:
 * - Initial state
 * - Space and panning state tracking
 * - Hook dependencies
 * - Lifecycle
 */

import { renderHook } from '@testing-library/react';
import { useTimelineScrolling } from '@/lib/hooks/useTimelineScrolling';
import { useRef } from 'react';

describe('useTimelineScrolling', () => {
  const mockSetZoom = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with space not pressed', () => {
      const { result } = renderHook(() => {
        const containerRef = useRef<HTMLElement>(document.createElement('div'));
        return useTimelineScrolling({
          containerRef,
          zoom: 100,
          setZoom: mockSetZoom,
          currentTime: 0,
          isPlaying: false,
          autoScrollEnabled: true,
        });
      });

      expect(result.current.isSpacePressed).toBe(false);
      expect(result.current.isPanning).toBe(false);
    });

    it('should accept custom zoom bounds', () => {
      const { result } = renderHook(() => {
        const containerRef = useRef<HTMLElement>(document.createElement('div'));
        return useTimelineScrolling({
          containerRef,
          zoom: 100,
          setZoom: mockSetZoom,
          currentTime: 0,
          isPlaying: false,
          autoScrollEnabled: true,
          minZoom: 20,
          maxZoom: 400,
        });
      });

      expect(result.current).toBeDefined();
    });

    it('should accept custom zoom sensitivity', () => {
      const { result } = renderHook(() => {
        const containerRef = useRef<HTMLElement>(document.createElement('div'));
        return useTimelineScrolling({
          containerRef,
          zoom: 100,
          setZoom: mockSetZoom,
          currentTime: 0,
          isPlaying: false,
          autoScrollEnabled: true,
          zoomSensitivity: 0.2,
        });
      });

      expect(result.current).toBeDefined();
    });
  });

  describe('Return Value', () => {
    it('should return isSpacePressed and isPanning', () => {
      const { result } = renderHook(() => {
        const containerRef = useRef<HTMLElement>(document.createElement('div'));
        return useTimelineScrolling({
          containerRef,
          zoom: 100,
          setZoom: mockSetZoom,
          currentTime: 0,
          isPlaying: false,
          autoScrollEnabled: true,
        });
      });

      expect(result.current).toHaveProperty('isSpacePressed');
      expect(result.current).toHaveProperty('isPanning');
    });

    it('should have boolean values', () => {
      const { result } = renderHook(() => {
        const containerRef = useRef<HTMLElement>(document.createElement('div'));
        return useTimelineScrolling({
          containerRef,
          zoom: 100,
          setZoom: mockSetZoom,
          currentTime: 0,
          isPlaying: false,
          autoScrollEnabled: true,
        });
      });

      expect(typeof result.current.isSpacePressed).toBe('boolean');
      expect(typeof result.current.isPanning).toBe('boolean');
    });
  });

  describe('Hook Dependencies', () => {
    it('should work with different zoom values', () => {
      const { result, rerender } = renderHook(
        ({ zoom }) => {
          const containerRef = useRef<HTMLElement>(document.createElement('div'));
          return useTimelineScrolling({
            containerRef,
            zoom,
            setZoom: mockSetZoom,
            currentTime: 0,
            isPlaying: false,
            autoScrollEnabled: true,
          });
        },
        { initialProps: { zoom: 100 } }
      );

      expect(result.current).toBeDefined();

      rerender({ zoom: 200 });
      expect(result.current).toBeDefined();
    });

    it('should work with different currentTime values', () => {
      const { result, rerender } = renderHook(
        ({ currentTime }) => {
          const containerRef = useRef<HTMLElement>(document.createElement('div'));
          return useTimelineScrolling({
            containerRef,
            zoom: 100,
            setZoom: mockSetZoom,
            currentTime,
            isPlaying: false,
            autoScrollEnabled: true,
          });
        },
        { initialProps: { currentTime: 0 } }
      );

      expect(result.current).toBeDefined();

      rerender({ currentTime: 5 });
      expect(result.current).toBeDefined();
    });

    it('should work with different isPlaying values', () => {
      const { result, rerender } = renderHook(
        ({ isPlaying }) => {
          const containerRef = useRef<HTMLElement>(document.createElement('div'));
          return useTimelineScrolling({
            containerRef,
            zoom: 100,
            setZoom: mockSetZoom,
            currentTime: 0,
            isPlaying,
            autoScrollEnabled: true,
          });
        },
        { initialProps: { isPlaying: false } }
      );

      expect(result.current).toBeDefined();

      rerender({ isPlaying: true });
      expect(result.current).toBeDefined();
    });

    it('should work with different autoScrollEnabled values', () => {
      const { result, rerender } = renderHook(
        ({ autoScrollEnabled }) => {
          const containerRef = useRef<HTMLElement>(document.createElement('div'));
          return useTimelineScrolling({
            containerRef,
            zoom: 100,
            setZoom: mockSetZoom,
            currentTime: 0,
            isPlaying: false,
            autoScrollEnabled,
          });
        },
        { initialProps: { autoScrollEnabled: true } }
      );

      expect(result.current).toBeDefined();

      rerender({ autoScrollEnabled: false });
      expect(result.current).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null container ref', () => {
      const { result } = renderHook(() => {
        const containerRef = useRef<HTMLElement>(null as unknown as HTMLElement);
        return useTimelineScrolling({
          containerRef,
          zoom: 100,
          setZoom: mockSetZoom,
          currentTime: 0,
          isPlaying: false,
          autoScrollEnabled: true,
        });
      });

      expect(result.current.isSpacePressed).toBe(false);
      expect(result.current.isPanning).toBe(false);
    });

    it('should handle zero zoom', () => {
      const { result } = renderHook(() => {
        const containerRef = useRef<HTMLElement>(document.createElement('div'));
        return useTimelineScrolling({
          containerRef,
          zoom: 0,
          setZoom: mockSetZoom,
          currentTime: 0,
          isPlaying: false,
          autoScrollEnabled: true,
        });
      });

      expect(result.current).toBeDefined();
    });

    it('should handle negative currentTime', () => {
      const { result } = renderHook(() => {
        const containerRef = useRef<HTMLElement>(document.createElement('div'));
        return useTimelineScrolling({
          containerRef,
          zoom: 100,
          setZoom: mockSetZoom,
          currentTime: -5,
          isPlaying: false,
          autoScrollEnabled: true,
        });
      });

      expect(result.current).toBeDefined();
    });
  });

  describe('Lifecycle', () => {
    it('should cleanup on unmount', () => {
      const { unmount } = renderHook(() => {
        const containerRef = useRef<HTMLElement>(document.createElement('div'));
        return useTimelineScrolling({
          containerRef,
          zoom: 100,
          setZoom: mockSetZoom,
          currentTime: 0,
          isPlaying: false,
          autoScrollEnabled: true,
        });
      });

      expect(() => unmount()).not.toThrow();
    });

    it('should handle multiple re-renders', () => {
      const { result, rerender } = renderHook(() => {
        const containerRef = useRef<HTMLElement>(document.createElement('div'));
        return useTimelineScrolling({
          containerRef,
          zoom: 100,
          setZoom: mockSetZoom,
          currentTime: 0,
          isPlaying: false,
          autoScrollEnabled: true,
        });
      });

      expect(result.current).toBeDefined();

      rerender();
      rerender();
      rerender();

      expect(result.current).toBeDefined();
    });
  });

  describe('Auto-scroll Integration', () => {
    it('should respect autoScrollEnabled flag', () => {
      const { result } = renderHook(() => {
        const containerRef = useRef<HTMLElement>(document.createElement('div'));
        return useTimelineScrolling({
          containerRef,
          zoom: 100,
          setZoom: mockSetZoom,
          currentTime: 0,
          isPlaying: true,
          autoScrollEnabled: false,
        });
      });

      expect(result.current).toBeDefined();
    });

    it('should work when playing with auto-scroll enabled', () => {
      const { result } = renderHook(() => {
        const containerRef = useRef<HTMLElement>(document.createElement('div'));
        return useTimelineScrolling({
          containerRef,
          zoom: 100,
          setZoom: mockSetZoom,
          currentTime: 0,
          isPlaying: true,
          autoScrollEnabled: true,
        });
      });

      expect(result.current).toBeDefined();
    });
  });
});
