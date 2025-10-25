/**
 * Test Suite: useTimelineDragging Hook
 *
 * Tests timeline dragging functionality including:
 * - Initial state
 * - Setting dragging states
 * - State management
 * - Hook dependencies and lifecycle
 */

import { renderHook, act } from '@testing-library/react';
import { useTimelineDragging } from '@/lib/hooks/useTimelineDragging';
import type { Timeline } from '@/types/timeline';
import { useRef } from 'react';

describe('useTimelineDragging', () => {
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

  const mockSetCurrentTime = jest.fn();
  const mockUpdateClip = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with no dragging state', () => {
      const { result } = renderHook(() => {
        const containerRef = useRef<HTMLDivElement | null>(null);
        return useTimelineDragging({
          containerRef,
          timeline: null,
          zoom: 100,
          numTracks: 3,
          setCurrentTime: mockSetCurrentTime,
          updateClip: mockUpdateClip,
        });
      });

      expect(result.current.draggingClip).toBeNull();
      expect(result.current.isDraggingPlayhead).toBe(false);
      expect(result.current.trimmingClip).toBeNull();
      expect(result.current.trimPreviewInfo).toBeNull();
    });

    it('should provide setter functions', () => {
      const { result } = renderHook(() => {
        const containerRef = useRef<HTMLDivElement | null>(null);
        return useTimelineDragging({
          containerRef,
          timeline: null,
          zoom: 100,
          numTracks: 3,
          setCurrentTime: mockSetCurrentTime,
          updateClip: mockUpdateClip,
        });
      });

      expect(typeof result.current.setDraggingClip).toBe('function');
      expect(typeof result.current.setIsDraggingPlayhead).toBe('function');
      expect(typeof result.current.setTrimmingClip).toBe('function');
    });

    it('should expose edit mode data', () => {
      const { result } = renderHook(() => {
        const containerRef = useRef<HTMLDivElement | null>(null);
        return useTimelineDragging({
          containerRef,
          timeline: null,
          zoom: 100,
          numTracks: 3,
          setCurrentTime: mockSetCurrentTime,
          updateClip: mockUpdateClip,
        });
      });

      expect(result.current.currentEditMode).toBeDefined();
      expect(result.current.editModeModifiers).toBeDefined();
    });
  });

  describe('Dragging Clip State', () => {
    it('should set dragging clip', () => {
      const { result } = renderHook(() => {
        const containerRef = useRef<HTMLDivElement | null>(null);
        return useTimelineDragging({
          containerRef,
          timeline: createMockTimeline(),
          zoom: 100,
          numTracks: 3,
          setCurrentTime: mockSetCurrentTime,
          updateClip: mockUpdateClip,
        });
      });

      const draggingClip = {
        id: 'clip-1',
        offsetX: 10,
        offsetY: 20,
        duration: 5,
      };

      act(() => {
        result.current.setDraggingClip(draggingClip);
      });

      expect(result.current.draggingClip).toEqual(draggingClip);
    });

    it('should clear dragging clip', () => {
      const { result } = renderHook(() => {
        const containerRef = useRef<HTMLDivElement | null>(null);
        return useTimelineDragging({
          containerRef,
          timeline: createMockTimeline(),
          zoom: 100,
          numTracks: 3,
          setCurrentTime: mockSetCurrentTime,
          updateClip: mockUpdateClip,
        });
      });

      act(() => {
        result.current.setDraggingClip({
          id: 'clip-1',
          offsetX: 10,
          offsetY: 20,
          duration: 5,
        });
        result.current.setDraggingClip(null);
      });

      expect(result.current.draggingClip).toBeNull();
    });

    it('should update dragging clip', () => {
      const { result } = renderHook(() => {
        const containerRef = useRef<HTMLDivElement | null>(null);
        return useTimelineDragging({
          containerRef,
          timeline: createMockTimeline(),
          zoom: 100,
          numTracks: 3,
          setCurrentTime: mockSetCurrentTime,
          updateClip: mockUpdateClip,
        });
      });

      act(() => {
        result.current.setDraggingClip({
          id: 'clip-1',
          offsetX: 10,
          offsetY: 20,
          duration: 5,
        });

        result.current.setDraggingClip({
          id: 'clip-2',
          offsetX: 15,
          offsetY: 25,
          duration: 10,
        });
      });

      expect(result.current.draggingClip?.id).toBe('clip-2');
      expect(result.current.draggingClip?.offsetX).toBe(15);
      expect(result.current.draggingClip?.duration).toBe(10);
    });
  });

  describe('Playhead Dragging State', () => {
    it('should set playhead dragging to true', () => {
      const { result } = renderHook(() => {
        const containerRef = useRef<HTMLDivElement | null>(null);
        return useTimelineDragging({
          containerRef,
          timeline: createMockTimeline(),
          zoom: 100,
          numTracks: 3,
          setCurrentTime: mockSetCurrentTime,
          updateClip: mockUpdateClip,
        });
      });

      act(() => {
        result.current.setIsDraggingPlayhead(true);
      });

      expect(result.current.isDraggingPlayhead).toBe(true);
    });

    it('should set playhead dragging to false', () => {
      const { result } = renderHook(() => {
        const containerRef = useRef<HTMLDivElement | null>(null);
        return useTimelineDragging({
          containerRef,
          timeline: createMockTimeline(),
          zoom: 100,
          numTracks: 3,
          setCurrentTime: mockSetCurrentTime,
          updateClip: mockUpdateClip,
        });
      });

      act(() => {
        result.current.setIsDraggingPlayhead(true);
        result.current.setIsDraggingPlayhead(false);
      });

      expect(result.current.isDraggingPlayhead).toBe(false);
    });

    it('should toggle playhead dragging', () => {
      const { result } = renderHook(() => {
        const containerRef = useRef<HTMLDivElement | null>(null);
        return useTimelineDragging({
          containerRef,
          timeline: createMockTimeline(),
          zoom: 100,
          numTracks: 3,
          setCurrentTime: mockSetCurrentTime,
          updateClip: mockUpdateClip,
        });
      });

      act(() => {
        result.current.setIsDraggingPlayhead((prev) => !prev);
      });

      expect(result.current.isDraggingPlayhead).toBe(true);

      act(() => {
        result.current.setIsDraggingPlayhead((prev) => !prev);
      });

      expect(result.current.isDraggingPlayhead).toBe(false);
    });
  });

  describe('Trimming Clip State', () => {
    it('should set trimming clip', () => {
      const { result } = renderHook(() => {
        const containerRef = useRef<HTMLDivElement | null>(null);
        return useTimelineDragging({
          containerRef,
          timeline: createMockTimeline(),
          zoom: 100,
          numTracks: 3,
          setCurrentTime: mockSetCurrentTime,
          updateClip: mockUpdateClip,
        });
      });

      const trimmingClip = {
        id: 'clip-1',
        handle: 'left' as const,
        originalStart: 0,
        originalEnd: 10,
        originalPosition: 0,
        sourceDuration: 10,
      };

      act(() => {
        result.current.setTrimmingClip(trimmingClip);
      });

      expect(result.current.trimmingClip).toEqual(trimmingClip);
    });

    it('should clear trimming clip', () => {
      const { result } = renderHook(() => {
        const containerRef = useRef<HTMLDivElement | null>(null);
        return useTimelineDragging({
          containerRef,
          timeline: createMockTimeline(),
          zoom: 100,
          numTracks: 3,
          setCurrentTime: mockSetCurrentTime,
          updateClip: mockUpdateClip,
        });
      });

      act(() => {
        result.current.setTrimmingClip({
          id: 'clip-1',
          handle: 'left' as const,
          originalStart: 0,
          originalEnd: 10,
          originalPosition: 0,
          sourceDuration: 10,
        });
        result.current.setTrimmingClip(null);
      });

      expect(result.current.trimmingClip).toBeNull();
    });

    it('should handle left and right trim handles', () => {
      const { result } = renderHook(() => {
        const containerRef = useRef<HTMLDivElement | null>(null);
        return useTimelineDragging({
          containerRef,
          timeline: createMockTimeline(),
          zoom: 100,
          numTracks: 3,
          setCurrentTime: mockSetCurrentTime,
          updateClip: mockUpdateClip,
        });
      });

      act(() => {
        result.current.setTrimmingClip({
          id: 'clip-1',
          handle: 'left' as const,
          originalStart: 0,
          originalEnd: 10,
          originalPosition: 0,
          sourceDuration: 10,
        });
      });

      expect(result.current.trimmingClip?.handle).toBe('left');

      act(() => {
        result.current.setTrimmingClip({
          id: 'clip-1',
          handle: 'right' as const,
          originalStart: 0,
          originalEnd: 10,
          originalPosition: 0,
          sourceDuration: 10,
        });
      });

      expect(result.current.trimmingClip?.handle).toBe('right');
    });
  });

  describe('State Independence', () => {
    it('should maintain independent dragging states', () => {
      const { result } = renderHook(() => {
        const containerRef = useRef<HTMLDivElement | null>(null);
        return useTimelineDragging({
          containerRef,
          timeline: createMockTimeline(),
          zoom: 100,
          numTracks: 3,
          setCurrentTime: mockSetCurrentTime,
          updateClip: mockUpdateClip,
        });
      });

      act(() => {
        result.current.setDraggingClip({
          id: 'clip-1',
          offsetX: 10,
          offsetY: 20,
          duration: 5,
        });
        result.current.setIsDraggingPlayhead(true);
      });

      expect(result.current.draggingClip).not.toBeNull();
      expect(result.current.isDraggingPlayhead).toBe(true);
      expect(result.current.trimmingClip).toBeNull();
    });

    it('should clear all states independently', () => {
      const { result } = renderHook(() => {
        const containerRef = useRef<HTMLDivElement | null>(null);
        return useTimelineDragging({
          containerRef,
          timeline: createMockTimeline(),
          zoom: 100,
          numTracks: 3,
          setCurrentTime: mockSetCurrentTime,
          updateClip: mockUpdateClip,
        });
      });

      act(() => {
        result.current.setDraggingClip({
          id: 'clip-1',
          offsetX: 10,
          offsetY: 20,
          duration: 5,
        });
        result.current.setIsDraggingPlayhead(true);
        result.current.setTrimmingClip({
          id: 'clip-2',
          handle: 'left',
          originalStart: 0,
          originalEnd: 10,
          originalPosition: 0,
          sourceDuration: 10,
        });
      });

      act(() => {
        result.current.setDraggingClip(null);
      });

      expect(result.current.draggingClip).toBeNull();
      expect(result.current.isDraggingPlayhead).toBe(true);
      expect(result.current.trimmingClip).not.toBeNull();
    });
  });

  describe('Hook Dependencies', () => {
    it('should work with null timeline', () => {
      const { result } = renderHook(() => {
        const containerRef = useRef<HTMLDivElement | null>(null);
        return useTimelineDragging({
          containerRef,
          timeline: null,
          zoom: 100,
          numTracks: 3,
          setCurrentTime: mockSetCurrentTime,
          updateClip: mockUpdateClip,
        });
      });

      expect(result.current.draggingClip).toBeNull();
    });

    it('should work with different zoom levels', () => {
      const { result, rerender } = renderHook(
        ({ zoom }) => {
          const containerRef = useRef<HTMLDivElement | null>(null);
          return useTimelineDragging({
            containerRef,
            timeline: createMockTimeline(),
            zoom,
            numTracks: 3,
            setCurrentTime: mockSetCurrentTime,
            updateClip: mockUpdateClip,
          });
        },
        { initialProps: { zoom: 100 } }
      );

      expect(result.current).toBeDefined();

      rerender({ zoom: 200 });
      expect(result.current).toBeDefined();
    });

    it('should work with different number of tracks', () => {
      const { result, rerender } = renderHook(
        ({ numTracks }) => {
          const containerRef = useRef<HTMLDivElement | null>(null);
          return useTimelineDragging({
            containerRef,
            timeline: createMockTimeline(),
            zoom: 100,
            numTracks,
            setCurrentTime: mockSetCurrentTime,
            updateClip: mockUpdateClip,
          });
        },
        { initialProps: { numTracks: 3 } }
      );

      expect(result.current).toBeDefined();

      rerender({ numTracks: 5 });
      expect(result.current).toBeDefined();
    });
  });

  describe('Trim Preview Info', () => {
    it('should initialize with no trim preview', () => {
      const { result } = renderHook(() => {
        const containerRef = useRef<HTMLDivElement | null>(null);
        return useTimelineDragging({
          containerRef,
          timeline: createMockTimeline(),
          zoom: 100,
          numTracks: 3,
          setCurrentTime: mockSetCurrentTime,
          updateClip: mockUpdateClip,
        });
      });

      expect(result.current.trimPreviewInfo).toBeNull();
    });
  });
});
