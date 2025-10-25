/**
 * Test Suite: Tracks Slice
 *
 * Tests track management operations including:
 * - Updating track properties
 * - Auto-creating tracks
 * - Track type handling
 */

import { renderHook, act } from '@testing-library/react';
import { useEditorStore } from '@/state/useEditorStore';
import type { Timeline } from '@/types/timeline';

describe('Tracks Slice', () => {
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

  beforeEach((): void => {
    const { result } = renderHook(() => useEditorStore());
    act(() => {
      result.current.setTimeline(null);
    });
  });

  describe('updateTrack', () => {
    it('should create track if it does not exist', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.updateTrack(0, { name: 'New Track' });
      });

      expect(result.current.timeline?.tracks).toHaveLength(1);
      expect(result.current.timeline?.tracks?.[0]?.name).toBe('New Track');
      expect(result.current.timeline?.tracks?.[0]?.index).toBe(0);
    });

    it('should update existing track', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.updateTrack(0, { name: 'Track One' });
        result.current.updateTrack(0, { name: 'Track One Updated' });
      });

      expect(result.current.timeline?.tracks).toHaveLength(1);
      expect(result.current.timeline?.tracks?.[0]?.name).toBe('Track One Updated');
    });

    it('should create multiple tracks at different indices', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.updateTrack(0, { name: 'Track 0' });
        result.current.updateTrack(2, { name: 'Track 2' });
        result.current.updateTrack(1, { name: 'Track 1' });
      });

      expect(result.current.timeline?.tracks).toHaveLength(3);
    });

    it('should set default track type to video', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.updateTrack(0, { name: 'New Track' });
      });

      expect(result.current.timeline?.tracks?.[0]?.type).toBe('video');
    });

    it('should update track type', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.updateTrack(0, { type: 'audio' });
      });

      expect(result.current.timeline?.tracks?.[0]?.type).toBe('audio');
    });

    it('should generate default track name from index', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.updateTrack(5, {});
      });

      expect(result.current.timeline?.tracks?.[0]?.name).toBe('Track 6');
    });

    it('should not update if timeline is null', () => {
      const { result } = renderHook(() => useEditorStore());

      act(() => {
        result.current.updateTrack(0, { name: 'Test' });
      });

      expect(result.current.timeline).toBeNull();
    });

    it('should initialize tracks array if undefined', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();
      delete mockTimeline.tracks;

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.updateTrack(0, { name: 'New Track' });
      });

      expect(result.current.timeline?.tracks).toBeDefined();
      expect(result.current.timeline?.tracks).toHaveLength(1);
    });

    it('should update multiple properties at once', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.updateTrack(0, {
          name: 'Audio Track',
          type: 'audio',
        });
      });

      const track = result.current.timeline?.tracks?.[0];
      expect(track?.name).toBe('Audio Track');
      expect(track?.type).toBe('audio');
    });

    it('should find track by index correctly', () => {
      const { result } = renderHook(() => useEditorStore());
      const mockTimeline = createMockTimeline();

      act(() => {
        result.current.setTimeline(mockTimeline);
        result.current.updateTrack(0, { name: 'Track 0' });
        result.current.updateTrack(5, { name: 'Track 5' });
        result.current.updateTrack(5, { name: 'Track 5 Updated' });
      });

      const tracks = result.current.timeline?.tracks ?? [];
      const track5 = tracks.find((t) => t.index === 5);
      expect(track5?.name).toBe('Track 5 Updated');
    });
  });
});
