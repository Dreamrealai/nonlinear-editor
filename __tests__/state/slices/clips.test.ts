/**
 * Test Suite: Clips Slice
 *
 * Tests core clip management operations including:
 * - Adding, updating, removing clips
 * - Duplicating and splitting clips
 * - Reordering clips
 * - History tracking integration
 * - Validation and edge cases
 */

import { renderHook, act } from '@testing-library/react';
import { useEditorStore } from '@/state/useEditorStore';
import type { Timeline, Clip } from '@/types/timeline';
import { CLIP_CONSTANTS } from '@/lib/constants';

const { MIN_CLIP_DURATION } = CLIP_CONSTANTS;

describe('Clips Slice', () => {
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

  // Helper to create a mock clip
  const createMockClip = (overrides?: Partial<Clip>): Clip => ({
    id: `clip-${Date.now()}-${Math.random()}`,
    assetId: 'asset-1',
    filePath: '/test/video.mp4',
    mime: 'video/mp4',
    start: 0,
    end: 10,
    sourceDuration: 10,
    timelinePosition: 0,
    trackIndex: 0,
    crop: null,
    ...overrides,
  });

  beforeEach((): void => {
    // Reset store before each test
    const { result } = renderHook(() => useEditorStore());
    act(() => {
      result.current.setTimeline(null);
    });
  });

  describe('addClip', () => {
    it('should add a clip to empty timeline', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const mockClip = createMockClip({ id: 'clip-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(mockClip);
      });

      expect(result.current.timeline?.clips).toHaveLength(1);
      expect(result.current.timeline?.clips[0]).toEqual(mockClip);
    });

    it('should add multiple clips', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1' });
      const clip2 = createMockClip({ id: 'clip-2' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip1);
        result.current.addClip(clip2);
      });

      expect(result.current.timeline?.clips).toHaveLength(2);
      expect(result.current.timeline?.clips[0]?.id).toBe('clip-1');
      expect(result.current.timeline?.clips[1]?.id).toBe('clip-2');
    });

    it('should deduplicate clips with same ID', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'duplicate-clip' });
      const clip2 = createMockClip({ id: 'duplicate-clip' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip1);
        result.current.addClip(clip2);
      });

      expect(result.current.timeline?.clips).toHaveLength(1);
    });

    it('should update history when adding clip', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const mockClip = createMockClip();

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(mockClip);
      });

      expect(result.current.history.length).toBe(2); // Initial + add
      expect(result.current.historyIndex).toBe(1);
    });

    it('should not add clip if timeline is null', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockClip = createMockClip();

      act(() => {
        result.current.addClip(mockClip);
      });

      expect(result.current.timeline).toBeNull();
    });
  });

  describe('updateClip', () => {
    it('should update clip properties', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const mockClip = createMockClip({ id: 'clip-1', timelinePosition: 0 });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(mockClip);
        result.current.updateClip('clip-1', { timelinePosition: 5 });
      });

      expect(result.current.timeline?.clips[0]?.timelinePosition).toBe(5);
    });

    it('should enforce minimum clip duration', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const mockClip = createMockClip({ id: 'clip-1', start: 0, end: 10 });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(mockClip);
        result.current.updateClip('clip-1', { end: 0.05 });
      });

      const updatedClip = result.current.timeline?.clips[0];
      expect(updatedClip?.end).toBeGreaterThanOrEqual(MIN_CLIP_DURATION);
    });

    it('should normalize negative timeline position', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const mockClip = createMockClip({ id: 'clip-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(mockClip);
        result.current.updateClip('clip-1', { timelinePosition: -5 });
      });

      expect(result.current.timeline?.clips[0]?.timelinePosition).toBe(0);
    });

    it('should handle NaN sourceDuration', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const mockClip = createMockClip({ id: 'clip-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(mockClip);
        result.current.updateClip('clip-1', { sourceDuration: NaN });
      });

      expect(result.current.timeline?.clips[0]?.sourceDuration).toBeNull();
    });

    it('should clamp start/end within sourceDuration', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const mockClip = createMockClip({ id: 'clip-1', sourceDuration: 10 });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(mockClip);
        result.current.updateClip('clip-1', { start: 15, end: 20 });
      });

      const updatedClip = result.current.timeline?.clips[0];
      expect(updatedClip?.start).toBeLessThanOrEqual(10);
      expect(updatedClip?.end).toBeLessThanOrEqual(10);
    });

    it('should update history when updating clip', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const mockClip = createMockClip({ id: 'clip-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(mockClip);
        result.current.updateClip('clip-1', { timelinePosition: 5 });
      });

      expect(result.current.history.length).toBe(3); // Initial + add + update
    });

    it('should not update if clip not found', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.updateClip('nonexistent-clip', { timelinePosition: 5 });
      });

      expect(result.current.history.length).toBe(1); // Only initial
    });
  });

  describe('updateClipColor', () => {
    it('should set clip color', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const mockClip = createMockClip({ id: 'clip-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(mockClip);
        result.current.updateClipColor('clip-1', '#ff0000');
      });

      expect(result.current.timeline?.clips[0]?.color).toBe('#ff0000');
    });

    it('should clear clip color when null', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const mockClip = createMockClip({ id: 'clip-1', color: '#ff0000' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(mockClip);
        result.current.updateClipColor('clip-1', null);
      });

      expect(result.current.timeline?.clips[0]?.color).toBeUndefined();
    });

    it('should update history when changing color', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const mockClip = createMockClip({ id: 'clip-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(mockClip);
        result.current.updateClipColor('clip-1', '#00ff00');
      });

      expect(result.current.history.length).toBe(3);
    });
  });

  describe('removeClip', () => {
    it('should remove clip from timeline', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const mockClip = createMockClip({ id: 'clip-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(mockClip);
        result.current.removeClip('clip-1');
      });

      expect(result.current.timeline?.clips).toHaveLength(0);
    });

    it('should remove clip from selection', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const mockClip = createMockClip({ id: 'clip-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(mockClip);
        result.current.selectClip('clip-1');
        result.current.removeClip('clip-1');
      });

      expect(result.current.selectedClipIds.has('clip-1')).toBe(false);
    });

    it('should update history when removing clip', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const mockClip = createMockClip({ id: 'clip-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(mockClip);
        result.current.removeClip('clip-1');
      });

      expect(result.current.history.length).toBe(3); // Initial + add + remove
    });

    it('should handle removing nonexistent clip gracefully', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.removeClip('nonexistent-clip');
      });

      expect(result.current.timeline?.clips).toHaveLength(0);
    });
  });

  describe('duplicateClip', () => {
    it('should duplicate clip', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const mockClip = createMockClip({ id: 'clip-1', start: 0, end: 10, timelinePosition: 0 });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(mockClip);
        result.current.duplicateClip('clip-1');
      });

      expect(result.current.timeline?.clips).toHaveLength(2);
    });

    it('should position duplicate after original', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const mockClip = createMockClip({ id: 'clip-1', start: 0, end: 10, timelinePosition: 0 });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(mockClip);
        result.current.duplicateClip('clip-1');
      });

      const duplicate = result.current.timeline?.clips[1];
      expect(duplicate?.timelinePosition).toBe(10);
    });

    it('should select duplicate clip', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const mockClip = createMockClip({ id: 'clip-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(mockClip);
        result.current.duplicateClip('clip-1');
      });

      expect(result.current.selectedClipIds.size).toBe(1);
      expect(result.current.selectedClipIds.has('clip-1')).toBe(false);
    });

    it('should reset transition on duplicate', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const mockClip = createMockClip({
        id: 'clip-1',
        transitionToNext: { type: 'fade', duration: 1 },
      });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(mockClip);
        result.current.duplicateClip('clip-1');
      });

      const duplicate = result.current.timeline?.clips[1];
      expect(duplicate?.transitionToNext).toEqual({ type: 'none', duration: 0 });
    });

    it('should not duplicate if clip not found', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.duplicateClip('nonexistent-clip');
      });

      expect(result.current.timeline?.clips).toHaveLength(0);
    });
  });

  describe('splitClipAtTime', () => {
    it('should split clip at time', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const mockClip = createMockClip({ id: 'clip-1', start: 0, end: 10, timelinePosition: 0 });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(mockClip);
        result.current.splitClipAtTime('clip-1', 5);
      });

      expect(result.current.timeline?.clips).toHaveLength(2);
      expect(result.current.timeline?.clips[0]?.end).toBe(5);
      expect(result.current.timeline?.clips[1]?.start).toBe(5);
      expect(result.current.timeline?.clips[1]?.timelinePosition).toBe(5);
    });

    it('should not split if time is before clip', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const mockClip = createMockClip({ id: 'clip-1', start: 0, end: 10, timelinePosition: 0 });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(mockClip);
        result.current.splitClipAtTime('clip-1', -1);
      });

      expect(result.current.timeline?.clips).toHaveLength(1);
    });

    it('should not split if time is after clip', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const mockClip = createMockClip({ id: 'clip-1', start: 0, end: 10, timelinePosition: 0 });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(mockClip);
        result.current.splitClipAtTime('clip-1', 15);
      });

      expect(result.current.timeline?.clips).toHaveLength(1);
    });

    it('should not split if resulting clips would be too short', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const mockClip = createMockClip({ id: 'clip-1', start: 0, end: 1, timelinePosition: 0 });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(mockClip);
        result.current.splitClipAtTime('clip-1', 0.05);
      });

      expect(result.current.timeline?.clips).toHaveLength(1);
    });

    it('should reset transition on first clip', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const mockClip = createMockClip({
        id: 'clip-1',
        start: 0,
        end: 10,
        timelinePosition: 0,
        transitionToNext: { type: 'fade', duration: 1 },
      });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(mockClip);
        result.current.splitClipAtTime('clip-1', 5);
      });

      expect(result.current.timeline?.clips[0]?.transitionToNext).toEqual({
        type: 'none',
        duration: 0,
      });
    });
  });

  describe('reorderClips', () => {
    it('should reorder clips by ID array', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1' });
      const clip2 = createMockClip({ id: 'clip-2' });
      const clip3 = createMockClip({ id: 'clip-3' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip1);
        result.current.addClip(clip2);
        result.current.addClip(clip3);
        result.current.reorderClips(['clip-3', 'clip-1', 'clip-2']);
      });

      expect(result.current.timeline?.clips[0]?.id).toBe('clip-3');
      expect(result.current.timeline?.clips[1]?.id).toBe('clip-1');
      expect(result.current.timeline?.clips[2]?.id).toBe('clip-2');
    });

    it('should handle partial ID arrays', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1' });
      const clip2 = createMockClip({ id: 'clip-2' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip1);
        result.current.addClip(clip2);
        result.current.reorderClips(['clip-2']);
      });

      expect(result.current.timeline?.clips).toHaveLength(1);
      expect(result.current.timeline?.clips[0]?.id).toBe('clip-2');
    });

    it('should filter out nonexistent IDs', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip1);
        result.current.reorderClips(['nonexistent', 'clip-1', 'another-nonexistent']);
      });

      expect(result.current.timeline?.clips).toHaveLength(1);
      expect(result.current.timeline?.clips[0]?.id).toBe('clip-1');
    });

    it('should update history when reordering', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1' });
      const clip2 = createMockClip({ id: 'clip-2' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip1);
        result.current.addClip(clip2);
        result.current.reorderClips(['clip-2', 'clip-1']);
      });

      expect(result.current.history.length).toBe(4); // Initial + clip1 + clip2 + reorder
    });
  });

  describe('History Integration', () => {
    it('should track history for all clip operations', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
      });

      const initialHistory = result.current.history.length;

      act(() => {
        result.current.addClip(clip1);
      });

      expect(result.current.history.length).toBe(initialHistory + 1);
    });

    it('should allow undo of clip operations', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip1);
        result.current.undo();
      });

      expect(result.current.timeline?.clips).toHaveLength(0);
    });

    it('should respect MAX_HISTORY limit', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();

      act(() => {
        result.current.setTimeline(mockTimeline);

        // Add 52 clips (should exceed MAX_HISTORY of 50)
        for (let i = 0; i < 52; i++) {
          result.current.addClip(createMockClip({ id: `clip-${i}` }));
        }
      });

      expect(result.current.history.length).toBeLessThanOrEqual(50);
    });
  });
});
