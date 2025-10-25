import { renderHook, act } from '@testing-library/react';
import { useEditorStore } from '@/state/useEditorStore';
import type { Timeline, Clip } from '@/types/timeline';

describe('useEditorStore', () => {
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

  describe('Timeline Management', () => {
    it('should initialize with null timeline', () => {
      const { result } = renderHook(() => useEditorStore());
      expect(result.current.timeline).toBeNull();
    });

    it('should set timeline', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();

      act(() => {
        result.current.setTimeline(mockTimeline);
      });

      expect(result.current.timeline).toEqual(mockTimeline);
    });

    it('should initialize history when setting timeline', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();

      act(() => {
        result.current.setTimeline(mockTimeline);
      });

      expect(result.current.history.length).toBe(1);
      expect(result.current.historyIndex).toBe(0);
    });
  });

  describe('Clip Management', () => {
    it('should add clip to timeline', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const mockClip = createMockClip();

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(mockClip);
      });

      expect(result.current.timeline?.clips).toHaveLength(1);
      expect(result.current.timeline?.clips[0]).toEqual(mockClip);
    });

    it('should update clip properties', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const mockClip = createMockClip({ id: 'test-clip' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(mockClip);
        result.current.updateClip('test-clip', { timelinePosition: 5 });
      });

      expect(result.current.timeline?.clips[0]?.timelinePosition).toBe(5);
    });

    it('should remove clip from timeline', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const mockClip = createMockClip({ id: 'test-clip' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(mockClip);
        result.current.removeClip('test-clip');
      });

      expect(result.current.timeline?.clips).toHaveLength(0);
    });

    it('should reorder clips', () => {
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

      expect(result.current.timeline?.clips[0]?.id).toBe('clip-2');
      expect(result.current.timeline?.clips[1]?.id).toBe('clip-1');
    });

    it('should deduplicate clips', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1' });
      const clip2 = createMockClip({ id: 'clip-1' }); // Same ID

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip1);
        result.current.addClip(clip2);
      });

      expect(result.current.timeline?.clips).toHaveLength(1);
    });
  });

  describe('Playback Controls', () => {
    it('should set current time', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.setCurrentTime(5.5);
      });

      expect(result.current.currentTime).toBe(5.5);
    });

    it('should set zoom level', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.setZoom(100);
      });

      expect(result.current.zoom).toBe(100);
    });

    it('should clamp zoom to valid range', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.setZoom(5); // Too low
      });
      expect(result.current.zoom).toBe(10);

      act(() => {
        result.current.setZoom(300); // Too high
      });
      expect(result.current.zoom).toBe(200);
    });
  });

  describe('Selection Management', () => {
    it('should select clip', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.selectClip('clip-1');
      });

      expect(result.current.selectedClipIds.has('clip-1')).toBe(true);
    });

    it('should support multi-select', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.selectClip('clip-1');
        result.current.selectClip('clip-2', true);
      });

      expect(result.current.selectedClipIds.has('clip-1')).toBe(true);
      expect(result.current.selectedClipIds.has('clip-2')).toBe(true);
    });

    it('should clear selection', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.selectClip('clip-1');
        result.current.selectClip('clip-2', true);
        result.current.clearSelection();
      });

      expect(result.current.selectedClipIds.size).toBe(0);
    });

    it('should toggle selection in multi mode', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.selectClip('clip-1', true);
        result.current.selectClip('clip-1', true); // Toggle off
      });

      expect(result.current.selectedClipIds.has('clip-1')).toBe(false);
    });
  });

  describe('Clipboard Operations', () => {
    it('should copy selected clips', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip1);
        result.current.selectClip('clip-1');
        result.current.copyClips();
      });

      expect(result.current.copiedClips).toHaveLength(1);
    });

    it('should paste clips at current time', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1', timelinePosition: 0 });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip1);
        result.current.selectClip('clip-1');
        result.current.copyClips();
        result.current.setCurrentTime(10);
        result.current.pasteClips();
      });

      expect(result.current.timeline?.clips).toHaveLength(2);
      expect(result.current.timeline?.clips[1]?.timelinePosition).toBe(10);
    });

    it('should select pasted clips', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip1);
        result.current.selectClip('clip-1');
        result.current.copyClips();
        result.current.pasteClips();
      });

      expect(result.current.selectedClipIds.size).toBe(1);
    });
  });

  describe('Undo/Redo', () => {
    it('should track history when adding clips', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip();

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip1);
      });

      expect(result.current.history.length).toBe(2); // Initial + add
    });

    it('should undo clip addition', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip();

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip1);
        result.current.undo();
      });

      expect(result.current.timeline?.clips).toHaveLength(0);
    });

    it('should redo clip addition', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip();

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip1);
        result.current.undo();
        result.current.redo();
      });

      expect(result.current.timeline?.clips).toHaveLength(1);
    });

    it('should report canUndo correctly', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();

      act(() => {
        result.current.setTimeline(mockTimeline);
      });

      expect(result.current.canUndo()).toBe(false);

      act(() => {
        result.current.addClip(createMockClip());
      });

      expect(result.current.canUndo()).toBe(true);
    });

    it('should report canRedo correctly', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(createMockClip());
      });

      expect(result.current.canRedo()).toBe(false);

      act(() => {
        result.current.undo();
      });

      expect(result.current.canRedo()).toBe(true);
    });
  });

  describe('Markers', () => {
    it('should add marker', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addMarker({
          id: 'marker-1',
          time: 5,
          label: 'Test Marker',
        });
      });

      expect(result.current.timeline?.markers).toHaveLength(1);
      expect(result.current.timeline?.markers?.[0]?.label).toBe('Test Marker');
    });

    it('should remove marker', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addMarker({
          id: 'marker-1',
          time: 5,
          label: 'Test Marker',
        });
        result.current.removeMarker('marker-1');
      });

      expect(result.current.timeline?.markers).toHaveLength(0);
    });

    it('should update marker', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addMarker({
          id: 'marker-1',
          time: 5,
          label: 'Test Marker',
        });
        result.current.updateMarker('marker-1', { label: 'Updated Marker' });
      });

      expect(result.current.timeline?.markers?.[0]?.label).toBe('Updated Marker');
    });
  });

  describe('Tracks', () => {
    it('should update existing track', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.updateTrack(0, { name: 'Custom Track Name' });
      });

      expect(result.current.timeline?.tracks?.[0]?.name).toBe('Custom Track Name');
    });

    it('should create track if it does not exist', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.updateTrack(2, { name: 'New Track' });
      });

      expect(result.current.timeline?.tracks).toHaveLength(1);
      expect(result.current.timeline?.tracks?.[0]?.index).toBe(2);
      expect(result.current.timeline?.tracks?.[0]?.name).toBe('New Track');
    });
  });

  describe('Text Overlays', () => {
    it('should add text overlay', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addTextOverlay({
          id: 'text-1',
          text: 'Test Text',
          startTime: 0,
          endTime: 5,
          x: 100,
          y: 100,
          fontSize: 24,
          color: '#ffffff',
        });
      });

      expect(result.current.timeline?.textOverlays).toHaveLength(1);
      expect(result.current.timeline?.textOverlays?.[0]?.text).toBe('Test Text');
    });

    it('should remove text overlay', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addTextOverlay({
          id: 'text-1',
          text: 'Test Text',
          startTime: 0,
          endTime: 5,
          x: 100,
          y: 100,
          fontSize: 24,
          color: '#ffffff',
        });
        result.current.removeTextOverlay('text-1');
      });

      expect(result.current.timeline?.textOverlays).toHaveLength(0);
    });

    it('should update text overlay', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addTextOverlay({
          id: 'text-1',
          text: 'Test Text',
          startTime: 0,
          endTime: 5,
          x: 100,
          y: 100,
          fontSize: 24,
          color: '#ffffff',
        });
        result.current.updateTextOverlay('text-1', { text: 'Updated Text' });
      });

      expect(result.current.timeline?.textOverlays?.[0]?.text).toBe('Updated Text');
    });
  });

  describe('Transitions', () => {
    it('should add transition to selected clips', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip1);
        result.current.selectClip('clip-1');
        result.current.addTransitionToSelectedClips('fade', 1);
      });

      expect(result.current.timeline?.clips[0]?.transitionToNext).toEqual({
        type: 'fade',
        duration: 1,
      });
    });
  });

  describe('Clip Splitting', () => {
    it('should split clip at time', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip = createMockClip({
        id: 'clip-1',
        start: 0,
        end: 10,
        timelinePosition: 0,
        sourceDuration: 10,
      });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip);
        result.current.splitClipAtTime('clip-1', 5);
      });

      expect(result.current.timeline?.clips).toHaveLength(2);
      expect(result.current.timeline?.clips[0]?.end).toBe(5);
      expect(result.current.timeline?.clips[1]?.start).toBe(5);
      expect(result.current.timeline?.clips[1]?.timelinePosition).toBe(5);
    });

    it('should not split if time is outside clip bounds', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip = createMockClip({
        id: 'clip-1',
        start: 0,
        end: 10,
        timelinePosition: 0,
        sourceDuration: 10,
      });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip);
        result.current.splitClipAtTime('clip-1', -1); // Before clip
      });

      expect(result.current.timeline?.clips).toHaveLength(1);

      act(() => {
        result.current.splitClipAtTime('clip-1', 15); // After clip
      });

      expect(result.current.timeline?.clips).toHaveLength(1);
    });

    it('should not split if resulting clips would be too short', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip = createMockClip({
        id: 'clip-1',
        start: 0,
        end: 1,
        timelinePosition: 0,
        sourceDuration: 1,
      });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip);
        result.current.splitClipAtTime('clip-1', 0.05); // Too close to start
      });

      expect(result.current.timeline?.clips).toHaveLength(1);
    });
  });

  describe('Clip Update Validation', () => {
    it('should enforce minimum clip duration', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip = createMockClip({
        id: 'clip-1',
        start: 0,
        end: 10,
        timelinePosition: 0,
        sourceDuration: 10,
      });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip);
        result.current.updateClip('clip-1', { end: 0.05 }); // Try to set too short
      });

      const updatedClip = result.current.timeline?.clips[0];
      expect(updatedClip?.end).toBeGreaterThanOrEqual(0.1);
    });

    it('should normalize negative timeline position', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip = createMockClip({ id: 'clip-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip);
        result.current.updateClip('clip-1', { timelinePosition: -5 });
      });

      expect(result.current.timeline?.clips[0]?.timelinePosition).toBe(0);
    });

    it('should handle invalid sourceDuration', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip = createMockClip({ id: 'clip-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip);
        result.current.updateClip('clip-1', { sourceDuration: NaN });
      });

      expect(result.current.timeline?.clips[0]?.sourceDuration).toBeNull();
    });

    it('should clamp start/end within sourceDuration', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      const clip = createMockClip({
        id: 'clip-1',
        start: 0,
        end: 10,
        sourceDuration: 10,
      });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip);
        result.current.updateClip('clip-1', { start: 15, end: 20 }); // Beyond sourceDuration
      });

      const updatedClip = result.current.timeline?.clips[0];
      expect(updatedClip?.start).toBeLessThanOrEqual(10);
      expect(updatedClip?.end).toBeLessThanOrEqual(10);
    });
  });

  describe('History Management', () => {
    it('should limit history to max size', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();

      act(() => {
        result.current.setTimeline(mockTimeline);

        // Add 51 clips to exceed MAX_HISTORY (50)
        for (let i = 0; i < 51; i++) {
          result.current.addClip(createMockClip({ id: `clip-${i}` }));
        }
      });

      expect(result.current.history.length).toBeLessThanOrEqual(50);
    });

    it('should clear redo history when new action is performed', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(createMockClip({ id: 'clip-1' }));
        result.current.addClip(createMockClip({ id: 'clip-2' }));
        result.current.undo();
      });

      expect(result.current.canRedo()).toBe(true);

      act(() => {
        result.current.addClip(createMockClip({ id: 'clip-3' }));
      });

      expect(result.current.canRedo()).toBe(false);
    });
  });
});
