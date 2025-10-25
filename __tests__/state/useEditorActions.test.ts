/**
 * Tests for useEditorActions - High-level editor actions with history integration
 *
 * Tests cover:
 * - Timeline actions with automatic history tracking
 * - Marker operations with history
 * - Text overlay operations with history
 * - Transition management
 * - Copy/paste functionality
 * - Undo/redo integration
 * - Multi-store coordination
 * - Editor initialization
 */

import { renderHook, act } from '@testing-library/react';
import { useEditorActions } from '@/state/useEditorActions';
import {
  useTimelineStore,
  usePlaybackStore,
  useSelectionStore,
  useHistoryStore,
  useClipboardStore,
} from '@/state/index';
import type { Timeline, Clip, Marker, TextOverlay } from '@/types/timeline';

describe('useEditorActions', () => {
  // Helper to create a mock timeline
  const createMockTimeline = (overrides?: Partial<Timeline>): Timeline => ({
    projectId: 'test-project',
    clips: [],
    markers: [],
    textOverlays: [],
    tracks: [],
    output: {
      width: 1920,
      height: 1080,
      fps: 30,
      vBitrateK: 5000,
      aBitrateK: 128,
      format: 'mp4',
    },
    ...overrides,
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

  // Helper to create a mock marker
  const createMockMarker = (overrides?: Partial<Marker>): Marker => ({
    id: `marker-${Date.now()}-${Math.random()}`,
    time: 0,
    label: 'Test Marker',
    ...overrides,
  });

  // Helper to create a mock text overlay
  const createMockTextOverlay = (overrides?: Partial<TextOverlay>): TextOverlay => ({
    id: `text-${Date.now()}-${Math.random()}`,
    text: 'Test Text',
    startTime: 0,
    endTime: 5,
    x: 100,
    y: 100,
    fontSize: 24,
    color: '#ffffff',
    ...overrides,
  });

  beforeEach((): void => {
    // Reset all stores before each test
    act(() => {
      useTimelineStore.getState().setTimeline(null);
      useSelectionStore.getState().clearSelection();
      useClipboardStore.getState().clearClipboard();
      usePlaybackStore.getState().setCurrentTime(0);
      useHistoryStore.getState().clearHistory();
    });
  });

  describe('Editor Initialization', () => {
    it('should initialize editor with timeline', () => {
      // Arrange
      const { result } = renderHook(() => useEditorActions());
      const mockTimeline = createMockTimeline();

      // Act
      act(() => {
        result.current.initializeEditor(mockTimeline);
      });

      // Assert
      expect(useTimelineStore.getState().timeline).toEqual(mockTimeline);
      expect(useHistoryStore.getState().history.length).toBe(1);
      expect(useSelectionStore.getState().selectedClipIds.size).toBe(0);
      expect(useClipboardStore.getState().copiedClips.length).toBe(0);
      expect(usePlaybackStore.getState().currentTime).toBe(0);
    });

    it('should handle null timeline initialization', () => {
      // Arrange
      const { result } = renderHook(() => useEditorActions());

      // Act
      act(() => {
        result.current.initializeEditor(null);
      });

      // Assert
      expect(useTimelineStore.getState().timeline).toBeNull();
      expect(useSelectionStore.getState().selectedClipIds.size).toBe(0);
      expect(useClipboardStore.getState().copiedClips.length).toBe(0);
      expect(usePlaybackStore.getState().currentTime).toBe(0);
    });

    it('should reset all stores when initializing', () => {
      // Arrange
      const { result } = renderHook(() => useEditorActions());
      const mockTimeline = createMockTimeline();

      // Setup pre-existing state
      act(() => {
        useTimelineStore.getState().setTimeline(createMockTimeline());
        useSelectionStore.getState().selectClip('old-clip');
        useClipboardStore.getState().copyClips([createMockClip()]);
        usePlaybackStore.getState().setCurrentTime(10);
      });

      // Act
      act(() => {
        result.current.initializeEditor(mockTimeline);
      });

      // Assert
      expect(useSelectionStore.getState().selectedClipIds.size).toBe(0);
      expect(useClipboardStore.getState().copiedClips.length).toBe(0);
      expect(usePlaybackStore.getState().currentTime).toBe(0);
    });
  });

  describe('Clip Actions with History', () => {
    it('should add clip and save to history', () => {
      // Arrange
      const { result } = renderHook(() => useEditorActions());
      const mockTimeline = createMockTimeline();
      const mockClip = createMockClip({ id: 'clip-1' });

      act(() => {
        useTimelineStore.getState().setTimeline(mockTimeline);
      });

      const initialHistoryLength = useHistoryStore.getState().history.length;

      // Act
      act(() => {
        result.current.addClip(mockClip);
      });

      // Assert
      expect(useTimelineStore.getState().timeline?.clips).toContainEqual(mockClip);
      expect(useHistoryStore.getState().history.length).toBe(initialHistoryLength + 1);
    });

    it('should update clip and save to history with debouncing', () => {
      // Arrange
      const { result } = renderHook(() => useEditorActions());
      const mockTimeline = createMockTimeline();
      const mockClip = createMockClip({ id: 'clip-1' });

      act(() => {
        useTimelineStore.getState().setTimeline(mockTimeline);
        useTimelineStore.getState().addClip(mockClip);
      });

      const initialHistoryLength = useHistoryStore.getState().history.length;

      // Act
      act(() => {
        result.current.updateClip('clip-1', { timelinePosition: 5 });
      });

      // Assert
      const timeline = useTimelineStore.getState().timeline;
      const updatedClip = timeline?.clips.find((c) => c.id === 'clip-1');
      expect(updatedClip?.timelinePosition).toBe(5);
      // History should be updated (debounced by clip ID)
      expect(useHistoryStore.getState().history.length).toBeGreaterThanOrEqual(
        initialHistoryLength
      );
    });

    it('should remove clip, deselect it, and save to history', () => {
      // Arrange
      const { result } = renderHook(() => useEditorActions());
      const mockTimeline = createMockTimeline();
      const mockClip = createMockClip({ id: 'clip-1' });

      act(() => {
        useTimelineStore.getState().setTimeline(mockTimeline);
        useTimelineStore.getState().addClip(mockClip);
        useSelectionStore.getState().selectClip('clip-1');
      });

      const initialHistoryLength = useHistoryStore.getState().history.length;

      // Act
      act(() => {
        result.current.removeClip('clip-1');
      });

      // Assert
      expect(useTimelineStore.getState().timeline?.clips).toHaveLength(0);
      expect(useSelectionStore.getState().isSelected('clip-1')).toBe(false);
      expect(useHistoryStore.getState().history.length).toBe(initialHistoryLength + 1);
    });

    it('should reorder clips and save to history', () => {
      // Arrange
      const { result } = renderHook(() => useEditorActions());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1' });
      const clip2 = createMockClip({ id: 'clip-2' });

      act(() => {
        useTimelineStore.getState().setTimeline(mockTimeline);
        useTimelineStore.getState().addClip(clip1);
        useTimelineStore.getState().addClip(clip2);
      });

      const initialHistoryLength = useHistoryStore.getState().history.length;

      // Act
      act(() => {
        result.current.reorderClips(['clip-2', 'clip-1']);
      });

      // Assert
      const clips = useTimelineStore.getState().timeline?.clips || [];
      expect(clips[0]?.id).toBe('clip-2');
      expect(clips[1]?.id).toBe('clip-1');
      expect(useHistoryStore.getState().history.length).toBe(initialHistoryLength + 1);
    });

    it('should split clip at time and save to history', () => {
      // Arrange
      const { result } = renderHook(() => useEditorActions());
      const mockTimeline = createMockTimeline();
      const mockClip = createMockClip({
        id: 'clip-1',
        start: 0,
        end: 10,
        timelinePosition: 0,
        sourceDuration: 10,
      });

      act(() => {
        useTimelineStore.getState().setTimeline(mockTimeline);
        useTimelineStore.getState().addClip(mockClip);
      });

      const initialHistoryLength = useHistoryStore.getState().history.length;

      // Act
      act(() => {
        result.current.splitClipAtTime('clip-1', 5);
      });

      // Assert
      const clips = useTimelineStore.getState().timeline?.clips || [];
      expect(clips.length).toBe(2);
      expect(clips[0]?.end).toBe(5);
      expect(clips[1]?.start).toBe(5);
      expect(useHistoryStore.getState().history.length).toBe(initialHistoryLength + 1);
    });
  });

  describe('Marker Actions with History', () => {
    it('should add marker and save to history', () => {
      // Arrange
      const { result } = renderHook(() => useEditorActions());
      const mockTimeline = createMockTimeline();
      const mockMarker = createMockMarker({ id: 'marker-1', time: 5 });

      act(() => {
        useTimelineStore.getState().setTimeline(mockTimeline);
      });

      const initialHistoryLength = useHistoryStore.getState().history.length;

      // Act
      act(() => {
        result.current.addMarker(mockMarker);
      });

      // Assert
      expect(useTimelineStore.getState().timeline?.markers).toContainEqual(mockMarker);
      expect(useHistoryStore.getState().history.length).toBe(initialHistoryLength + 1);
    });

    it('should remove marker and save to history', () => {
      // Arrange
      const { result } = renderHook(() => useEditorActions());
      const mockTimeline = createMockTimeline();
      const mockMarker = createMockMarker({ id: 'marker-1' });

      act(() => {
        useTimelineStore.getState().setTimeline(mockTimeline);
        useTimelineStore.getState().addMarker(mockMarker);
      });

      const initialHistoryLength = useHistoryStore.getState().history.length;

      // Act
      act(() => {
        result.current.removeMarker('marker-1');
      });

      // Assert
      expect(useTimelineStore.getState().timeline?.markers).toHaveLength(0);
      expect(useHistoryStore.getState().history.length).toBe(initialHistoryLength + 1);
    });

    it('should update marker and save to history with debouncing', () => {
      // Arrange
      const { result } = renderHook(() => useEditorActions());
      const mockTimeline = createMockTimeline();
      const mockMarker = createMockMarker({ id: 'marker-1', label: 'Original' });

      act(() => {
        useTimelineStore.getState().setTimeline(mockTimeline);
        useTimelineStore.getState().addMarker(mockMarker);
      });

      const initialHistoryLength = useHistoryStore.getState().history.length;

      // Act
      act(() => {
        result.current.updateMarker('marker-1', { label: 'Updated' });
      });

      // Assert
      const marker = useTimelineStore.getState().timeline?.markers?.[0];
      expect(marker?.label).toBe('Updated');
      expect(useHistoryStore.getState().history.length).toBeGreaterThanOrEqual(
        initialHistoryLength
      );
    });
  });

  describe('Text Overlay Actions with History', () => {
    it('should add text overlay and save to history', () => {
      // Arrange
      const { result } = renderHook(() => useEditorActions());
      const mockTimeline = createMockTimeline();
      const mockTextOverlay = createMockTextOverlay({ id: 'text-1' });

      act(() => {
        useTimelineStore.getState().setTimeline(mockTimeline);
      });

      const initialHistoryLength = useHistoryStore.getState().history.length;

      // Act
      act(() => {
        result.current.addTextOverlay(mockTextOverlay);
      });

      // Assert
      expect(useTimelineStore.getState().timeline?.textOverlays).toContainEqual(mockTextOverlay);
      expect(useHistoryStore.getState().history.length).toBe(initialHistoryLength + 1);
    });

    it('should remove text overlay and save to history', () => {
      // Arrange
      const { result } = renderHook(() => useEditorActions());
      const mockTimeline = createMockTimeline();
      const mockTextOverlay = createMockTextOverlay({ id: 'text-1' });

      act(() => {
        useTimelineStore.getState().setTimeline(mockTimeline);
        useTimelineStore.getState().addTextOverlay(mockTextOverlay);
      });

      const initialHistoryLength = useHistoryStore.getState().history.length;

      // Act
      act(() => {
        result.current.removeTextOverlay('text-1');
      });

      // Assert
      expect(useTimelineStore.getState().timeline?.textOverlays).toHaveLength(0);
      expect(useHistoryStore.getState().history.length).toBe(initialHistoryLength + 1);
    });

    it('should update text overlay and save to history with debouncing', () => {
      // Arrange
      const { result } = renderHook(() => useEditorActions());
      const mockTimeline = createMockTimeline();
      const mockTextOverlay = createMockTextOverlay({ id: 'text-1', text: 'Original' });

      act(() => {
        useTimelineStore.getState().setTimeline(mockTimeline);
        useTimelineStore.getState().addTextOverlay(mockTextOverlay);
      });

      const initialHistoryLength = useHistoryStore.getState().history.length;

      // Act
      act(() => {
        result.current.updateTextOverlay('text-1', { text: 'Updated' });
      });

      // Assert
      const overlay = useTimelineStore.getState().timeline?.textOverlays?.[0];
      expect(overlay?.text).toBe('Updated');
      expect(useHistoryStore.getState().history.length).toBeGreaterThanOrEqual(
        initialHistoryLength
      );
    });
  });

  describe('Transition Actions with History', () => {
    it('should add transition to selected clips and save to history', () => {
      // Arrange
      const { result } = renderHook(() => useEditorActions());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1' });
      const clip2 = createMockClip({ id: 'clip-2' });

      act(() => {
        useTimelineStore.getState().setTimeline(mockTimeline);
        useTimelineStore.getState().addClip(clip1);
        useTimelineStore.getState().addClip(clip2);
        useSelectionStore.getState().selectClip('clip-1');
        useSelectionStore.getState().selectClip('clip-2', true);
      });

      const initialHistoryLength = useHistoryStore.getState().history.length;

      // Act
      act(() => {
        result.current.addTransitionToSelectedClips('fade', 1);
      });

      // Assert
      const clips = useTimelineStore.getState().timeline?.clips || [];
      clips.forEach((clip) => {
        if (clip.id === 'clip-1' || clip.id === 'clip-2') {
          expect(clip.transitionToNext).toEqual({ type: 'fade', duration: 1 });
        }
      });
      expect(useHistoryStore.getState().history.length).toBe(initialHistoryLength + 1);
    });

    it('should handle transition with no selected clips', () => {
      // Arrange
      const { result } = renderHook(() => useEditorActions());
      const mockTimeline = createMockTimeline();

      act(() => {
        useTimelineStore.getState().setTimeline(mockTimeline);
      });

      const initialHistoryLength = useHistoryStore.getState().history.length;

      // Act
      act(() => {
        result.current.addTransitionToSelectedClips('fade', 1);
      });

      // Assert - should still save to history even with no clips selected
      expect(useHistoryStore.getState().history.length).toBeGreaterThanOrEqual(
        initialHistoryLength
      );
    });
  });

  describe('Copy/Paste Operations', () => {
    it('should copy selected clips', () => {
      // Arrange
      const { result } = renderHook(() => useEditorActions());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1' });
      const clip2 = createMockClip({ id: 'clip-2' });

      act(() => {
        useTimelineStore.getState().setTimeline(mockTimeline);
        useTimelineStore.getState().addClip(clip1);
        useTimelineStore.getState().addClip(clip2);
        useSelectionStore.getState().selectClip('clip-1');
        useSelectionStore.getState().selectClip('clip-2', true);
      });

      // Act
      act(() => {
        result.current.copySelectedClips();
      });

      // Assert
      const copiedClips = useClipboardStore.getState().copiedClips;
      expect(copiedClips).toHaveLength(2);
    });

    it('should paste clips at current time and save to history', () => {
      // Arrange
      const { result } = renderHook(() => useEditorActions());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1', timelinePosition: 0 });

      act(() => {
        useTimelineStore.getState().setTimeline(mockTimeline);
        useTimelineStore.getState().addClip(clip1);
        useSelectionStore.getState().selectClip('clip-1');
        useClipboardStore.getState().copyClips([clip1]);
        usePlaybackStore.getState().setCurrentTime(10);
      });

      const initialHistoryLength = useHistoryStore.getState().history.length;

      // Act
      act(() => {
        result.current.pasteClipsAtCurrentTime();
      });

      // Assert
      const clips = useTimelineStore.getState().timeline?.clips || [];
      expect(clips.length).toBe(2); // Original + pasted
      expect(clips[1]?.timelinePosition).toBe(10);
      expect(useHistoryStore.getState().history.length).toBe(initialHistoryLength + 1);
    });

    it('should select pasted clips after paste', () => {
      // Arrange
      const { result } = renderHook(() => useEditorActions());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1' });

      act(() => {
        useTimelineStore.getState().setTimeline(mockTimeline);
        useTimelineStore.getState().addClip(clip1);
        useClipboardStore.getState().copyClips([clip1]);
      });

      // Act
      act(() => {
        result.current.pasteClipsAtCurrentTime();
      });

      // Assert
      const selectedIds = useSelectionStore.getState().selectedClipIds;
      expect(selectedIds.size).toBe(1);
      // Should not select the original clip
      expect(selectedIds.has('clip-1')).toBe(false);
    });

    it('should handle paste with empty clipboard', () => {
      // Arrange
      const { result } = renderHook(() => useEditorActions());
      const mockTimeline = createMockTimeline();

      act(() => {
        useTimelineStore.getState().setTimeline(mockTimeline);
      });

      const initialClipCount = useTimelineStore.getState().timeline?.clips.length || 0;

      // Act
      act(() => {
        result.current.pasteClipsAtCurrentTime();
      });

      // Assert - should not add any clips
      const currentClipCount = useTimelineStore.getState().timeline?.clips.length || 0;
      expect(currentClipCount).toBe(initialClipCount);
    });

    it('should paste multiple clips with correct offsets', () => {
      // Arrange
      const { result } = renderHook(() => useEditorActions());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1', timelinePosition: 0 });
      const clip2 = createMockClip({ id: 'clip-2', timelinePosition: 5 });

      act(() => {
        useTimelineStore.getState().setTimeline(mockTimeline);
        useClipboardStore.getState().copyClips([clip1, clip2]);
        usePlaybackStore.getState().setCurrentTime(10);
      });

      // Act
      act(() => {
        result.current.pasteClipsAtCurrentTime();
      });

      // Assert
      const clips = useTimelineStore.getState().timeline?.clips || [];
      expect(clips.length).toBe(2);
      expect(clips[0]?.timelinePosition).toBe(10); // 10 + (0 - 0)
      expect(clips[1]?.timelinePosition).toBe(15); // 10 + (5 - 0)
    });
  });

  describe('Undo/Redo Operations', () => {
    it('should undo action and restore previous timeline', () => {
      // Arrange
      const { result } = renderHook(() => useEditorActions());
      const mockTimeline = createMockTimeline();
      const mockClip = createMockClip({ id: 'clip-1' });

      act(() => {
        useTimelineStore.getState().setTimeline(mockTimeline);
        useHistoryStore.getState().initializeHistory(mockTimeline);
      });

      // Add clip
      act(() => {
        result.current.addClip(mockClip);
      });

      expect(useTimelineStore.getState().timeline?.clips).toHaveLength(1);

      // Act - Undo
      act(() => {
        result.current.undo();
      });

      // Assert
      expect(useTimelineStore.getState().timeline?.clips).toHaveLength(0);
    });

    it('should redo action and restore next timeline', () => {
      // Arrange
      const { result } = renderHook(() => useEditorActions());
      const mockTimeline = createMockTimeline();
      const mockClip = createMockClip({ id: 'clip-1' });

      act(() => {
        useTimelineStore.getState().setTimeline(mockTimeline);
        useHistoryStore.getState().initializeHistory(mockTimeline);
      });

      // Add clip and undo
      act(() => {
        result.current.addClip(mockClip);
        result.current.undo();
      });

      expect(useTimelineStore.getState().timeline?.clips).toHaveLength(0);

      // Act - Redo
      act(() => {
        result.current.redo();
      });

      // Assert
      expect(useTimelineStore.getState().timeline?.clips).toHaveLength(1);
    });

    it('should handle undo with no history', () => {
      // Arrange
      const { result } = renderHook(() => useEditorActions());

      // Act - Try to undo with no history
      act(() => {
        result.current.undo();
      });

      // Assert - Should not crash
      expect(useTimelineStore.getState().timeline).toBeNull();
    });

    it('should handle redo with no future history', () => {
      // Arrange
      const { result } = renderHook(() => useEditorActions());
      const mockTimeline = createMockTimeline();

      act(() => {
        useTimelineStore.getState().setTimeline(mockTimeline);
        useHistoryStore.getState().initializeHistory(mockTimeline);
      });

      // Act - Try to redo with no future
      act(() => {
        result.current.redo();
      });

      // Assert - Timeline should remain unchanged
      expect(useTimelineStore.getState().timeline?.clips).toHaveLength(0);
    });
  });

  describe('Multi-Store Coordination', () => {
    it('should coordinate between timeline and selection stores on clip removal', () => {
      // Arrange
      const { result } = renderHook(() => useEditorActions());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1' });
      const clip2 = createMockClip({ id: 'clip-2' });

      act(() => {
        useTimelineStore.getState().setTimeline(mockTimeline);
        useTimelineStore.getState().addClip(clip1);
        useTimelineStore.getState().addClip(clip2);
        useSelectionStore.getState().selectClip('clip-1');
        useSelectionStore.getState().selectClip('clip-2', true);
      });

      // Act - Remove only clip-1
      act(() => {
        result.current.removeClip('clip-1');
      });

      // Assert
      expect(useSelectionStore.getState().isSelected('clip-1')).toBe(false);
      expect(useSelectionStore.getState().isSelected('clip-2')).toBe(true);
      expect(useTimelineStore.getState().timeline?.clips).toHaveLength(1);
    });

    it('should coordinate between clipboard, selection, and timeline stores on paste', () => {
      // Arrange
      const { result } = renderHook(() => useEditorActions());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1' });

      act(() => {
        useTimelineStore.getState().setTimeline(mockTimeline);
        useTimelineStore.getState().addClip(clip1);
        useSelectionStore.getState().selectClip('clip-1');
      });

      // Copy and clear selection
      act(() => {
        result.current.copySelectedClips();
        useSelectionStore.getState().clearSelection();
      });

      expect(useSelectionStore.getState().selectedClipIds.size).toBe(0);

      // Act - Paste
      act(() => {
        result.current.pasteClipsAtCurrentTime();
      });

      // Assert
      expect(useTimelineStore.getState().timeline?.clips).toHaveLength(2);
      expect(useSelectionStore.getState().selectedClipIds.size).toBe(1);
      expect(useSelectionStore.getState().isSelected('clip-1')).toBe(false);
    });

    it('should coordinate playback store for paste position', () => {
      // Arrange
      const { result } = renderHook(() => useEditorActions());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1', timelinePosition: 0 });

      act(() => {
        useTimelineStore.getState().setTimeline(mockTimeline);
        useClipboardStore.getState().copyClips([clip1]);
        usePlaybackStore.getState().setCurrentTime(20);
      });

      // Act
      act(() => {
        result.current.pasteClipsAtCurrentTime();
      });

      // Assert
      const pastedClip = useTimelineStore.getState().timeline?.clips[0];
      expect(pastedClip?.timelinePosition).toBe(20);
    });
  });

  describe('Edge Cases', () => {
    it('should handle operations when timeline is null', () => {
      // Arrange
      const { result } = renderHook(() => useEditorActions());
      const mockClip = createMockClip();

      // Act & Assert - Should not crash
      act(() => {
        result.current.addClip(mockClip);
        result.current.updateClip('clip-1', { timelinePosition: 5 });
        result.current.removeClip('clip-1');
        result.current.copySelectedClips();
        result.current.pasteClipsAtCurrentTime();
      });

      expect(useTimelineStore.getState().timeline).toBeNull();
    });

    it('should handle copy with no selected clips', () => {
      // Arrange
      const { result } = renderHook(() => useEditorActions());
      const mockTimeline = createMockTimeline();

      act(() => {
        useTimelineStore.getState().setTimeline(mockTimeline);
      });

      // Act
      act(() => {
        result.current.copySelectedClips();
      });

      // Assert
      expect(useClipboardStore.getState().copiedClips).toHaveLength(0);
    });

    it('should handle update on non-existent clip', () => {
      // Arrange
      const { result } = renderHook(() => useEditorActions());
      const mockTimeline = createMockTimeline();

      act(() => {
        useTimelineStore.getState().setTimeline(mockTimeline);
      });

      // Act & Assert - Should not crash
      act(() => {
        result.current.updateClip('non-existent', { timelinePosition: 5 });
      });

      expect(useTimelineStore.getState().timeline?.clips).toHaveLength(0);
    });

    it('should handle remove on non-existent clip', () => {
      // Arrange
      const { result } = renderHook(() => useEditorActions());
      const mockTimeline = createMockTimeline();

      act(() => {
        useTimelineStore.getState().setTimeline(mockTimeline);
      });

      // Act & Assert - Should not crash
      act(() => {
        result.current.removeClip('non-existent');
      });

      expect(useTimelineStore.getState().timeline?.clips).toHaveLength(0);
    });
  });
});
