import { renderHook, act } from '@testing-library/react';
import { useTimelineStore } from '@/state/useTimelineStore';
import type { Timeline, Clip, Marker, TextOverlay, TransitionType } from '@/types/timeline';
import { CLIP_CONSTANTS } from '@/lib/constants';

const { MIN_CLIP_DURATION } = CLIP_CONSTANTS;

describe('useTimelineStore', () => {
  // Clear store and mocks after each test
  afterEach((): void => {
    // Reset the store to initial state
    const { result } = renderHook(() => useTimelineStore());
    act(() => {
      result.current.setTimeline(null);
    });
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  afterAll((): void => {
    jest.restoreAllMocks();
  });

  // Helper to create a mock timeline
  const createMockTimeline = (overrides?: Partial<Timeline>): Timeline => ({
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
    // Reset store before each test
    const { result } = renderHook(() => useTimelineStore());
    act(() => {
      result.current.setTimeline(null);
    });
  });

  describe('Initial State', () => {
    it('should initialize with null timeline', () => {
      const { result } = renderHook(() => useTimelineStore());
      expect(result.current.timeline).toBeNull();
    });
  });

  describe('Timeline Management', () => {
    it('should set timeline', () => {
      const { result } = renderHook(() => useTimelineStore());
      const mockTimeline = createMockTimeline();

      act(() => {
        result.current.setTimeline(mockTimeline);
      });

      expect(result.current.timeline).toEqual(mockTimeline);
    });

    it('should get timeline', () => {
      const { result } = renderHook(() => useTimelineStore());
      const mockTimeline = createMockTimeline();

      act(() => {
        result.current.setTimeline(mockTimeline);
      });

      const timeline = result.current.getTimeline();
      expect(timeline).toEqual(mockTimeline);
    });

    it('should clear timeline when set to null', () => {
      const { result } = renderHook(() => useTimelineStore());
      const mockTimeline = createMockTimeline();

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.setTimeline(null);
      });

      expect(result.current.timeline).toBeNull();
    });

    it('should deduplicate clips when setting timeline', () => {
      const { result } = renderHook(() => useTimelineStore());
      const duplicateClip = createMockClip({ id: 'duplicate-clip' });
      const mockTimeline = createMockTimeline({
        clips: [duplicateClip, duplicateClip], // Same clip twice
      });

      act(() => {
        result.current.setTimeline(mockTimeline);
      });

      expect(result.current.timeline?.clips).toHaveLength(1);
    });
  });

  describe('Clip Management - Add', () => {
    it('should add clip to timeline', () => {
      const { result } = renderHook(() => useTimelineStore());
      const mockTimeline = createMockTimeline();
      const mockClip = createMockClip({ id: 'clip-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(mockClip);
      });

      expect(result.current.timeline?.clips).toHaveLength(1);
      expect(result.current.timeline?.clips[0]).toEqual(mockClip);
    });

    it('should not add clip if timeline is null', () => {
      const { result } = renderHook(() => useTimelineStore());
      const mockClip = createMockClip();

      act(() => {
        result.current.addClip(mockClip);
      });

      expect(result.current.timeline).toBeNull();
    });

    it('should deduplicate clips when adding', () => {
      const { result } = renderHook(() => useTimelineStore());
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

    it('should add multiple clips with different IDs', () => {
      const { result } = renderHook(() => useTimelineStore());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1' });
      const clip2 = createMockClip({ id: 'clip-2' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip1);
        result.current.addClip(clip2);
      });

      expect(result.current.timeline?.clips).toHaveLength(2);
    });
  });

  describe('Clip Management - Update', () => {
    it('should update clip properties', () => {
      const { result } = renderHook(() => useTimelineStore());
      const mockTimeline = createMockTimeline();
      const mockClip = createMockClip({ id: 'clip-1', timelinePosition: 0 });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(mockClip);
        result.current.updateClip('clip-1', { timelinePosition: 5 });
      });

      expect(result.current.timeline?.clips[0]?.timelinePosition).toBe(5);
    });

    it('should not update if clip does not exist', () => {
      const { result } = renderHook(() => useTimelineStore());
      const mockTimeline = createMockTimeline();
      const mockClip = createMockClip({ id: 'clip-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(mockClip);
        result.current.updateClip('non-existent', { timelinePosition: 10 });
      });

      expect(result.current.timeline?.clips[0]?.timelinePosition).toBe(0);
    });

    it('should enforce minimum clip duration', () => {
      const { result } = renderHook(() => useTimelineStore());
      const mockTimeline = createMockTimeline();
      const mockClip = createMockClip({ id: 'clip-1', start: 0, end: 10 });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(mockClip);
        result.current.updateClip('clip-1', { end: 0.05 }); // Too short
      });

      const duration =
        result.current.timeline?.clips[0]!.end - result.current.timeline?.clips[0]!.start;
      expect(duration).toBeGreaterThanOrEqual(MIN_CLIP_DURATION);
    });

    it('should normalize negative timeline position to 0', () => {
      const { result } = renderHook(() => useTimelineStore());
      const mockTimeline = createMockTimeline();
      const mockClip = createMockClip({ id: 'clip-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(mockClip);
        result.current.updateClip('clip-1', { timelinePosition: -10 });
      });

      expect(result.current.timeline?.clips[0]?.timelinePosition).toBe(0);
    });

    it('should normalize negative start to 0', () => {
      const { result } = renderHook(() => useTimelineStore());
      const mockTimeline = createMockTimeline();
      const mockClip = createMockClip({ id: 'clip-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(mockClip);
        result.current.updateClip('clip-1', { start: -5 });
      });

      expect(result.current.timeline?.clips[0]?.start).toBe(0);
    });

    it('should handle invalid sourceDuration and set to null', () => {
      const { result } = renderHook(() => useTimelineStore());
      const mockTimeline = createMockTimeline();
      const mockClip = createMockClip({ id: 'clip-1', sourceDuration: 10 });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(mockClip);
        result.current.updateClip('clip-1', { sourceDuration: NaN });
      });

      expect(result.current.timeline?.clips[0]?.sourceDuration).toBeNull();
    });

    it('should normalize sourceDuration to minimum clip duration', () => {
      const { result } = renderHook(() => useTimelineStore());
      const mockTimeline = createMockTimeline();
      const mockClip = createMockClip({ id: 'clip-1', sourceDuration: 10 });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(mockClip);
        result.current.updateClip('clip-1', { sourceDuration: 0.05 }); // Too short
      });

      expect(result.current.timeline?.clips[0]?.sourceDuration).toBe(MIN_CLIP_DURATION);
    });

    it('should clamp start within sourceDuration bounds', () => {
      const { result } = renderHook(() => useTimelineStore());
      const mockTimeline = createMockTimeline();
      const mockClip = createMockClip({
        id: 'clip-1',
        start: 0,
        end: 5,
        sourceDuration: 10,
      });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(mockClip);
        result.current.updateClip('clip-1', { start: 15 }); // Beyond sourceDuration
      });

      expect(result.current.timeline?.clips[0]?.start).toBeLessThanOrEqual(10);
    });

    it('should clamp end within sourceDuration bounds', () => {
      const { result } = renderHook(() => useTimelineStore());
      const mockTimeline = createMockTimeline();
      const mockClip = createMockClip({
        id: 'clip-1',
        start: 0,
        end: 5,
        sourceDuration: 10,
      });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(mockClip);
        result.current.updateClip('clip-1', { end: 20 }); // Beyond sourceDuration
      });

      expect(result.current.timeline?.clips[0]?.end).toBeLessThanOrEqual(10);
    });

    it('should adjust start if end-start is less than minimum duration', () => {
      const { result } = renderHook(() => useTimelineStore());
      const mockTimeline = createMockTimeline();
      const mockClip = createMockClip({
        id: 'clip-1',
        start: 0,
        end: 10,
        sourceDuration: 10,
      });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(mockClip);
        result.current.updateClip('clip-1', { end: 9.95 }); // Too close to source duration
      });

      const clip = result.current.timeline?.clips[0];
      expect(clip!.end - clip!.start).toBeGreaterThanOrEqual(MIN_CLIP_DURATION);
    });

    it('should deduplicate clips after update', () => {
      const { result } = renderHook(() => useTimelineStore());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1' });
      const clip2 = createMockClip({ id: 'clip-2' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip1);
        result.current.addClip(clip2);
        result.current.updateClip('clip-1', { timelinePosition: 5 });
      });

      expect(result.current.timeline?.clips).toHaveLength(2);
    });
  });

  describe('Clip Management - Remove', () => {
    it('should remove clip from timeline', () => {
      const { result } = renderHook(() => useTimelineStore());
      const mockTimeline = createMockTimeline();
      const mockClip = createMockClip({ id: 'clip-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(mockClip);
        result.current.removeClip('clip-1');
      });

      expect(result.current.timeline?.clips).toHaveLength(0);
    });

    it('should not remove if timeline is null', () => {
      const { result } = renderHook(() => useTimelineStore());

      act(() => {
        result.current.removeClip('clip-1');
      });

      expect(result.current.timeline).toBeNull();
    });

    it('should not error if clip does not exist', () => {
      const { result } = renderHook(() => useTimelineStore());
      const mockTimeline = createMockTimeline();
      const mockClip = createMockClip({ id: 'clip-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(mockClip);
        result.current.removeClip('non-existent');
      });

      expect(result.current.timeline?.clips).toHaveLength(1);
    });

    it('should deduplicate clips after removal', () => {
      const { result } = renderHook(() => useTimelineStore());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1' });
      const clip2 = createMockClip({ id: 'clip-2' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip1);
        result.current.addClip(clip2);
        result.current.removeClip('clip-1');
      });

      expect(result.current.timeline?.clips).toHaveLength(1);
      expect(result.current.timeline?.clips[0]?.id).toBe('clip-2');
    });
  });

  describe('Clip Management - Reorder', () => {
    it('should reorder clips', () => {
      const { result } = renderHook(() => useTimelineStore());
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

    it('should not reorder if timeline is null', () => {
      const { result } = renderHook(() => useTimelineStore());

      act(() => {
        result.current.reorderClips(['clip-1', 'clip-2']);
      });

      expect(result.current.timeline).toBeNull();
    });

    it('should filter out non-existent clip IDs during reorder', () => {
      const { result } = renderHook(() => useTimelineStore());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1' });
      const clip2 = createMockClip({ id: 'clip-2' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip1);
        result.current.addClip(clip2);
        result.current.reorderClips(['clip-2', 'non-existent', 'clip-1']);
      });

      expect(result.current.timeline?.clips).toHaveLength(2);
      expect(result.current.timeline?.clips[0]?.id).toBe('clip-2');
      expect(result.current.timeline?.clips[1]?.id).toBe('clip-1');
    });

    it('should deduplicate clips after reorder', () => {
      const { result } = renderHook(() => useTimelineStore());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1' });
      const clip2 = createMockClip({ id: 'clip-2' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip1);
        result.current.addClip(clip2);
        result.current.reorderClips(['clip-2', 'clip-1']);
      });

      expect(result.current.timeline?.clips).toHaveLength(2);
    });
  });

  describe('Clip Splitting', () => {
    it('should split clip at time', () => {
      const { result } = renderHook(() => useTimelineStore());
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

    it('should not split if timeline is null', () => {
      const { result } = renderHook(() => useTimelineStore());

      act(() => {
        result.current.splitClipAtTime('clip-1', 5);
      });

      expect(result.current.timeline).toBeNull();
    });

    it('should not split if clip does not exist', () => {
      const { result } = renderHook(() => useTimelineStore());
      const mockTimeline = createMockTimeline();
      const clip = createMockClip({ id: 'clip-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip);
        result.current.splitClipAtTime('non-existent', 5);
      });

      expect(result.current.timeline?.clips).toHaveLength(1);
    });

    it('should not split if time is before clip start', () => {
      const { result } = renderHook(() => useTimelineStore());
      const mockTimeline = createMockTimeline();
      const clip = createMockClip({
        id: 'clip-1',
        start: 0,
        end: 10,
        timelinePosition: 5,
        sourceDuration: 10,
      });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip);
        result.current.splitClipAtTime('clip-1', 3); // Before clip starts on timeline
      });

      expect(result.current.timeline?.clips).toHaveLength(1);
    });

    it('should not split if time is after clip end', () => {
      const { result } = renderHook(() => useTimelineStore());
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
        result.current.splitClipAtTime('clip-1', 15); // After clip ends
      });

      expect(result.current.timeline?.clips).toHaveLength(1);
    });

    it('should not split if resulting clips would be too short', () => {
      const { result } = renderHook(() => useTimelineStore());
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

    it('should set transitionToNext to none on first clip after split', () => {
      const { result } = renderHook(() => useTimelineStore());
      const mockTimeline = createMockTimeline();
      const clip = createMockClip({
        id: 'clip-1',
        start: 0,
        end: 10,
        timelinePosition: 0,
        sourceDuration: 10,
        transitionToNext: { type: 'fade', duration: 1 },
      });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip);
        result.current.splitClipAtTime('clip-1', 5);
      });

      expect(result.current.timeline?.clips[0]?.transitionToNext).toEqual({
        type: 'none',
        duration: 0,
      });
    });

    it('should generate unique ID for split clip', () => {
      const { result } = renderHook(() => useTimelineStore());
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

      expect(result.current.timeline?.clips[0]?.id).toBe('clip-1');
      expect(result.current.timeline?.clips[1]?.id).toContain('clip-1-split-');
    });

    it('should preserve other clip properties when splitting', () => {
      const { result } = renderHook(() => useTimelineStore());
      const mockTimeline = createMockTimeline();
      const clip = createMockClip({
        id: 'clip-1',
        start: 0,
        end: 10,
        timelinePosition: 0,
        sourceDuration: 10,
        assetId: 'asset-123',
        filePath: '/test/video.mp4',
        trackIndex: 2,
      });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip);
        result.current.splitClipAtTime('clip-1', 5);
      });

      const secondClip = result.current.timeline?.clips[1];
      expect(secondClip?.assetId).toBe('asset-123');
      expect(secondClip?.filePath).toBe('/test/video.mp4');
      expect(secondClip?.trackIndex).toBe(2);
    });
  });

  describe('Marker Management', () => {
    it('should add marker to timeline', () => {
      const { result } = renderHook(() => useTimelineStore());
      const mockTimeline = createMockTimeline();
      const marker = createMockMarker({ id: 'marker-1', time: 5, label: 'Test' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addMarker(marker);
      });

      expect(result.current.timeline?.markers).toHaveLength(1);
      expect(result.current.timeline?.markers?.[0]).toEqual(marker);
    });

    it('should not add marker if timeline is null', () => {
      const { result } = renderHook(() => useTimelineStore());
      const marker = createMockMarker();

      act(() => {
        result.current.addMarker(marker);
      });

      expect(result.current.timeline).toBeNull();
    });

    it('should initialize markers array if undefined', () => {
      const { result } = renderHook(() => useTimelineStore());
      const mockTimeline = createMockTimeline();
      const marker = createMockMarker();

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addMarker(marker);
      });

      expect(Array.isArray(result.current.timeline?.markers)).toBe(true);
    });

    it('should remove marker from timeline', () => {
      const { result } = renderHook(() => useTimelineStore());
      const mockTimeline = createMockTimeline();
      const marker = createMockMarker({ id: 'marker-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addMarker(marker);
        result.current.removeMarker('marker-1');
      });

      expect(result.current.timeline?.markers).toHaveLength(0);
    });

    it('should not error when removing non-existent marker', () => {
      const { result } = renderHook(() => useTimelineStore());
      const mockTimeline = createMockTimeline();
      const marker = createMockMarker({ id: 'marker-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addMarker(marker);
        result.current.removeMarker('non-existent');
      });

      expect(result.current.timeline?.markers).toHaveLength(1);
    });

    it('should update marker properties', () => {
      const { result } = renderHook(() => useTimelineStore());
      const mockTimeline = createMockTimeline();
      const marker = createMockMarker({ id: 'marker-1', label: 'Original' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addMarker(marker);
        result.current.updateMarker('marker-1', { label: 'Updated' });
      });

      expect(result.current.timeline?.markers?.[0]?.label).toBe('Updated');
    });

    it('should not update if marker does not exist', () => {
      const { result } = renderHook(() => useTimelineStore());
      const mockTimeline = createMockTimeline();
      const marker = createMockMarker({ id: 'marker-1', label: 'Original' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addMarker(marker);
        result.current.updateMarker('non-existent', { label: 'Updated' });
      });

      expect(result.current.timeline?.markers?.[0]?.label).toBe('Original');
    });

    it('should add multiple markers', () => {
      const { result } = renderHook(() => useTimelineStore());
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
  });

  describe('Track Management', () => {
    it('should create track if it does not exist', () => {
      const { result } = renderHook(() => useTimelineStore());
      const mockTimeline = createMockTimeline();

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.updateTrack(0, { name: 'Video Track' });
      });

      expect(result.current.timeline?.tracks).toHaveLength(1);
      expect(result.current.timeline?.tracks?.[0]?.name).toBe('Video Track');
      expect(result.current.timeline?.tracks?.[0]?.index).toBe(0);
    });

    it('should update existing track', () => {
      const { result } = renderHook(() => useTimelineStore());
      const mockTimeline = createMockTimeline({
        tracks: [
          {
            id: 'track-0',
            index: 0,
            name: 'Track 1',
            type: 'video',
          },
        ],
      });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.updateTrack(0, { name: 'Updated Track' });
      });

      expect(result.current.timeline?.tracks?.[0]?.name).toBe('Updated Track');
    });

    it('should not update if timeline is null', () => {
      const { result } = renderHook(() => useTimelineStore());

      act(() => {
        result.current.updateTrack(0, { name: 'Test' });
      });

      expect(result.current.timeline).toBeNull();
    });

    it('should initialize tracks array if undefined', () => {
      const { result } = renderHook(() => useTimelineStore());
      const mockTimeline = createMockTimeline();

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.updateTrack(0, { name: 'Track 1' });
      });

      expect(Array.isArray(result.current.timeline?.tracks)).toBe(true);
    });

    it('should set default track properties when creating new track', () => {
      const { result } = renderHook(() => useTimelineStore());
      const mockTimeline = createMockTimeline();

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.updateTrack(2, {});
      });

      const track = result.current.timeline?.tracks?.[0];
      expect(track?.id).toBe('track-2');
      expect(track?.index).toBe(2);
      expect(track?.name).toBe('Track 3'); // index + 1
      expect(track?.type).toBe('video');
    });

    it('should manage multiple tracks', () => {
      const { result } = renderHook(() => useTimelineStore());
      const mockTimeline = createMockTimeline();

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.updateTrack(0, { name: 'Track 1' });
        result.current.updateTrack(1, { name: 'Track 2' });
      });

      expect(result.current.timeline?.tracks).toHaveLength(2);
    });
  });

  describe('Text Overlay Management', () => {
    it('should add text overlay to timeline', () => {
      const { result } = renderHook(() => useTimelineStore());
      const mockTimeline = createMockTimeline();
      const textOverlay = createMockTextOverlay({ id: 'text-1', text: 'Hello' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addTextOverlay(textOverlay);
      });

      expect(result.current.timeline?.textOverlays).toHaveLength(1);
      expect(result.current.timeline?.textOverlays?.[0]).toEqual(textOverlay);
    });

    it('should not add text overlay if timeline is null', () => {
      const { result } = renderHook(() => useTimelineStore());
      const textOverlay = createMockTextOverlay();

      act(() => {
        result.current.addTextOverlay(textOverlay);
      });

      expect(result.current.timeline).toBeNull();
    });

    it('should initialize textOverlays array if undefined', () => {
      const { result } = renderHook(() => useTimelineStore());
      const mockTimeline = createMockTimeline();
      const textOverlay = createMockTextOverlay();

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addTextOverlay(textOverlay);
      });

      expect(Array.isArray(result.current.timeline?.textOverlays)).toBe(true);
    });

    it('should remove text overlay from timeline', () => {
      const { result } = renderHook(() => useTimelineStore());
      const mockTimeline = createMockTimeline();
      const textOverlay = createMockTextOverlay({ id: 'text-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addTextOverlay(textOverlay);
        result.current.removeTextOverlay('text-1');
      });

      expect(result.current.timeline?.textOverlays).toHaveLength(0);
    });

    it('should not error when removing non-existent text overlay', () => {
      const { result } = renderHook(() => useTimelineStore());
      const mockTimeline = createMockTimeline();
      const textOverlay = createMockTextOverlay({ id: 'text-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addTextOverlay(textOverlay);
        result.current.removeTextOverlay('non-existent');
      });

      expect(result.current.timeline?.textOverlays).toHaveLength(1);
    });

    it('should update text overlay properties', () => {
      const { result } = renderHook(() => useTimelineStore());
      const mockTimeline = createMockTimeline();
      const textOverlay = createMockTextOverlay({ id: 'text-1', text: 'Original' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addTextOverlay(textOverlay);
        result.current.updateTextOverlay('text-1', { text: 'Updated' });
      });

      expect(result.current.timeline?.textOverlays?.[0]?.text).toBe('Updated');
    });

    it('should not update if text overlay does not exist', () => {
      const { result } = renderHook(() => useTimelineStore());
      const mockTimeline = createMockTimeline();
      const textOverlay = createMockTextOverlay({ id: 'text-1', text: 'Original' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addTextOverlay(textOverlay);
        result.current.updateTextOverlay('non-existent', { text: 'Updated' });
      });

      expect(result.current.timeline?.textOverlays?.[0]?.text).toBe('Original');
    });

    it('should add multiple text overlays', () => {
      const { result } = renderHook(() => useTimelineStore());
      const mockTimeline = createMockTimeline();
      const text1 = createMockTextOverlay({ id: 'text-1', text: 'First' });
      const text2 = createMockTextOverlay({ id: 'text-2', text: 'Second' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addTextOverlay(text1);
        result.current.addTextOverlay(text2);
      });

      expect(result.current.timeline?.textOverlays).toHaveLength(2);
    });
  });

  describe('Transition Management', () => {
    it('should add transition to single clip', () => {
      const { result } = renderHook(() => useTimelineStore());
      const mockTimeline = createMockTimeline();
      const clip = createMockClip({ id: 'clip-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip);
        result.current.addTransitionToClips(['clip-1'], 'fade', 1);
      });

      expect(result.current.timeline?.clips[0]?.transitionToNext).toEqual({
        type: 'fade',
        duration: 1,
      });
    });

    it('should add transition to multiple clips', () => {
      const { result } = renderHook(() => useTimelineStore());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1' });
      const clip2 = createMockClip({ id: 'clip-2' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip1);
        result.current.addClip(clip2);
        result.current.addTransitionToClips(['clip-1', 'clip-2'], 'dissolve', 2);
      });

      expect(result.current.timeline?.clips[0]?.transitionToNext).toEqual({
        type: 'dissolve',
        duration: 2,
      });
      expect(result.current.timeline?.clips[1]?.transitionToNext).toEqual({
        type: 'dissolve',
        duration: 2,
      });
    });

    it('should not error when adding transition to non-existent clip', () => {
      const { result } = renderHook(() => useTimelineStore());
      const mockTimeline = createMockTimeline();
      const clip = createMockClip({ id: 'clip-1' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip);
        result.current.addTransitionToClips(['non-existent'], 'fade', 1);
      });

      expect(result.current.timeline?.clips).toHaveLength(1);
    });

    it('should not add transition if timeline is null', () => {
      const { result } = renderHook(() => useTimelineStore());

      act(() => {
        result.current.addTransitionToClips(['clip-1'], 'fade', 1);
      });

      expect(result.current.timeline).toBeNull();
    });

    it('should support different transition types', () => {
      const { result } = renderHook(() => useTimelineStore());
      const mockTimeline = createMockTimeline();
      const clip1 = createMockClip({ id: 'clip-1' });
      const clip2 = createMockClip({ id: 'clip-2' });
      const clip3 = createMockClip({ id: 'clip-3' });

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.addClip(clip1);
        result.current.addClip(clip2);
        result.current.addClip(clip3);
        result.current.addTransitionToClips(['clip-1'], 'fade', 1);
        result.current.addTransitionToClips(['clip-2'], 'dissolve', 2);
        result.current.addTransitionToClips(['clip-3'], 'none', 0);
      });

      expect(result.current.timeline?.clips[0]?.transitionToNext?.type).toBe('fade');
      expect(result.current.timeline?.clips[1]?.transitionToNext?.type).toBe('dissolve');
      expect(result.current.timeline?.clips[2]?.transitionToNext?.type).toBe('none');
    });
  });
});
