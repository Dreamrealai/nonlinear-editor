/**
 * Test Suite: Markers Slice
 *
 * Tests timeline marker operations including:
 * - Adding, updating, removing markers
 * - Jumping to markers
 */

import { renderHook, act } from '@testing-library/react';
import { useEditorStore } from '@/state/useEditorStore';
import type { Timeline, Marker } from '@/types/timeline';

describe('Markers Slice', () => {
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

  const createMockMarker = (overrides?: Partial<Marker>): Marker => ({
    id: `marker-${Date.now()}-${Math.random()}`,
    time: 5,
    label: 'Test Marker',
    ...overrides,
  });

  beforeEach((): void => {
    const { result } = renderHook(() => useEditorStore());
    act(() => {
      result.current.setTimeline(null);
    });
  });

  describe('addMarker', () => {
    it('should add marker to timeline', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const marker = createMockMarker({ id: 'marker-1', time: 5 });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addMarker(marker);
      });

      expect(result.current.timeline?.markers).toHaveLength(1);
      expect(result.current.timeline?.markers?.[0]).toEqual(marker);
    });

    it('should add multiple markers', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const marker1 = createMockMarker({ id: 'marker-1', time: 5 });
      const marker2 = createMockMarker({ id: 'marker-2', time: 10 });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addMarker(marker1);
        result.current.addMarker(marker2);
      });

      expect(result.current.timeline?.markers).toHaveLength(2);
    });

    it('should initialize markers array if undefined', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      delete mockTimeline.markers;
      const marker = createMockMarker();

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addMarker(marker);
      });

      expect(result.current.timeline?.markers).toBeDefined();
      expect(result.current.timeline?.markers).toHaveLength(1);
    });

    it('should not add marker if timeline is null', () => {
      const { result } = renderHook(() => useEditorStore());
      const marker = createMockMarker();

      act(() => {
        result.current.addMarker(marker);
      });

      expect(result.current.timeline).toBeNull();
    });

    it('should preserve marker properties', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const marker = createMockMarker({
        id: 'marker-1',
        time: 12.5,
        label: 'Scene Start',
        color: '#ff0000',
      });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addMarker(marker);
      });

      const addedMarker = result.current.timeline?.markers?.[0];
      expect(addedMarker?.id).toBe('marker-1');
      expect(addedMarker?.time).toBe(12.5);
      expect(addedMarker?.label).toBe('Scene Start');
      expect(addedMarker?.color).toBe('#ff0000');
    });
  });

  describe('removeMarker', () => {
    it('should remove marker from timeline', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const marker = createMockMarker({ id: 'marker-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addMarker(marker);
        result.current.removeMarker('marker-1');
      });

      expect(result.current.timeline?.markers).toHaveLength(0);
    });

    it('should remove specific marker when multiple exist', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const marker1 = createMockMarker({ id: 'marker-1' });
      const marker2 = createMockMarker({ id: 'marker-2' });
      const marker3 = createMockMarker({ id: 'marker-3' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addMarker(marker1);
        result.current.addMarker(marker2);
        result.current.addMarker(marker3);
        result.current.removeMarker('marker-2');
      });

      expect(result.current.timeline?.markers).toHaveLength(2);
      expect(result.current.timeline?.markers?.find((m) => m.id === 'marker-2')).toBeUndefined();
      expect(result.current.timeline?.markers?.find((m) => m.id === 'marker-1')).toBeDefined();
      expect(result.current.timeline?.markers?.find((m) => m.id === 'marker-3')).toBeDefined();
    });

    it('should handle removing nonexistent marker', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const marker = createMockMarker({ id: 'marker-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addMarker(marker);
        result.current.removeMarker('nonexistent-marker');
      });

      expect(result.current.timeline?.markers).toHaveLength(1);
    });

    it('should not error if markers array is undefined', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      delete mockTimeline.markers;

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.removeMarker('marker-1');
      });

      expect(result.current.timeline?.markers).toBeUndefined();
    });

    it('should not error if timeline is null', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.removeMarker('marker-1');
      });

      expect(result.current.timeline).toBeNull();
    });
  });

  describe('updateMarker', () => {
    it('should update marker properties', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const marker = createMockMarker({ id: 'marker-1', label: 'Original' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addMarker(marker);
        result.current.updateMarker('marker-1', { label: 'Updated' });
      });

      expect(result.current.timeline?.markers?.[0]?.label).toBe('Updated');
    });

    it('should update marker time', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const marker = createMockMarker({ id: 'marker-1', time: 5 });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addMarker(marker);
        result.current.updateMarker('marker-1', { time: 10 });
      });

      expect(result.current.timeline?.markers?.[0]?.time).toBe(10);
    });

    it('should update marker color', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const marker = createMockMarker({ id: 'marker-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addMarker(marker);
        result.current.updateMarker('marker-1', { color: '#00ff00' });
      });

      expect(result.current.timeline?.markers?.[0]?.color).toBe('#00ff00');
    });

    it('should update multiple properties', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const marker = createMockMarker({ id: 'marker-1', time: 5, label: 'Old' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addMarker(marker);
        result.current.updateMarker('marker-1', { time: 15, label: 'New', color: '#0000ff' });
      });

      const updated = result.current.timeline?.markers?.[0];
      expect(updated?.time).toBe(15);
      expect(updated?.label).toBe('New');
      expect(updated?.color).toBe('#0000ff');
    });

    it('should not update if marker not found', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const marker = createMockMarker({ id: 'marker-1', label: 'Original' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addMarker(marker);
        result.current.updateMarker('nonexistent', { label: 'Updated' });
      });

      expect(result.current.timeline?.markers?.[0]?.label).toBe('Original');
    });

    it('should preserve other markers when updating one', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const marker1 = createMockMarker({ id: 'marker-1', label: 'First' });
      const marker2 = createMockMarker({ id: 'marker-2', label: 'Second' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addMarker(marker1);
        result.current.addMarker(marker2);
        result.current.updateMarker('marker-1', { label: 'Updated First' });
      });

      expect(result.current.timeline?.markers).toHaveLength(2);
      expect(result.current.timeline?.markers?.[0]?.label).toBe('Updated First');
      expect(result.current.timeline?.markers?.[1]?.label).toBe('Second');
    });
  });

  describe('jumpToMarker', () => {
    it('should set current time to marker time', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const marker = createMockMarker({ id: 'marker-1', time: 15.5 });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addMarker(marker);
        result.current.jumpToMarker('marker-1');
      });

      expect(result.current.currentTime).toBe(15.5);
    });

    it('should jump to different markers', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const marker1 = createMockMarker({ id: 'marker-1', time: 5 });
      const marker2 = createMockMarker({ id: 'marker-2', time: 20 });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addMarker(marker1);
        result.current.addMarker(marker2);
        result.current.jumpToMarker('marker-1');
      });

      expect(result.current.currentTime).toBe(5);

      act(() => {
        result.current.jumpToMarker('marker-2');
      });

      expect(result.current.currentTime).toBe(20);
    });

    it('should not change time if marker not found', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.setCurrentTime(10);
        result.current.jumpToMarker('nonexistent');
      });

      expect(result.current.currentTime).toBe(10);
    });

    it('should not error if timeline has no markers', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.setCurrentTime(5);
        result.current.jumpToMarker('marker-1');
      });

      expect(result.current.currentTime).toBe(5);
    });

    it('should jump to marker at time zero', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const marker = createMockMarker({ id: 'marker-1', time: 0 });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.setCurrentTime(15);
        result.current.addMarker(marker);
        result.current.jumpToMarker('marker-1');
      });

      expect(result.current.currentTime).toBe(0);
    });
  });
});
