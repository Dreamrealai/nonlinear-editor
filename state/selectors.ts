/**
 * Optimized Zustand Store Selectors
 *
 * Provides memoized selectors for better performance when accessing store state.
 * Using selectors prevents unnecessary re-renders by ensuring shallow equality checks.
 */

import { useTimelineStore } from './useTimelineStore';
import { useEditorStore } from './useEditorStore';
import { usePlaybackStore } from './usePlaybackStore';
import type { Clip } from '@/types/timeline';

/**
 * Timeline Selectors
 * These selectors extract specific parts of the timeline state,
 * preventing re-renders when unrelated timeline data changes.
 */

// Get all clips (memoized by zustand)
export const useClips = () => useTimelineStore((state) => state.timeline?.clips ?? []);

// Get a specific clip by ID (more efficient than filtering in component)
export const useClip = (clipId: string) =>
  useTimelineStore((state) => state.timeline?.clips.find((c) => c.id === clipId) ?? null);

// Get timeline duration (computed value)
export const useTimelineDuration = () =>
  useTimelineStore((state) => {
    if (!state.timeline?.clips.length) return 0;
    return Math.max(...state.timeline.clips.map((c) => c.timelinePosition + (c.end - c.start)));
  });

// Get markers
export const useMarkers = () => useTimelineStore((state) => state.timeline?.markers ?? []);

// Get text overlays
export const useTextOverlays = () =>
  useTimelineStore((state) => state.timeline?.textOverlays ?? []);

// Get tracks
export const useTracks = () => useTimelineStore((state) => state.timeline?.tracks ?? []);

// Get timeline reference (use sparingly, causes re-renders on any timeline change)
export const useTimeline = () => useTimelineStore((state) => state.timeline);

/**
 * Editor Selectors
 */

// Get selected clip IDs only (doesn't re-render when other editor state changes)
export const useSelectedClipIds = () => useEditorStore((state) => state.selectedClipIds);

// Get zoom level
export const useZoomLevel = () => useEditorStore((state) => state.zoom);

// Scroll position is managed locally in timeline components

/**
 * Playback Selectors
 */

// Get playback state
export const useIsPlaying = () => usePlaybackStore((state) => state.isPlaying);

// Get current time
export const useCurrentTime = () => usePlaybackStore((state) => state.currentTime);

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
  useTimelineStore((state) => {
    const selectedIds = useEditorStore.getState().selectedClipIds;
    return state.timeline?.clips.filter((c) => selectedIds.has(c.id)) ?? [];
  });

/**
 * Action Selectors
 * Extract just the actions you need to avoid re-renders
 */

// Timeline actions
export const useTimelineActions = () =>
  useTimelineStore((state) => ({
    addClip: state.addClip,
    updateClip: state.updateClip,
    removeClip: state.removeClip,
    setTimeline: state.setTimeline,
  }));

// Playback actions
export const usePlaybackActions = () =>
  usePlaybackStore((state) => ({
    play: state.play,
    pause: state.pause,
    setCurrentTime: state.setCurrentTime,
  }));

// Editor actions are in /state/useEditorActions.ts (high-level actions with history)
