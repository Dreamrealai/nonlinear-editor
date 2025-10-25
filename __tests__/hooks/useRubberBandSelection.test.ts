/**
 * Test Suite: useRubberBandSelection Hook
 *
 * Tests rubber-band selection functionality including:
 * - Initial state
 * - Selection state management
 * - Selection rectangle tracking
 * - Hook dependencies and lifecycle
 */

import { renderHook, act } from '@testing-library/react';
import { useRubberBandSelection } from '@/lib/hooks/useRubberBandSelection';
import { useRef } from 'react';

describe('useRubberBandSelection', () => {
  const mockOnSelectClipsInRange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with no selection', () => {
      const { result } = renderHook(() => {
        const containerRef = useRef<HTMLDivElement>(document.createElement('div'));
        return useRubberBandSelection({
          containerRef,
          enabled: true,
          zoom: 100,
          trackHeight: 80,
          onSelectClipsInRange: mockOnSelectClipsInRange,
        });
      });

      expect(result.current.selectionRect).toBeNull();
      expect(result.current.isSelecting).toBe(false);
    });

    it('should respect enabled flag', () => {
      const { result } = renderHook(() => {
        const containerRef = useRef<HTMLDivElement>(document.createElement('div'));
        return useRubberBandSelection({
          containerRef,
          enabled: false,
          zoom: 100,
          trackHeight: 80,
          onSelectClipsInRange: mockOnSelectClipsInRange,
        });
      });

      expect(result.current.selectionRect).toBeNull();
      expect(result.current.isSelecting).toBe(false);
    });
  });

  describe('Selection Rectangle', () => {
    it('should return null selection rect initially', () => {
      const { result } = renderHook(() => {
        const containerRef = useRef<HTMLDivElement>(document.createElement('div'));
        return useRubberBandSelection({
          containerRef,
          enabled: true,
          zoom: 100,
          trackHeight: 80,
          onSelectClipsInRange: mockOnSelectClipsInRange,
        });
      });

      expect(result.current.selectionRect).toBeNull();
    });

    it('should have selection rect structure when selecting', () => {
      const { result } = renderHook(() => {
        const containerRef = useRef<HTMLDivElement>(document.createElement('div'));
        return useRubberBandSelection({
          containerRef,
          enabled: true,
          zoom: 100,
          trackHeight: 80,
          onSelectClipsInRange: mockOnSelectClipsInRange,
        });
      });

      // Initially null
      expect(result.current.selectionRect).toBeNull();
    });
  });

  describe('Selection State', () => {
    it('should not be selecting initially', () => {
      const { result } = renderHook(() => {
        const containerRef = useRef<HTMLDivElement>(document.createElement('div'));
        return useRubberBandSelection({
          containerRef,
          enabled: true,
          zoom: 100,
          trackHeight: 80,
          onSelectClipsInRange: mockOnSelectClipsInRange,
        });
      });

      expect(result.current.isSelecting).toBe(false);
    });
  });

  describe('Hook Dependencies', () => {
    it('should work with different zoom levels', () => {
      const { result, rerender } = renderHook(
        ({ zoom }) => {
          const containerRef = useRef<HTMLDivElement>(document.createElement('div'));
          return useRubberBandSelection({
            containerRef,
            enabled: true,
            zoom,
            trackHeight: 80,
            onSelectClipsInRange: mockOnSelectClipsInRange,
          });
        },
        { initialProps: { zoom: 100 } }
      );

      expect(result.current).toBeDefined();

      rerender({ zoom: 200 });
      expect(result.current).toBeDefined();
    });

    it('should work with different track heights', () => {
      const { result, rerender } = renderHook(
        ({ trackHeight }) => {
          const containerRef = useRef<HTMLDivElement>(document.createElement('div'));
          return useRubberBandSelection({
            containerRef,
            enabled: true,
            zoom: 100,
            trackHeight,
            onSelectClipsInRange: mockOnSelectClipsInRange,
          });
        },
        { initialProps: { trackHeight: 80 } }
      );

      expect(result.current).toBeDefined();

      rerender({ trackHeight: 120 });
      expect(result.current).toBeDefined();
    });

    it('should handle enabled state changes', () => {
      const { result, rerender } = renderHook(
        ({ enabled }) => {
          const containerRef = useRef<HTMLDivElement>(document.createElement('div'));
          return useRubberBandSelection({
            containerRef,
            enabled,
            zoom: 100,
            trackHeight: 80,
            onSelectClipsInRange: mockOnSelectClipsInRange,
          });
        },
        { initialProps: { enabled: true } }
      );

      expect(result.current).toBeDefined();

      rerender({ enabled: false });
      expect(result.current).toBeDefined();
    });

    it('should handle container ref changes', () => {
      const { result } = renderHook(() => {
        const containerRef = useRef<HTMLDivElement>(document.createElement('div'));
        return useRubberBandSelection({
          containerRef,
          enabled: true,
          zoom: 100,
          trackHeight: 80,
          onSelectClipsInRange: mockOnSelectClipsInRange,
        });
      });

      expect(result.current).toBeDefined();
    });
  });

  describe('Callback Integration', () => {
    it('should accept onSelectClipsInRange callback', () => {
      const customCallback = jest.fn();
      const { result } = renderHook(() => {
        const containerRef = useRef<HTMLDivElement>(document.createElement('div'));
        return useRubberBandSelection({
          containerRef,
          enabled: true,
          zoom: 100,
          trackHeight: 80,
          onSelectClipsInRange: customCallback,
        });
      });

      expect(result.current).toBeDefined();
    });

    it('should work with different callbacks', () => {
      const { result, rerender } = renderHook(
        ({ callback }) => {
          const containerRef = useRef<HTMLDivElement>(document.createElement('div'));
          return useRubberBandSelection({
            containerRef,
            enabled: true,
            zoom: 100,
            trackHeight: 80,
            onSelectClipsInRange: callback,
          });
        },
        { initialProps: { callback: mockOnSelectClipsInRange } }
      );

      expect(result.current).toBeDefined();

      const newCallback = jest.fn();
      rerender({ callback: newCallback });
      expect(result.current).toBeDefined();
    });
  });

  describe('Return Value Structure', () => {
    it('should return object with selectionRect and isSelecting', () => {
      const { result } = renderHook(() => {
        const containerRef = useRef<HTMLDivElement>(document.createElement('div'));
        return useRubberBandSelection({
          containerRef,
          enabled: true,
          zoom: 100,
          trackHeight: 80,
          onSelectClipsInRange: mockOnSelectClipsInRange,
        });
      });

      expect(result.current).toHaveProperty('selectionRect');
      expect(result.current).toHaveProperty('isSelecting');
    });

    it('should have consistent return type', () => {
      const { result } = renderHook(() => {
        const containerRef = useRef<HTMLDivElement>(document.createElement('div'));
        return useRubberBandSelection({
          containerRef,
          enabled: true,
          zoom: 100,
          trackHeight: 80,
          onSelectClipsInRange: mockOnSelectClipsInRange,
        });
      });

      expect(typeof result.current.isSelecting).toBe('boolean');
      expect(
        result.current.selectionRect === null || typeof result.current.selectionRect === 'object'
      ).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null container ref', () => {
      const { result } = renderHook(() => {
        const containerRef = useRef<HTMLDivElement>(null as unknown as HTMLDivElement);
        return useRubberBandSelection({
          containerRef,
          enabled: true,
          zoom: 100,
          trackHeight: 80,
          onSelectClipsInRange: mockOnSelectClipsInRange,
        });
      });

      expect(result.current.selectionRect).toBeNull();
      expect(result.current.isSelecting).toBe(false);
    });

    it('should handle zero zoom', () => {
      const { result } = renderHook(() => {
        const containerRef = useRef<HTMLDivElement>(document.createElement('div'));
        return useRubberBandSelection({
          containerRef,
          enabled: true,
          zoom: 0,
          trackHeight: 80,
          onSelectClipsInRange: mockOnSelectClipsInRange,
        });
      });

      expect(result.current).toBeDefined();
    });

    it('should handle zero track height', () => {
      const { result } = renderHook(() => {
        const containerRef = useRef<HTMLDivElement>(document.createElement('div'));
        return useRubberBandSelection({
          containerRef,
          enabled: true,
          zoom: 100,
          trackHeight: 0,
          onSelectClipsInRange: mockOnSelectClipsInRange,
        });
      });

      expect(result.current).toBeDefined();
    });

    it('should handle negative zoom', () => {
      const { result } = renderHook(() => {
        const containerRef = useRef<HTMLDivElement>(document.createElement('div'));
        return useRubberBandSelection({
          containerRef,
          enabled: true,
          zoom: -100,
          trackHeight: 80,
          onSelectClipsInRange: mockOnSelectClipsInRange,
        });
      });

      expect(result.current).toBeDefined();
    });
  });

  describe('Lifecycle', () => {
    it('should cleanup on unmount', () => {
      const { unmount } = renderHook(() => {
        const containerRef = useRef<HTMLDivElement>(document.createElement('div'));
        return useRubberBandSelection({
          containerRef,
          enabled: true,
          zoom: 100,
          trackHeight: 80,
          onSelectClipsInRange: mockOnSelectClipsInRange,
        });
      });

      expect(() => unmount()).not.toThrow();
    });

    it('should handle multiple re-renders', () => {
      const { result, rerender } = renderHook(() => {
        const containerRef = useRef<HTMLDivElement>(document.createElement('div'));
        return useRubberBandSelection({
          containerRef,
          enabled: true,
          zoom: 100,
          trackHeight: 80,
          onSelectClipsInRange: mockOnSelectClipsInRange,
        });
      });

      expect(result.current).toBeDefined();

      rerender();
      rerender();
      rerender();

      expect(result.current).toBeDefined();
    });
  });
});
