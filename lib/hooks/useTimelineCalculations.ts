/**
 * useTimelineCalculations Hook
 *
 * Computes timeline metrics:
 * - Total duration (from clips and text overlays)
 * - Number of tracks needed
 * - Visible clips (virtualized rendering optimization)
 */
'use client';

import { useMemo } from 'react';
import type { Timeline, Clip } from '@/types/timeline';
import { TIMELINE_CONSTANTS } from '@/lib/constants/ui';

const { MIN_TRACKS } = TIMELINE_CONSTANTS;

type UseTimelineCalculationsOptions = {
  timeline: Timeline | null;
  forcedTrackCount: number | null;
  scrollLeft: number;
  viewportWidth: number;
  zoom: number;
};

export function useTimelineCalculations({
  timeline,
  forcedTrackCount,
  scrollLeft,
  viewportWidth,
  zoom,
}: UseTimelineCalculationsOptions) {
  // Calculate timeline duration
  const timelineDuration = useMemo(() => {
    const textOverlays = timeline?.textOverlays ?? [];
    const clipEndTimes = timeline?.clips.length
      ? timeline.clips.map((c) => c.timelinePosition + (c.end - c.start))
      : [];
    const overlayEndTimes = textOverlays.length
      ? textOverlays.map((o) => o.timelinePosition + o.duration)
      : [];
    const allEndTimes = [...clipEndTimes, ...overlayEndTimes];
    return allEndTimes.length ? Math.max(...allEndTimes, 30) : 30;
  }, [timeline]);

  // Calculate number of tracks
  const numTracks = useMemo(() => {
    const maxTrack = timeline?.clips.length
      ? Math.max(...timeline.clips.map((c) => c.trackIndex), MIN_TRACKS - 1)
      : MIN_TRACKS - 1;
    return Math.max(maxTrack + 1, MIN_TRACKS, forcedTrackCount ?? 0);
  }, [timeline, forcedTrackCount]);

  // Virtualized clip rendering (only visible clips + overscan)
  const visibleClips = useMemo<Clip[]>(() => {
    if (!timeline?.clips.length) return [];

    const overscan = 500; // pixels outside viewport to render
    const viewportStartTime = (scrollLeft - overscan) / zoom;
    const viewportEndTime = (scrollLeft + viewportWidth + overscan) / zoom;

    return timeline.clips.filter((clip) => {
      const clipStart = clip.timelinePosition;
      const clipEnd = clipStart + (clip.end - clip.start);
      return clipEnd >= viewportStartTime && clipStart <= viewportEndTime;
    });
  }, [timeline?.clips, scrollLeft, viewportWidth, zoom]);

  return {
    timelineDuration,
    numTracks,
    visibleClips,
  };
}
