/**
 * Test Suite: Groups Slice
 *
 * Tests clip grouping operations including:
 * - Creating groups from selected clips
 * - Ungrouping clips
 * - Querying group information
 * - History tracking integration
 * - Edge cases and validation
 */

import { renderHook, act } from '@testing-library/react';
import { useEditorStore } from '@/state/useEditorStore';
import type { Timeline, Clip } from '@/types/timeline';

describe('Groups Slice', () => {
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

  describe('groupSelectedClips', () => {
    it('should create a group from selected clips', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1' });
      const clip2 = createMockClip({ id: 'clip-2' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip1);
        result.current.addClip(clip2);
        result.current.selectClip('clip-1');
        result.current.selectClip('clip-2', true);
        result.current.groupSelectedClips('Test Group');
      });

      expect(result.current.timeline?.groups).toHaveLength(1);
      expect(result.current.timeline?.groups?.[0]?.name).toBe('Test Group');
    });

    it('should auto-generate group name if not provided', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1' });
      const clip2 = createMockClip({ id: 'clip-2' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip1);
        result.current.addClip(clip2);
        result.current.selectClip('clip-1');
        result.current.selectClip('clip-2', true);
        result.current.groupSelectedClips();
      });

      expect(result.current.timeline?.groups?.[0]?.name).toBe('Group 1');
    });

    it('should assign group ID to all grouped clips', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1' });
      const clip2 = createMockClip({ id: 'clip-2' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip1);
        result.current.addClip(clip2);
        result.current.selectClip('clip-1');
        result.current.selectClip('clip-2', true);
        result.current.groupSelectedClips();
      });

      const groupId = result.current.timeline?.groups?.[0]?.id;
      expect(result.current.timeline?.clips[0]?.groupId).toBe(groupId);
      expect(result.current.timeline?.clips[1]?.groupId).toBe(groupId);
    });

    it('should not create group if less than 2 clips selected', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip1);
        result.current.selectClip('clip-1');
        result.current.groupSelectedClips();
      });

      expect(result.current.timeline?.groups).toBeUndefined();
    });

    it('should not create group if timeline is null', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.groupSelectedClips();
      });

      expect(result.current.timeline).toBeNull();
    });

    it('should initialize groups array if undefined', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1' });
      const clip2 = createMockClip({ id: 'clip-2' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip1);
        result.current.addClip(clip2);
        result.current.selectClip('clip-1');
        result.current.selectClip('clip-2', true);
        result.current.groupSelectedClips();
      });

      expect(result.current.timeline?.groups).toBeDefined();
      expect(result.current.timeline?.groups).toHaveLength(1);
    });

    it('should update history when creating group', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1' });
      const clip2 = createMockClip({ id: 'clip-2' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip1);
        result.current.addClip(clip2);
        result.current.selectClip('clip-1');
        result.current.selectClip('clip-2', true);
        result.current.groupSelectedClips();
      });

      expect(result.current.history.length).toBe(4); // Initial + clip1 + clip2 + group
    });

    it('should create multiple groups sequentially', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1' });
      const clip2 = createMockClip({ id: 'clip-2' });
      const clip3 = createMockClip({ id: 'clip-3' });
      const clip4 = createMockClip({ id: 'clip-4' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip1);
        result.current.addClip(clip2);
        result.current.addClip(clip3);
        result.current.addClip(clip4);

        // Create first group
        result.current.selectClip('clip-1');
        result.current.selectClip('clip-2', true);
        result.current.groupSelectedClips('Group A');

        // Create second group
        result.current.deselectAllClips();
        result.current.selectClip('clip-3');
        result.current.selectClip('clip-4', true);
        result.current.groupSelectedClips('Group B');
      });

      expect(result.current.timeline?.groups).toHaveLength(2);
      expect(result.current.timeline?.groups?.[0]?.name).toBe('Group A');
      expect(result.current.timeline?.groups?.[1]?.name).toBe('Group B');
    });

    it('should include created_at timestamp', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1' });
      const clip2 = createMockClip({ id: 'clip-2' });

      const beforeTime = Date.now();

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip1);
        result.current.addClip(clip2);
        result.current.selectClip('clip-1');
        result.current.selectClip('clip-2', true);
        result.current.groupSelectedClips();
      });

      const afterTime = Date.now();
      const group = result.current.timeline?.groups?.[0];
      expect(group?.created_at).toBeGreaterThanOrEqual(beforeTime);
      expect(group?.created_at).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('ungroupClips', () => {
    it('should ungroup clips', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1' });
      const clip2 = createMockClip({ id: 'clip-2' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip1);
        result.current.addClip(clip2);
        result.current.selectClip('clip-1');
        result.current.selectClip('clip-2', true);
        result.current.groupSelectedClips();
      });

      const groupId = result.current.timeline?.groups?.[0]?.id;

      act(() => {
        result.current.ungroupClips(groupId!);
      });

      expect(result.current.timeline?.groups).toHaveLength(0);
    });

    it('should remove group ID from clips', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1' });
      const clip2 = createMockClip({ id: 'clip-2' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip1);
        result.current.addClip(clip2);
        result.current.selectClip('clip-1');
        result.current.selectClip('clip-2', true);
        result.current.groupSelectedClips();
      });

      const groupId = result.current.timeline?.groups?.[0]?.id;

      act(() => {
        result.current.ungroupClips(groupId!);
      });

      expect(result.current.timeline?.clips[0]?.groupId).toBeUndefined();
      expect(result.current.timeline?.clips[1]?.groupId).toBeUndefined();
    });

    it('should update history when ungrouping', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1' });
      const clip2 = createMockClip({ id: 'clip-2' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip1);
        result.current.addClip(clip2);
        result.current.selectClip('clip-1');
        result.current.selectClip('clip-2', true);
        result.current.groupSelectedClips();
      });

      const groupId = result.current.timeline?.groups?.[0]?.id;
      const historyBefore = result.current.history.length;

      act(() => {
        result.current.ungroupClips(groupId!);
      });

      expect(result.current.history.length).toBe(historyBefore + 1);
    });

    it('should handle ungrouping nonexistent group gracefully', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.ungroupClips('nonexistent-group');
      });

      expect(result.current.timeline?.groups).toBeUndefined();
    });

    it('should not ungroup if timeline is null', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.ungroupClips('group-1');
      });

      expect(result.current.timeline).toBeNull();
    });
  });

  describe('getGroupClipIds', () => {
    it('should return clip IDs for a group', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1' });
      const clip2 = createMockClip({ id: 'clip-2' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip1);
        result.current.addClip(clip2);
        result.current.selectClip('clip-1');
        result.current.selectClip('clip-2', true);
        result.current.groupSelectedClips();
      });

      const groupId = result.current.timeline?.groups?.[0]?.id;
      const clipIds = result.current.getGroupClipIds(groupId!);

      expect(clipIds).toHaveLength(2);
      expect(clipIds).toContain('clip-1');
      expect(clipIds).toContain('clip-2');
    });

    it('should return empty array for nonexistent group', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();

      act(() => {
        result.current.setTimeline(mockTimeline);
      });

      const clipIds = result.current.getGroupClipIds('nonexistent-group');
      expect(clipIds).toEqual([]);
    });

    it('should return empty array if timeline is null', () => {
      const { result } = renderHook(() => useEditorStore());
      const clipIds = result.current.getGroupClipIds('group-1');
      expect(clipIds).toEqual([]);
    });

    it('should return copy of clip IDs array', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1' });
      const clip2 = createMockClip({ id: 'clip-2' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip1);
        result.current.addClip(clip2);
        result.current.selectClip('clip-1');
        result.current.selectClip('clip-2', true);
        result.current.groupSelectedClips();
      });

      const groupId = result.current.timeline?.groups?.[0]?.id;
      const clipIds = result.current.getGroupClipIds(groupId!);
      clipIds.push('new-clip');

      const originalClipIds = result.current.timeline?.groups?.[0]?.clipIds;
      expect(originalClipIds).not.toContain('new-clip');
    });
  });

  describe('isClipGrouped', () => {
    it('should return true for grouped clip', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1' });
      const clip2 = createMockClip({ id: 'clip-2' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip1);
        result.current.addClip(clip2);
        result.current.selectClip('clip-1');
        result.current.selectClip('clip-2', true);
        result.current.groupSelectedClips();
      });

      expect(result.current.isClipGrouped('clip-1')).toBe(true);
      expect(result.current.isClipGrouped('clip-2')).toBe(true);
    });

    it('should return false for ungrouped clip', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip1);
      });

      expect(result.current.isClipGrouped('clip-1')).toBe(false);
    });

    it('should return false for nonexistent clip', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();

      act(() => {
        result.current.setTimeline(mockTimeline);
      });

      expect(result.current.isClipGrouped('nonexistent-clip')).toBe(false);
    });

    it('should return false if timeline is null', () => {
      const { result } = renderHook(() => useEditorStore());
      expect(result.current.isClipGrouped('clip-1')).toBe(false);
    });
  });

  describe('getClipGroupId', () => {
    it('should return group ID for grouped clip', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1' });
      const clip2 = createMockClip({ id: 'clip-2' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip1);
        result.current.addClip(clip2);
        result.current.selectClip('clip-1');
        result.current.selectClip('clip-2', true);
        result.current.groupSelectedClips();
      });

      const expectedGroupId = result.current.timeline?.groups?.[0]?.id;
      expect(result.current.getClipGroupId('clip-1')).toBe(expectedGroupId);
    });

    it('should return null for ungrouped clip', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip1);
      });

      expect(result.current.getClipGroupId('clip-1')).toBeNull();
    });

    it('should return null for nonexistent clip', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();

      act(() => {
        result.current.setTimeline(mockTimeline);
      });

      expect(result.current.getClipGroupId('nonexistent-clip')).toBeNull();
    });

    it('should return null if timeline is null', () => {
      const { result } = renderHook(() => useEditorStore());
      expect(result.current.getClipGroupId('clip-1')).toBeNull();
    });
  });

  describe('History Integration', () => {
    it('should allow undo of grouping operation', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1' });
      const clip2 = createMockClip({ id: 'clip-2' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip1);
        result.current.addClip(clip2);
        result.current.selectClip('clip-1');
        result.current.selectClip('clip-2', true);
        result.current.groupSelectedClips();
        result.current.undo();
      });

      expect(result.current.timeline?.groups).toHaveLength(0);
      expect(result.current.timeline?.clips[0]?.groupId).toBeUndefined();
    });

    it('should allow undo of ungrouping operation', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1' });
      const clip2 = createMockClip({ id: 'clip-2' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip1);
        result.current.addClip(clip2);
        result.current.selectClip('clip-1');
        result.current.selectClip('clip-2', true);
        result.current.groupSelectedClips();
      });

      const groupId = result.current.timeline?.groups?.[0]?.id;

      act(() => {
        result.current.ungroupClips(groupId!);
        result.current.undo();
      });

      expect(result.current.timeline?.groups).toHaveLength(1);
      expect(result.current.timeline?.clips[0]?.groupId).toBe(groupId);
    });
  });
});
