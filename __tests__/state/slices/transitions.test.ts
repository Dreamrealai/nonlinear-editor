/**
 * Test Suite: Transitions Slice
 *
 * Tests transition management operations including:
 * - Adding transitions to selected clips
 * - Different transition types
 * - History tracking
 */

import { renderHook, act } from '@testing-library/react';
import { useEditorStore } from '@/state/useEditorStore';
import type { Timeline, Clip } from '@/types/timeline';

describe('Transitions Slice', () => {
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
    const { result } = renderHook(() => useEditorStore());
    act(() => {
      result.current.setTimeline(null);
    });
  });

  describe('addTransitionToSelectedClips', () => {
    it('should add transition to selected clip', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip = createMockClip({ id: 'clip-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip);
        result.current.selectClip('clip-1');
        result.current.addTransitionToSelectedClips('fade', 1);
      });

      expect(result.current.timeline?.clips[0]?.transitionToNext).toEqual({
        type: 'fade',
        duration: 1,
      });
    });

    it('should add transition to multiple selected clips', () => {
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
        result.current.addTransitionToSelectedClips('fade', 0.5);
      });

      expect(result.current.timeline?.clips[0]?.transitionToNext).toEqual({
        type: 'fade',
        duration: 0.5,
      });
      expect(result.current.timeline?.clips[1]?.transitionToNext).toEqual({
        type: 'fade',
        duration: 0.5,
      });
    });

    it('should support dissolve transition', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip = createMockClip({ id: 'clip-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip);
        result.current.selectClip('clip-1');
        result.current.addTransitionToSelectedClips('dissolve', 2);
      });

      expect(result.current.timeline?.clips[0]?.transitionToNext).toEqual({
        type: 'dissolve',
        duration: 2,
      });
    });

    it('should support wipe transition', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip = createMockClip({ id: 'clip-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip);
        result.current.selectClip('clip-1');
        result.current.addTransitionToSelectedClips('wipe', 1.5);
      });

      expect(result.current.timeline?.clips[0]?.transitionToNext).toEqual({
        type: 'wipe',
        duration: 1.5,
      });
    });

    it('should support none transition', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip = createMockClip({
        id: 'clip-1',
        transitionToNext: { type: 'fade', duration: 1 },
      });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip);
        result.current.selectClip('clip-1');
        result.current.addTransitionToSelectedClips('none', 0);
      });

      expect(result.current.timeline?.clips[0]?.transitionToNext).toEqual({
        type: 'none',
        duration: 0,
      });
    });

    it('should update existing transition', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip = createMockClip({
        id: 'clip-1',
        transitionToNext: { type: 'fade', duration: 1 },
      });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip);
        result.current.selectClip('clip-1');
        result.current.addTransitionToSelectedClips('dissolve', 2);
      });

      expect(result.current.timeline?.clips[0]?.transitionToNext).toEqual({
        type: 'dissolve',
        duration: 2,
      });
    });

    it('should not add transition if no clips selected', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip = createMockClip({ id: 'clip-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip);
        result.current.addTransitionToSelectedClips('fade', 1);
      });

      expect(result.current.timeline?.clips[0]?.transitionToNext).toBeUndefined();
    });

    it('should not add transition if timeline is null', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.addTransitionToSelectedClips('fade', 1);
      });

      expect(result.current.timeline).toBeNull();
    });

    it('should update history when adding transition', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip = createMockClip({ id: 'clip-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip);
        result.current.selectClip('clip-1');
        result.current.addTransitionToSelectedClips('fade', 1);
      });

      // Initial + addClip + addTransition = 3
      expect(result.current.history.length).toBe(3);
    });

    it('should allow undo of transition', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip = createMockClip({ id: 'clip-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip);
        result.current.selectClip('clip-1');
        result.current.addTransitionToSelectedClips('fade', 1);
        result.current.undo();
      });

      expect(result.current.timeline?.clips[0]?.transitionToNext).toBeUndefined();
    });

    it('should handle transition with zero duration', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip = createMockClip({ id: 'clip-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip);
        result.current.selectClip('clip-1');
        result.current.addTransitionToSelectedClips('fade', 0);
      });

      expect(result.current.timeline?.clips[0]?.transitionToNext).toEqual({
        type: 'fade',
        duration: 0,
      });
    });

    it('should only affect selected clips', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1' });
      const clip2 = createMockClip({ id: 'clip-2' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip1);
        result.current.addClip(clip2);
        result.current.selectClip('clip-1');
        result.current.addTransitionToSelectedClips('fade', 1);
      });

      expect(result.current.timeline?.clips[0]?.transitionToNext).toEqual({
        type: 'fade',
        duration: 1,
      });
      expect(result.current.timeline?.clips[1]?.transitionToNext).toBeUndefined();
    });
  });
});
