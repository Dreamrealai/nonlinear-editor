/**
 * Test Suite: Guides Slice
 *
 * Tests timeline guide operations including:
 * - Adding, updating, removing guides
 * - Toggling guide visibility
 * - Clearing all guides
 */

import { renderHook, act } from '@testing-library/react';
import { useEditorStore } from '@/state/useEditorStore';
import type { Timeline, Guide } from '@/types/timeline';

describe('Guides Slice', () => {
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

  const createMockGuide = (overrides?: Partial<Guide>): Guide => ({
    id: `guide-${Date.now()}-${Math.random()}`,
    time: 5,
    color: '#ff0000',
    visible: true,
    ...overrides,
  });

  beforeEach((): void => {
    const { result } = renderHook(() => useEditorStore());
    act(() => {
      result.current.setTimeline(null);
    });
  });

  describe('addGuide', () => {
    it('should add guide to timeline', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const guide = createMockGuide({ id: 'guide-1', time: 5 });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addGuide(guide);
      });

      expect(result.current.timeline?.guides).toHaveLength(1);
      expect(result.current.timeline?.guides?.[0]).toEqual(guide);
    });

    it('should add multiple guides', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const guide1 = createMockGuide({ id: 'guide-1', time: 5 });
      const guide2 = createMockGuide({ id: 'guide-2', time: 10 });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addGuide(guide1);
        result.current.addGuide(guide2);
      });

      expect(result.current.timeline?.guides).toHaveLength(2);
    });

    it('should initialize guides array if undefined', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      delete mockTimeline.guides;
      const guide = createMockGuide();

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addGuide(guide);
      });

      expect(result.current.timeline?.guides).toBeDefined();
      expect(result.current.timeline?.guides).toHaveLength(1);
    });

    it('should not add guide if timeline is null', () => {
      const { result } = renderHook(() => useEditorStore());
      const guide = createMockGuide();

      act(() => {
        result.current.addGuide(guide);
      });

      expect(result.current.timeline).toBeNull();
    });
  });

  describe('removeGuide', () => {
    it('should remove guide from timeline', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const guide = createMockGuide({ id: 'guide-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addGuide(guide);
        result.current.removeGuide('guide-1');
      });

      expect(result.current.timeline?.guides).toHaveLength(0);
    });

    it('should remove specific guide when multiple exist', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const guide1 = createMockGuide({ id: 'guide-1' });
      const guide2 = createMockGuide({ id: 'guide-2' });
      const guide3 = createMockGuide({ id: 'guide-3' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addGuide(guide1);
        result.current.addGuide(guide2);
        result.current.addGuide(guide3);
        result.current.removeGuide('guide-2');
      });

      expect(result.current.timeline?.guides).toHaveLength(2);
      expect(result.current.timeline?.guides?.find((g) => g.id === 'guide-2')).toBeUndefined();
    });

    it('should handle removing nonexistent guide', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const guide = createMockGuide({ id: 'guide-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addGuide(guide);
        result.current.removeGuide('nonexistent');
      });

      expect(result.current.timeline?.guides).toHaveLength(1);
    });
  });

  describe('updateGuide', () => {
    it('should update guide properties', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const guide = createMockGuide({ id: 'guide-1', time: 5, color: '#ff0000' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addGuide(guide);
        result.current.updateGuide('guide-1', { time: 10, color: '#00ff00' });
      });

      const updated = result.current.timeline?.guides?.[0];
      expect(updated?.time).toBe(10);
      expect(updated?.color).toBe('#00ff00');
    });

    it('should not update if guide not found', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const guide = createMockGuide({ id: 'guide-1', time: 5 });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addGuide(guide);
        result.current.updateGuide('nonexistent', { time: 10 });
      });

      expect(result.current.timeline?.guides?.[0]?.time).toBe(5);
    });
  });

  describe('toggleGuideVisibility', () => {
    it('should toggle guide visibility off', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const guide = createMockGuide({ id: 'guide-1', visible: true });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addGuide(guide);
        result.current.toggleGuideVisibility('guide-1');
      });

      expect(result.current.timeline?.guides?.[0]?.visible).toBe(false);
    });

    it('should toggle guide visibility on', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const guide = createMockGuide({ id: 'guide-1', visible: false });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addGuide(guide);
        result.current.toggleGuideVisibility('guide-1');
      });

      expect(result.current.timeline?.guides?.[0]?.visible).toBe(true);
    });

    it('should not affect other guides', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const guide1 = createMockGuide({ id: 'guide-1', visible: true });
      const guide2 = createMockGuide({ id: 'guide-2', visible: true });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addGuide(guide1);
        result.current.addGuide(guide2);
        result.current.toggleGuideVisibility('guide-1');
      });

      expect(result.current.timeline?.guides?.[0]?.visible).toBe(false);
      expect(result.current.timeline?.guides?.[1]?.visible).toBe(true);
    });
  });

  describe('toggleAllGuidesVisibility', () => {
    it('should hide all guides when some are visible', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const guide1 = createMockGuide({ id: 'guide-1', visible: true });
      const guide2 = createMockGuide({ id: 'guide-2', visible: true });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addGuide(guide1);
        result.current.addGuide(guide2);
        result.current.toggleAllGuidesVisibility();
      });

      expect(result.current.timeline?.guides?.[0]?.visible).toBe(false);
      expect(result.current.timeline?.guides?.[1]?.visible).toBe(false);
    });

    it('should show all guides when all are hidden', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const guide1 = createMockGuide({ id: 'guide-1', visible: false });
      const guide2 = createMockGuide({ id: 'guide-2', visible: false });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addGuide(guide1);
        result.current.addGuide(guide2);
        result.current.toggleAllGuidesVisibility();
      });

      expect(result.current.timeline?.guides?.[0]?.visible).toBe(true);
      expect(result.current.timeline?.guides?.[1]?.visible).toBe(true);
    });

    it('should hide all guides when mixed visibility', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const guide1 = createMockGuide({ id: 'guide-1', visible: true });
      const guide2 = createMockGuide({ id: 'guide-2', visible: false });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addGuide(guide1);
        result.current.addGuide(guide2);
        result.current.toggleAllGuidesVisibility();
      });

      expect(result.current.timeline?.guides?.[0]?.visible).toBe(false);
      expect(result.current.timeline?.guides?.[1]?.visible).toBe(false);
    });
  });

  describe('clearAllGuides', () => {
    it('should clear all guides', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const guide1 = createMockGuide({ id: 'guide-1' });
      const guide2 = createMockGuide({ id: 'guide-2' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addGuide(guide1);
        result.current.addGuide(guide2);
        result.current.clearAllGuides();
      });

      expect(result.current.timeline?.guides).toHaveLength(0);
    });

    it('should not error if no guides exist', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.clearAllGuides();
      });

      expect(result.current.timeline?.guides).toHaveLength(0);
    });
  });
});
