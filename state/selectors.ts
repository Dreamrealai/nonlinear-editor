/**
 * Optimized Zustand Store Selectors
 *
 * Provides memoized selectors for better performance when accessing store state.
 * Using selectors prevents unnecessary re-renders by ensuring shallow equality checks.
 */

import { useTimelineStore } from './useTimelineStore';
import { useEditorStore } from './useEditorStore';
import { usePlaybackStore } from './usePlaybackStore';
import type { Clip, Marker, TextOverlay, Track, Timeline } from '@/types/timeline';

/**
 * Timeline Selectors
 * These selectors extract specific parts of the timeline state,
 * preventing re-renders when unrelated timeline data changes.
 */

// Get all clips (memoized by zustand)
export const useClips = (): Clip[] =>
  useTimelineStore((state): Clip[] => state.timeline?.clips ?? []);

// Get a specific clip by ID (more efficient than filtering in component)
export const useClip = (clipId: string): Clip | null =>
  useTimelineStore(
    (state): Clip | null => state.timeline?.clips.find((c): boolean => c.id === clipId) ?? null
  );

// Get timeline duration (computed value)
export const useTimelineDuration = (): number =>
  useTimelineStore((state): number => {
    if (!state.timeline?.clips.length) return 0;
    return Math.max(
      ...state.timeline.clips.map((c): number => c.timelinePosition + (c.end - c.start))
    );
  });

// Get markers
export const useMarkers = (): Marker[] =>
  useTimelineStore((state): Marker[] => state.timeline?.markers ?? []);

// Get text overlays
export const useTextOverlays = (): TextOverlay[] =>
  useTimelineStore((state): TextOverlay[] => state.timeline?.textOverlays ?? []);

// Get tracks
export const useTracks = (): Track[] =>
  useTimelineStore((state): Track[] => state.timeline?.tracks ?? []);

// Get timeline reference (use sparingly, causes re-renders on any timeline change)
export const useTimeline = (): Timeline | null =>
  useTimelineStore((state): Timeline | null => state.timeline);

/**
 * Editor Selectors
 */

// Get selected clip IDs only (doesn't re-render when other editor state changes)
export const useSelectedClipIds = (): Set<string> =>
  useEditorStore((state): Set<string> => state.selectedClipIds);

// Get zoom level
export const useZoomLevel = (): number => useEditorStore((state): number => state.zoom);

// Scroll position is managed locally in timeline components

/**
 * Playback Selectors
 */

// Get playback state
export const useIsPlaying = (): boolean => usePlaybackStore((state): boolean => state.isPlaying);

// Get current time
export const useCurrentTime = (): number => usePlaybackStore((state): number => state.currentTime);

// Playback rate is managed locally in player components

/**
 * Selection Selectors
 */

// Selection is managed through selectedClipIds in EditorStore
// These selectors have been deprecated

/**
 * Composite Selectors
 * These selectors combine data from multiple stores efficiently
 */

// Get selected clips with full data (only re-renders when selected clips change)
export const useSelectedClips = (): Clip[] =>
  useTimelineStore((state): Clip[] => {
    const selectedIds = useEditorStore.getState().selectedClipIds;
    return state.timeline?.clips.filter((c): boolean => selectedIds.has(c.id)) ?? [];
  });

/**
 * Action Selectors
 * Extract just the actions you need to avoid re-renders
 */

// Timeline actions
export const useTimelineActions = (): {
  addClip: (clip: Clip) => void;
  updateClip: (id: string, patch: Partial<Clip>) => void;
  removeClip: (id: string) => void;
  setTimeline: (timeline: Timeline | null) => void;
} =>
  useTimelineStore(
    (
      state
    ): {
      addClip: (clip: Clip) => void;
      updateClip: (id: string, patch: Partial<Clip>) => void;
      removeClip: (id: string) => void;
      setTimeline: (timeline: Timeline | null) => void;
    } => ({
      addClip: state.addClip,
      updateClip: state.updateClip,
      removeClip: state.removeClip,
      setTimeline: state.setTimeline,
    })
  );

// Playback actions
export const usePlaybackActions = (): {
  play: () => void;
  pause: () => void;
  setCurrentTime: (time: number) => void;
} =>
  usePlaybackStore(
    (state): { play: () => void; pause: () => void; setCurrentTime: (time: number) => void } => ({
      play: state.play,
      pause: state.pause,
      setCurrentTime: state.setCurrentTime,
    })
  );

// Editor actions are in /state/useEditorActions.ts (high-level actions with history)
