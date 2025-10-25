/**
 * Tests for useTimelineDraggingWithSnap Hook
 *
 * Tests snap visualization and distance calculations during timeline dragging.
 */

import { renderHook, act } from '@testing-library/react';
import { useTimelineDraggingWithSnap } from '@/lib/hooks/useTimelineDraggingWithSnap';
import { useTimelineDragging } from '@/lib/hooks/useTimelineDragging';
import type { Timeline } from '@/types/timeline';
import type { DraggingClip } from '@/lib/hooks/useTimelineDragging';

// Mock useTimelineDragging
jest.mock('@/lib/hooks/useTimelineDragging');

describe('useTimelineDraggingWithSnap', () => {
  const mockContainerRef = {
    current: {
      getBoundingClientRect: jest.fn(() => ({
        left: 100,
        top: 50,
        width: 800,
        height: 600,
      })),
    } as unknown as HTMLDivElement,
  };

  const mockTimeline: Timeline = {
    id: 'timeline-1',
    projectId: 'project-1',
    clips: [
      {
        id: 'clip-1',
        timelinePosition: 5,
        start: 0,
        end: 10,
        trackIndex: 0,
        assetId: 'asset-1',
        type: 'video',
        locked: false,
      },
      {
        id: 'clip-2',
        timelinePosition: 20,
        start: 0,
        end: 5,
        trackIndex: 0,
        assetId: 'asset-2',
        type: 'video',
        locked: false,
      },
    ],
  };

  const defaultOptions = {
    containerRef: mockContainerRef,
    timeline: mockTimeline,
    zoom: 1,
    numTracks: 3,
    setCurrentTime: jest.fn(),
    updateClip: jest.fn(),
  };

  const mockDraggingState = {
    draggingClip: null as DraggingClip | null,
    isDraggingPlayhead: false,
    trimmingClip: null,
    trimPreviewInfo: null,
    setDraggingClip: jest.fn(),
    setIsDraggingPlayhead: jest.fn(),
    setTrimmingClip: jest.fn(),
    currentEditMode: 'normal' as const,
    editModeModifiers: {} as any,
    trimFeedback: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useTimelineDragging as jest.Mock).mockReturnValue(mockDraggingState);
  });

  describe('Initialization', () => {
    it('should return null snapInfo when not dragging', () => {
      const { result } = renderHook(() => useTimelineDraggingWithSnap(defaultOptions));

      expect(result.current.snapInfo).toBeNull();
    });

    it('should delegate to useTimelineDragging', () => {
      renderHook(() => useTimelineDraggingWithSnap(defaultOptions));

      expect(useTimelineDragging).toHaveBeenCalledWith(defaultOptions);
    });

    it('should return dragging state from useTimelineDragging', () => {
      const { result } = renderHook(() => useTimelineDraggingWithSnap(defaultOptions));

      expect(result.current.draggingClip).toBeNull();
      expect(result.current.isDraggingPlayhead).toBe(false);
      expect(result.current.trimmingClip).toBeNull();
    });
  });

  describe('Snap Calculations', () => {
    it('should calculate snap candidates from timeline clips', () => {
      const draggingClip: DraggingClip = {
        id: 'clip-1',
        offsetX: 0,
        offsetY: 0,
        startX: 0,
        startY: 0,
        originalTimelinePosition: 5,
        originalTrackIndex: 0,
      };

      (useTimelineDragging as jest.Mock).mockReturnValue({
        ...mockDraggingState,
        draggingClip,
      });

      const { result } = renderHook(() => useTimelineDraggingWithSnap(defaultOptions));

      expect(result.current.snapInfo).not.toBeNull();
      expect(result.current.snapInfo?.snapCandidates).toContain(0); // Timeline start
      expect(result.current.snapInfo?.snapCandidates).toContain(20); // clip-2 start
    });

    it('should detect snapping when position is within threshold', () => {
      // Clip-1 at position 0.05 (very close to 0)
      const timeline: Timeline = {
        ...mockTimeline,
        clips: [
          {
            ...mockTimeline.clips[0],
            timelinePosition: 0.05,
          },
          mockTimeline.clips[1],
        ],
      };

      const draggingClip: DraggingClip = {
        id: 'clip-1',
        offsetX: 0,
        offsetY: 0,
        startX: 0,
        startY: 0,
        originalTimelinePosition: 0.05,
        originalTrackIndex: 0,
      };

      (useTimelineDragging as jest.Mock).mockReturnValue({
        ...mockDraggingState,
        draggingClip,
      });

      const { result } = renderHook(() =>
        useTimelineDraggingWithSnap({
          ...defaultOptions,
          timeline,
        })
      );

      expect(result.current.snapInfo?.isSnapping).toBe(true);
      expect(result.current.snapInfo?.snapPosition).toBe(0);
    });

    it('should not snap when position is beyond threshold', () => {
      // Clip-1 at position 2 (too far from snap points)
      const timeline: Timeline = {
        ...mockTimeline,
        clips: [
          {
            ...mockTimeline.clips[0],
            timelinePosition: 2,
          },
          mockTimeline.clips[1],
        ],
      };

      const draggingClip: DraggingClip = {
        id: 'clip-1',
        offsetX: 0,
        offsetY: 0,
        startX: 0,
        startY: 0,
        originalTimelinePosition: 2,
        originalTrackIndex: 0,
      };

      (useTimelineDragging as jest.Mock).mockReturnValue({
        ...mockDraggingState,
        draggingClip,
      });

      const { result } = renderHook(() =>
        useTimelineDraggingWithSnap({
          ...defaultOptions,
          timeline,
        })
      );

      expect(result.current.snapInfo?.isSnapping).toBe(false);
    });

    it('should calculate distance to nearest snap point', () => {
      // Clip at position 2 (2 seconds from 0, 18 seconds from 20)
      const timeline: Timeline = {
        ...mockTimeline,
        clips: [
          {
            ...mockTimeline.clips[0],
            timelinePosition: 2,
          },
          mockTimeline.clips[1],
        ],
      };

      const draggingClip: DraggingClip = {
        id: 'clip-1',
        offsetX: 0,
        offsetY: 0,
        startX: 0,
        startY: 0,
        originalTimelinePosition: 2,
        originalTrackIndex: 0,
      };

      (useTimelineDragging as jest.Mock).mockReturnValue({
        ...mockDraggingState,
        draggingClip,
      });

      const { result } = renderHook(() =>
        useTimelineDraggingWithSnap({
          ...defaultOptions,
          timeline,
        })
      );

      expect(result.current.snapInfo?.distanceToSnap).toBe(2);
    });
  });

  describe('Mouse Position Tracking', () => {
    it('should track mouse position during dragging', () => {
      const draggingClip: DraggingClip = {
        id: 'clip-1',
        offsetX: 0,
        offsetY: 0,
        startX: 0,
        startY: 0,
        originalTimelinePosition: 5,
        originalTrackIndex: 0,
      };

      (useTimelineDragging as jest.Mock).mockReturnValue({
        ...mockDraggingState,
        draggingClip,
      });

      const { result } = renderHook(() => useTimelineDraggingWithSnap(defaultOptions));

      // Simulate mouse move
      const mouseMoveEvent = new MouseEvent('mousemove', {
        clientX: 300,
        clientY: 200,
      });

      act(() => {
        window.dispatchEvent(mouseMoveEvent);
      });

      expect(result.current.snapInfo?.mouseX).toBe(200); // 300 - 100 (container left)
      expect(result.current.snapInfo?.mouseY).toBe(150); // 200 - 50 (container top)
    });

    it('should cleanup mouse listener when dragging stops', () => {
      const draggingClip: DraggingClip = {
        id: 'clip-1',
        offsetX: 0,
        offsetY: 0,
        startX: 0,
        startY: 0,
        originalTimelinePosition: 5,
        originalTrackIndex: 0,
      };

      (useTimelineDragging as jest.Mock).mockReturnValue({
        ...mockDraggingState,
        draggingClip,
      });

      const { rerender } = renderHook(() => useTimelineDraggingWithSnap(defaultOptions));

      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      // Stop dragging
      (useTimelineDragging as jest.Mock).mockReturnValue({
        ...mockDraggingState,
        draggingClip: null,
      });

      rerender();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
    });
  });

  describe('Snap Transition Detection', () => {
    it('should detect just snapped state when transitioning to snapped', () => {
      const draggingClip: DraggingClip = {
        id: 'clip-1',
        offsetX: 0,
        offsetY: 0,
        startX: 0,
        startY: 0,
        originalTimelinePosition: 5,
        originalTrackIndex: 0,
      };

      (useTimelineDragging as jest.Mock).mockReturnValue({
        ...mockDraggingState,
        draggingClip,
      });

      const { result, rerender } = renderHook(() => useTimelineDraggingWithSnap(defaultOptions));

      // Initially not snapping
      expect(result.current.snapInfo?.justSnapped).toBe(false);

      // Update timeline to put clip close to snap point
      const timeline: Timeline = {
        ...mockTimeline,
        clips: [
          {
            ...mockTimeline.clips[0],
            timelinePosition: 0.05, // Very close to 0
          },
          mockTimeline.clips[1],
        ],
      };

      rerender();

      // Force re-render with snapping timeline
      const { result: result2 } = renderHook(() =>
        useTimelineDraggingWithSnap({
          ...defaultOptions,
          timeline,
        })
      );

      // Should detect just snapped
      expect(result2.current.snapInfo?.justSnapped).toBe(true);
    });

    it('should reset justSnapped after one render cycle', () => {
      const draggingClip: DraggingClip = {
        id: 'clip-1',
        offsetX: 0,
        offsetY: 0,
        startX: 0,
        startY: 0,
        originalTimelinePosition: 0.05,
        originalTrackIndex: 0,
      };

      const timeline: Timeline = {
        ...mockTimeline,
        clips: [
          {
            ...mockTimeline.clips[0],
            timelinePosition: 0.05,
          },
          mockTimeline.clips[1],
        ],
      };

      (useTimelineDragging as jest.Mock).mockReturnValue({
        ...mockDraggingState,
        draggingClip,
      });

      const { result, rerender } = renderHook(() =>
        useTimelineDraggingWithSnap({
          ...defaultOptions,
          timeline,
        })
      );

      // First render: justSnapped should be true
      expect(result.current.snapInfo?.justSnapped).toBe(true);

      // Rerender without changes
      rerender();

      // justSnapped should be false now
      expect(result.current.snapInfo?.justSnapped).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null timeline', () => {
      const draggingClip: DraggingClip = {
        id: 'clip-1',
        offsetX: 0,
        offsetY: 0,
        startX: 0,
        startY: 0,
        originalTimelinePosition: 5,
        originalTrackIndex: 0,
      };

      (useTimelineDragging as jest.Mock).mockReturnValue({
        ...mockDraggingState,
        draggingClip,
      });

      const { result } = renderHook(() =>
        useTimelineDraggingWithSnap({
          ...defaultOptions,
          timeline: null,
        })
      );

      expect(result.current.snapInfo).toBeNull();
    });

    it('should handle clip not found in timeline', () => {
      const draggingClip: DraggingClip = {
        id: 'non-existent-clip',
        offsetX: 0,
        offsetY: 0,
        startX: 0,
        startY: 0,
        originalTimelinePosition: 5,
        originalTrackIndex: 0,
      };

      (useTimelineDragging as jest.Mock).mockReturnValue({
        ...mockDraggingState,
        draggingClip,
      });

      const { result } = renderHook(() => useTimelineDraggingWithSnap(defaultOptions));

      expect(result.current.snapInfo).toBeNull();
    });

    it('should filter out invalid snap candidates', () => {
      const draggingClip: DraggingClip = {
        id: 'clip-1',
        offsetX: 0,
        offsetY: 0,
        startX: 0,
        startY: 0,
        originalTimelinePosition: 5,
        originalTrackIndex: 0,
      };

      (useTimelineDragging as jest.Mock).mockReturnValue({
        ...mockDraggingState,
        draggingClip,
      });

      const { result } = renderHook(() => useTimelineDraggingWithSnap(defaultOptions));

      // All snap candidates should be finite and >= 0
      const candidates = result.current.snapInfo?.snapCandidates || [];
      expect(candidates.every((c) => Number.isFinite(c) && c >= 0)).toBe(true);
    });

    it('should handle mouse move without container ref', () => {
      const draggingClip: DraggingClip = {
        id: 'clip-1',
        offsetX: 0,
        offsetY: 0,
        startX: 0,
        startY: 0,
        originalTimelinePosition: 5,
        originalTrackIndex: 0,
      };

      (useTimelineDragging as jest.Mock).mockReturnValue({
        ...mockDraggingState,
        draggingClip,
      });

      const { result } = renderHook(() =>
        useTimelineDraggingWithSnap({
          ...defaultOptions,
          containerRef: { current: null },
        })
      );

      const mouseMoveEvent = new MouseEvent('mousemove', {
        clientX: 300,
        clientY: 200,
      });

      expect(() => {
        act(() => {
          window.dispatchEvent(mouseMoveEvent);
        });
      }).not.toThrow();

      // Mouse position should not update
      expect(result.current.snapInfo?.mouseX).toBe(0);
      expect(result.current.snapInfo?.mouseY).toBe(0);
    });
  });

  describe('Snap Candidate Generation', () => {
    it('should include clip start positions as snap candidates', () => {
      const draggingClip: DraggingClip = {
        id: 'clip-1',
        offsetX: 0,
        offsetY: 0,
        startX: 0,
        startY: 0,
        originalTimelinePosition: 5,
        originalTrackIndex: 0,
      };

      (useTimelineDragging as jest.Mock).mockReturnValue({
        ...mockDraggingState,
        draggingClip,
      });

      const { result } = renderHook(() => useTimelineDraggingWithSnap(defaultOptions));

      const candidates = result.current.snapInfo?.snapCandidates || [];
      expect(candidates).toContain(20); // clip-2 start
    });

    it('should include clip end positions as snap candidates', () => {
      const draggingClip: DraggingClip = {
        id: 'clip-1',
        offsetX: 0,
        offsetY: 0,
        startX: 0,
        startY: 0,
        originalTimelinePosition: 5,
        originalTrackIndex: 0,
      };

      (useTimelineDragging as jest.Mock).mockReturnValue({
        ...mockDraggingState,
        draggingClip,
      });

      const { result } = renderHook(() => useTimelineDraggingWithSnap(defaultOptions));

      const candidates = result.current.snapInfo?.snapCandidates || [];
      // clip-2 end = 20 + 5 = 25
      expect(candidates).toContain(25);
    });

    it('should exclude dragging clip from snap candidates', () => {
      const draggingClip: DraggingClip = {
        id: 'clip-1',
        offsetX: 0,
        offsetY: 0,
        startX: 0,
        startY: 0,
        originalTimelinePosition: 5,
        originalTrackIndex: 0,
      };

      (useTimelineDragging as jest.Mock).mockReturnValue({
        ...mockDraggingState,
        draggingClip,
      });

      const { result } = renderHook(() => useTimelineDraggingWithSnap(defaultOptions));

      const candidates = result.current.snapInfo?.snapCandidates || [];
      // Should not include clip-1's positions
      expect(candidates).not.toContain(5);
      expect(candidates).not.toContain(15); // 5 + 10
    });

    it('should only use clips on same track for snap candidates', () => {
      const timeline: Timeline = {
        ...mockTimeline,
        clips: [
          ...mockTimeline.clips,
          {
            id: 'clip-3',
            timelinePosition: 10,
            start: 0,
            end: 5,
            trackIndex: 1, // Different track
            assetId: 'asset-3',
            type: 'video',
            locked: false,
          },
        ],
      };

      const draggingClip: DraggingClip = {
        id: 'clip-1',
        offsetX: 0,
        offsetY: 0,
        startX: 0,
        startY: 0,
        originalTimelinePosition: 5,
        originalTrackIndex: 0,
      };

      (useTimelineDragging as jest.Mock).mockReturnValue({
        ...mockDraggingState,
        draggingClip,
      });

      const { result } = renderHook(() =>
        useTimelineDraggingWithSnap({
          ...defaultOptions,
          timeline,
        })
      );

      const candidates = result.current.snapInfo?.snapCandidates || [];
      // Should not include clip-3 from different track
      expect(candidates).not.toContain(10);
    });
  });
});
