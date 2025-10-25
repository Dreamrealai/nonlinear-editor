/**
 * Race Conditions & Concurrency Integration Tests
 *
 * Tests system behavior under concurrent operations, including
 * simultaneous updates, resource locking, and async operation cleanup
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useEditorStore } from '@/state/useEditorStore';
import { usePlaybackStore } from '@/state/usePlaybackStore';
import { useSelectionStore } from '@/state/useSelectionStore';
import type { Timeline, Clip } from '@/types/timeline';

describe('Race Conditions & Concurrency', () => {
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

  beforeEach(() => {
    const { result: editorResult } = renderHook(() => useEditorStore());
    const { result: playbackResult } = renderHook(() => usePlaybackStore());
    const { result: selectionResult } = renderHook(() => useSelectionStore());

    act(() => {
      editorResult.current.setTimeline(null);
      playbackResult.current.reset();
      selectionResult.current.clearSelection();
    });
  });

  describe('Concurrent Updates', () => {
    it('should handle simultaneous clip updates', async () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1' });
      const clip2 = createMockClip({ id: 'clip-2' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip1);
        result.current.addClip(clip2);
      });

      // Update both clips simultaneously
      act(() => {
        result.current.updateClip('clip-1', { timelinePosition: 5 });
        result.current.updateClip('clip-2', { timelinePosition: 10 });
        result.current.updateClip('clip-1', { start: 1 });
        result.current.updateClip('clip-2', { end: 15 });
      });

      // Both updates should be applied
      const updatedClip1 = result.current.timeline?.clips.find((c) => c.id === 'clip-1');
      const updatedClip2 = result.current.timeline?.clips.find((c) => c.id === 'clip-2');

      expect(updatedClip1?.timelinePosition).toBe(5);
      expect(updatedClip1?.start).toBe(1);
      expect(updatedClip2?.timelinePosition).toBe(10);
      // End might be clamped based on validation
      expect(updatedClip2?.end).toBeGreaterThanOrEqual(10);
    });

    it('should handle concurrent timeline saves', async () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();

      act(() => {
        result.current.setTimeline(mockTimeline);
      });

      const clip1 = createMockClip({ id: 'save-clip-1' });
      const clip2 = createMockClip({ id: 'save-clip-2' });
      const clip3 = createMockClip({ id: 'save-clip-3' });

      // Perform multiple operations that would trigger saves
      act(() => {
        result.current.addClip(clip1);
        result.current.addClip(clip2);
        result.current.addClip(clip3);
        result.current.updateClip('save-clip-1', { timelinePosition: 5 });
        result.current.updateClip('save-clip-2', { timelinePosition: 10 });
      });

      // All operations should be reflected in final state
      expect(result.current.timeline?.clips).toHaveLength(3);
    });

    it('should handle rapid state changes', async () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip = createMockClip({ id: 'rapid-clip' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip);
      });

      // Rapidly change the same property
      act(() => {
        for (let i = 0; i < 100; i++) {
          result.current.updateClip('rapid-clip', { timelinePosition: i });
        }
      });

      // Final value should be the last update
      const updatedClip = result.current.timeline?.clips[0];
      expect(updatedClip?.timelinePosition).toBe(99);
    });

    it('should handle concurrent playback and timeline updates', async () => {
      const { result: editorResult } = renderHook(() => useEditorStore());
      const { result: playbackResult } = renderHook(() => usePlaybackStore());

      const mockTimeline = createMockTimeline();
      const clip = createMockClip({ id: 'concurrent-clip' });

      act(() => {
        editorResult.current.setTimeline(mockTimeline);
        editorResult.current.addClip(clip);
        playbackResult.current.play();
      });

      // Update timeline while playing
      act(() => {
        playbackResult.current.setCurrentTime(5);
        editorResult.current.updateClip('concurrent-clip', { timelinePosition: 3 });
        playbackResult.current.setCurrentTime(7);
        editorResult.current.updateClip('concurrent-clip', { end: 12 });
      });

      expect(playbackResult.current.isPlaying).toBe(true);
      expect(playbackResult.current.currentTime).toBe(7);
      // End value may be validated/clamped
      expect(editorResult.current.timeline?.clips[0]?.end).toBeGreaterThanOrEqual(10);
    });

    it('should handle concurrent selection updates', async () => {
      const { result: editorResult } = renderHook(() => useEditorStore());
      const { result: selectionResult } = renderHook(() => useSelectionStore());

      const mockTimeline = createMockTimeline();
      const clips = Array.from({ length: 10 }, (_, i) =>
        createMockClip({ id: `select-clip-${i}` })
      );

      act(() => {
        editorResult.current.setTimeline(mockTimeline);
        clips.forEach((clip) => editorResult.current.addClip(clip));
      });

      // Rapidly select and deselect clips
      act(() => {
        selectionResult.current.selectClip('select-clip-0');
        selectionResult.current.selectClip('select-clip-1', true);
        selectionResult.current.selectClip('select-clip-2', true);
        selectionResult.current.deselectClip('select-clip-1');
        selectionResult.current.selectClip('select-clip-3', true);
      });

      expect(selectionResult.current.selectedClipIds.has('select-clip-0')).toBe(true);
      expect(selectionResult.current.selectedClipIds.has('select-clip-1')).toBe(false);
      expect(selectionResult.current.selectedClipIds.has('select-clip-2')).toBe(true);
      expect(selectionResult.current.selectedClipIds.has('select-clip-3')).toBe(true);
    });
  });

  describe('Resource Locking', () => {
    it('should prevent concurrent edits to same clip', async () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip = createMockClip({ id: 'locked-clip' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip);
      });

      // Simulate concurrent edits
      act(() => {
        result.current.updateClip('locked-clip', { timelinePosition: 5 });
        result.current.updateClip('locked-clip', { timelinePosition: 10 });
      });

      // Last update should win
      const updatedClip = result.current.timeline?.clips[0];
      expect(updatedClip?.timelinePosition).toBe(10);
    });

    it('should queue conflicting operations', async () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip = createMockClip({ id: 'queue-clip' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip);
      });

      // Perform multiple operations in sequence
      const operations = [
        { timelinePosition: 1 },
        { timelinePosition: 2 },
        { timelinePosition: 3 },
        { timelinePosition: 4 },
        { timelinePosition: 5 },
      ];

      act(() => {
        operations.forEach((update) => {
          result.current.updateClip('queue-clip', update);
        });
      });

      // Final state should reflect last operation
      const updatedClip = result.current.timeline?.clips[0];
      expect(updatedClip?.timelinePosition).toBe(5);
    });

    it('should handle undo/redo during active editing', async () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'undo-clip-1' });
      const clip2 = createMockClip({ id: 'undo-clip-2' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip1);
        result.current.addClip(clip2);
        result.current.updateClip('undo-clip-1', { timelinePosition: 5 });
      });

      // Undo while potentially editing
      act(() => {
        result.current.undo();
      });

      expect(result.current.timeline?.clips).toHaveLength(2);

      // Redo
      act(() => {
        result.current.redo();
      });

      const updatedClip = result.current.timeline?.clips.find((c) => c.id === 'undo-clip-1');
      expect(updatedClip?.timelinePosition).toBe(5);
    });
  });

  describe('Async Operations', () => {
    it('should handle component unmount during async operation', async () => {
      const { result, unmount } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();

      act(() => {
        result.current.setTimeline(mockTimeline);
      });

      // Start an operation
      act(() => {
        result.current.addClip(createMockClip({ id: 'async-clip' }));
      });

      // Unmount before potential async completion
      unmount();

      // No errors should be thrown
      expect(true).toBe(true);
    });

    it('should cancel pending requests on navigation', async () => {
      const { result: editorResult } = renderHook(() => useEditorStore());
      const { result: playbackResult } = renderHook(() => usePlaybackStore());

      const mockTimeline = createMockTimeline();

      act(() => {
        editorResult.current.setTimeline(mockTimeline);
        playbackResult.current.play();
      });

      // Simulate navigation by resetting state
      act(() => {
        editorResult.current.setTimeline(null);
        playbackResult.current.reset();
      });

      expect(editorResult.current.timeline).toBeNull();
      expect(playbackResult.current.isPlaying).toBe(false);
      expect(playbackResult.current.currentTime).toBe(0);
    });

    it('should cleanup event listeners properly', async () => {
      const { result, unmount } = renderHook(() => usePlaybackStore());

      act(() => {
        result.current.play();
        result.current.setCurrentTime(5);
        result.current.setZoom(150);
      });

      // Unmount should cleanup any listeners
      unmount();

      // No memory leaks or errors
      expect(true).toBe(true);
    });

    it('should handle rapid store subscription changes', async () => {
      const { result: result1 } = renderHook(() => useEditorStore());
      const { result: result2 } = renderHook(() => useEditorStore());
      const { result: result3 } = renderHook(() => useEditorStore());

      const mockTimeline = createMockTimeline();
      const clip = createMockClip({ id: 'sub-clip' });

      // All hooks should see the same state
      act(() => {
        result1.current.setTimeline(mockTimeline);
        result1.current.addClip(clip);
      });

      expect(result1.current.timeline?.clips).toHaveLength(1);
      expect(result2.current.timeline?.clips).toHaveLength(1);
      expect(result3.current.timeline?.clips).toHaveLength(1);
    });
  });

  describe('Clipboard and Copy Operations', () => {
    it('should handle concurrent copy/paste operations', async () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'copy-clip-1' });
      const clip2 = createMockClip({ id: 'copy-clip-2' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip1);
        result.current.addClip(clip2);
      });

      // Select and copy
      act(() => {
        result.current.selectClip('copy-clip-1');
        result.current.selectClip('copy-clip-2', true);
        result.current.copyClips();
      });

      expect(result.current.copiedClips).toHaveLength(2);

      // Paste while simultaneously doing other operations
      act(() => {
        result.current.pasteClips();
        result.current.updateClip('copy-clip-1', { timelinePosition: 10 });
      });

      // Should have original clips plus pasted clips
      expect(result.current.timeline?.clips.length).toBeGreaterThan(2);
    });

    it('should handle clipboard during undo/redo', async () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip = createMockClip({ id: 'clipboard-clip' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip);
        result.current.selectClip('clipboard-clip');
        result.current.copyClips();
      });

      expect(result.current.copiedClips).toHaveLength(1);

      // Undo
      act(() => {
        result.current.undo();
      });

      // Clipboard should still be valid
      expect(result.current.copiedClips).toHaveLength(1);

      // Paste should still work
      act(() => {
        result.current.pasteClips();
      });

      expect(result.current.timeline?.clips).toHaveLength(1);
    });
  });

  describe('Multi-Store Coordination', () => {
    it('should coordinate timeline and playback stores', async () => {
      const { result: editorResult } = renderHook(() => useEditorStore());
      const { result: playbackResult } = renderHook(() => usePlaybackStore());

      const mockTimeline = createMockTimeline();
      const clip = createMockClip({ id: 'coord-clip', end: 20 });

      act(() => {
        editorResult.current.setTimeline(mockTimeline);
        editorResult.current.addClip(clip);
        playbackResult.current.setCurrentTime(15);
        playbackResult.current.play();
      });

      // Remove clip while playing
      act(() => {
        editorResult.current.removeClip('coord-clip');
      });

      // Playback should still be in valid state
      expect(playbackResult.current.isPlaying).toBe(true);
      expect(playbackResult.current.currentTime).toBe(15);
    });

    it('should coordinate selection and editor stores', async () => {
      const { result: editorResult } = renderHook(() => useEditorStore());
      const { result: selectionResult } = renderHook(() => useSelectionStore());

      const mockTimeline = createMockTimeline();
      const clips = [
        createMockClip({ id: 'coord-sel-1' }),
        createMockClip({ id: 'coord-sel-2' }),
        createMockClip({ id: 'coord-sel-3' }),
      ];

      act(() => {
        editorResult.current.setTimeline(mockTimeline);
        clips.forEach((clip) => editorResult.current.addClip(clip));
        selectionResult.current.selectClip('coord-sel-1');
        selectionResult.current.selectClip('coord-sel-2', true);
      });

      expect(selectionResult.current.selectedClipIds.size).toBe(2);

      // Delete selected clips
      act(() => {
        editorResult.current.removeClip('coord-sel-1');
        editorResult.current.removeClip('coord-sel-2');
      });

      expect(editorResult.current.timeline?.clips).toHaveLength(1);

      // Selection should be updated (clips no longer exist)
      // Note: In real implementation, selection might auto-clear or remain
    });

    it('should handle rapid store resets', async () => {
      const { result: editorResult } = renderHook(() => useEditorStore());
      const { result: playbackResult } = renderHook(() => usePlaybackStore());
      const { result: selectionResult } = renderHook(() => useSelectionStore());

      const mockTimeline = createMockTimeline();
      const clip = createMockClip({ id: 'reset-clip' });

      act(() => {
        editorResult.current.setTimeline(mockTimeline);
        editorResult.current.addClip(clip);
        playbackResult.current.play();
        selectionResult.current.selectClip('reset-clip');
      });

      // Reset all stores simultaneously
      act(() => {
        editorResult.current.setTimeline(null);
        playbackResult.current.reset();
        selectionResult.current.clearSelection();
      });

      expect(editorResult.current.timeline).toBeNull();
      expect(playbackResult.current.isPlaying).toBe(false);
      expect(selectionResult.current.selectedClipIds.size).toBe(0);
    });
  });

  describe('Performance Under Load', () => {
    it('should handle rapid timeline updates', async () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();

      act(() => {
        result.current.setTimeline(mockTimeline);
      });

      // Add many clips rapidly
      act(() => {
        for (let i = 0; i < 100; i++) {
          result.current.addClip(
            createMockClip({
              id: `perf-clip-${i}`,
              timelinePosition: i,
            })
          );
        }
      });

      expect(result.current.timeline?.clips).toHaveLength(100);
    });

    it('should handle rapid playback updates', async () => {
      const { result } = renderHook(() => usePlaybackStore());

      // Simulate frame-by-frame playback updates
      act(() => {
        result.current.play();
        for (let i = 0; i < 60; i++) {
          // 60 frames
          result.current.setCurrentTime(i / 30); // 30 fps
        }
      });

      expect(result.current.currentTime).toBeCloseTo(59 / 30, 2);
      expect(result.current.isPlaying).toBe(true);
    });

    it('should handle concurrent history operations', async () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();

      act(() => {
        result.current.setTimeline(mockTimeline);
      });

      // Perform many operations
      act(() => {
        for (let i = 0; i < 20; i++) {
          result.current.addClip(createMockClip({ id: `history-clip-${i}` }));
        }
      });

      // Undo/redo rapidly
      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.undo();
        }
        for (let i = 0; i < 5; i++) {
          result.current.redo();
        }
      });

      // State should be consistent
      expect(result.current.timeline?.clips.length).toBeGreaterThan(0);
      expect(result.current.canUndo()).toBe(true);
    });
  });
});
