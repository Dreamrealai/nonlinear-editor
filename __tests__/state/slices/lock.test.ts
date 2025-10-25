/**
 * Test Suite: Lock Slice
 *
 * Tests clip locking operations including:
 * - Locking/unlocking individual clips
 * - Locking/unlocking selected clips
 * - Toggle lock state
 * - Edge cases and validation
 */

import { renderHook, act } from '@testing-library/react';
import { useEditorStore } from '@/state/useEditorStore';
import type { Timeline, Clip } from '@/types/timeline';

describe('Lock Slice', () => {
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
      result.current.deselectAllClips();
    });
  });

  describe('lockClip', () => {
    it('should lock a clip', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const mockClip = createMockClip({ id: 'clip-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(mockClip);
        result.current.lockClip('clip-1');
      });

      expect(result.current.timeline?.clips[0]?.locked).toBe(true);
    });

    it('should handle locking already locked clip', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const mockClip = createMockClip({ id: 'clip-1', locked: true });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(mockClip);
        result.current.lockClip('clip-1');
      });

      expect(result.current.timeline?.clips[0]?.locked).toBe(true);
    });

    it('should handle locking nonexistent clip gracefully', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.lockClip('nonexistent-clip');
      });

      expect(result.current.timeline?.clips).toHaveLength(0);
    });

    it('should handle locking when timeline is null', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.lockClip('clip-1');
      });

      expect(result.current.timeline).toBeNull();
    });

    it('should lock multiple clips independently', () => {
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
        result.current.lockClip('clip-1');
        result.current.lockClip('clip-3');
      });

      expect(result.current.timeline?.clips[0]?.locked).toBe(true);
      expect(result.current.timeline?.clips[1]?.locked).toBeUndefined();
      expect(result.current.timeline?.clips[2]?.locked).toBe(true);
    });
  });

  describe('unlockClip', () => {
    it('should unlock a locked clip', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const mockClip = createMockClip({ id: 'clip-1', locked: true });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(mockClip);
        result.current.unlockClip('clip-1');
      });

      expect(result.current.timeline?.clips[0]?.locked).toBe(false);
    });

    it('should handle unlocking already unlocked clip', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const mockClip = createMockClip({ id: 'clip-1', locked: false });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(mockClip);
        result.current.unlockClip('clip-1');
      });

      expect(result.current.timeline?.clips[0]?.locked).toBe(false);
    });

    it('should handle unlocking nonexistent clip gracefully', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.unlockClip('nonexistent-clip');
      });

      expect(result.current.timeline?.clips).toHaveLength(0);
    });

    it('should handle unlocking when timeline is null', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.unlockClip('clip-1');
      });

      expect(result.current.timeline).toBeNull();
    });
  });

  describe('toggleClipLock', () => {
    it('should lock an unlocked clip', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const mockClip = createMockClip({ id: 'clip-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(mockClip);
        result.current.toggleClipLock('clip-1');
      });

      expect(result.current.timeline?.clips[0]?.locked).toBe(true);
    });

    it('should unlock a locked clip', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const mockClip = createMockClip({ id: 'clip-1', locked: true });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(mockClip);
        result.current.toggleClipLock('clip-1');
      });

      expect(result.current.timeline?.clips[0]?.locked).toBe(false);
    });

    it('should toggle lock state multiple times', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const mockClip = createMockClip({ id: 'clip-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(mockClip);
        result.current.toggleClipLock('clip-1');
      });

      expect(result.current.timeline?.clips[0]?.locked).toBe(true);

      act(() => {
        result.current.toggleClipLock('clip-1');
      });

      expect(result.current.timeline?.clips[0]?.locked).toBe(false);

      act(() => {
        result.current.toggleClipLock('clip-1');
      });

      expect(result.current.timeline?.clips[0]?.locked).toBe(true);
    });

    it('should handle toggling nonexistent clip gracefully', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.toggleClipLock('nonexistent-clip');
      });

      expect(result.current.timeline?.clips).toHaveLength(0);
    });

    it('should handle toggling when timeline is null', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.toggleClipLock('clip-1');
      });

      expect(result.current.timeline).toBeNull();
    });
  });

  describe('lockSelectedClips', () => {
    it('should lock all selected clips', () => {
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
        result.current.selectClip('clip-1');
        result.current.selectClip('clip-2', true);
        result.current.lockSelectedClips();
      });

      expect(result.current.timeline?.clips[0]?.locked).toBe(true);
      expect(result.current.timeline?.clips[1]?.locked).toBe(true);
      expect(result.current.timeline?.clips[2]?.locked).toBeUndefined();
    });

    it('should handle locking with no selection', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip1);
        result.current.lockSelectedClips();
      });

      expect(result.current.timeline?.clips[0]?.locked).toBeUndefined();
    });

    it('should handle locking when timeline is null', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.lockSelectedClips();
      });

      expect(result.current.timeline).toBeNull();
    });

    it('should lock clips that are already locked', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1', locked: true });
      const clip2 = createMockClip({ id: 'clip-2' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip1);
        result.current.addClip(clip2);
        result.current.selectClip('clip-1');
        result.current.selectClip('clip-2', true);
        result.current.lockSelectedClips();
      });

      expect(result.current.timeline?.clips[0]?.locked).toBe(true);
      expect(result.current.timeline?.clips[1]?.locked).toBe(true);
    });

    it('should lock single selected clip', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip1);
        result.current.selectClip('clip-1');
        result.current.lockSelectedClips();
      });

      expect(result.current.timeline?.clips[0]?.locked).toBe(true);
    });
  });

  describe('unlockSelectedClips', () => {
    it('should unlock all selected clips', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1', locked: true });
      const clip2 = createMockClip({ id: 'clip-2', locked: true });
      const clip3 = createMockClip({ id: 'clip-3', locked: true });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip1);
        result.current.addClip(clip2);
        result.current.addClip(clip3);
        result.current.selectClip('clip-1');
        result.current.selectClip('clip-2', true);
        result.current.unlockSelectedClips();
      });

      expect(result.current.timeline?.clips[0]?.locked).toBe(false);
      expect(result.current.timeline?.clips[1]?.locked).toBe(false);
      expect(result.current.timeline?.clips[2]?.locked).toBe(true);
    });

    it('should handle unlocking with no selection', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1', locked: true });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip1);
        result.current.unlockSelectedClips();
      });

      expect(result.current.timeline?.clips[0]?.locked).toBe(true);
    });

    it('should handle unlocking when timeline is null', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.unlockSelectedClips();
      });

      expect(result.current.timeline).toBeNull();
    });

    it('should unlock clips that are already unlocked', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1', locked: false });
      const clip2 = createMockClip({ id: 'clip-2', locked: true });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip1);
        result.current.addClip(clip2);
        result.current.selectClip('clip-1');
        result.current.selectClip('clip-2', true);
        result.current.unlockSelectedClips();
      });

      expect(result.current.timeline?.clips[0]?.locked).toBe(false);
      expect(result.current.timeline?.clips[1]?.locked).toBe(false);
    });
  });

  describe('Integration Scenarios', () => {
    it('should lock and unlock clips in sequence', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip1);
        result.current.lockClip('clip-1');
      });

      expect(result.current.timeline?.clips[0]?.locked).toBe(true);

      act(() => {
        result.current.unlockClip('clip-1');
      });

      expect(result.current.timeline?.clips[0]?.locked).toBe(false);
    });

    it('should lock clips individually and in bulk', () => {
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
        result.current.lockClip('clip-1');
        result.current.selectClip('clip-2');
        result.current.selectClip('clip-3', true);
        result.current.lockSelectedClips();
      });

      expect(result.current.timeline?.clips[0]?.locked).toBe(true);
      expect(result.current.timeline?.clips[1]?.locked).toBe(true);
      expect(result.current.timeline?.clips[2]?.locked).toBe(true);
    });

    it('should maintain lock state after selection changes', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1' });
      const clip2 = createMockClip({ id: 'clip-2' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip1);
        result.current.addClip(clip2);
        result.current.selectClip('clip-1');
        result.current.lockSelectedClips();
        result.current.deselectAllClips();
        result.current.selectClip('clip-2');
      });

      expect(result.current.timeline?.clips[0]?.locked).toBe(true);
      expect(result.current.timeline?.clips[1]?.locked).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty timeline', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.lockSelectedClips();
        result.current.unlockSelectedClips();
      });

      expect(result.current.timeline?.clips).toHaveLength(0);
    });

    it('should handle clip with undefined locked state', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const mockClip = createMockClip({ id: 'clip-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(mockClip);
        result.current.toggleClipLock('clip-1');
      });

      expect(result.current.timeline?.clips[0]?.locked).toBe(true);
    });
  });
});
