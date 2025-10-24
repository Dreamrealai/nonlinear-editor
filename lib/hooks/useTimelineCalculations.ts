/**
 * useTimelineCalculations Hook
 *
 * Computes timeline metrics:
 * - Total duration (from clips and text overlays)
 * - Number of tracks needed
 * - Visible clips (virtualized rendering optimization)
 */
'use client';

import { useMemo, useState, useEffect } from 'react';
import type { Timeline, Clip } from '@/types/timeline';
import { TIMELINE_CONSTANTS } from '@/lib/constants/ui';
import { browserLogger } from '@/lib/browserLogger';

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
  const [calculationError, setCalculationError] = useState<string | null>(null);

  // Calculate timeline duration
  const timelineDuration = useMemo(() => {
    try {
      setCalculationError(null);
      const textOverlays = timeline?.textOverlays ?? [];
      const clipEndTimes = timeline?.clips.length
        ? timeline.clips.map((c) => c.timelinePosition + (c.end - c.start))
        : [];
      const overlayEndTimes = textOverlays.length
        ? textOverlays.map((o) => o.timelinePosition + o.duration)
        : [];
      const allEndTimes = [...clipEndTimes, ...overlayEndTimes];
      return allEndTimes.length ? Math.max(...allEndTimes, 30) : 30;
    } catch (error) {
      browserLogger.error({ error, timeline }, 'Failed to calculate timeline duration');
      setCalculationError('Failed to calculate timeline duration');
      return 30; // Default fallback
    }
  }, [timeline]);

  // Calculate number of tracks
  const numTracks = useMemo(() => {
    try {
      const maxTrack = timeline?.clips.length
        ? Math.max(...timeline.clips.map((c) => c.trackIndex), MIN_TRACKS - 1)
        : MIN_TRACKS - 1;
      return Math.max(maxTrack + 1, MIN_TRACKS, forcedTrackCount ?? 0);
    } catch (error) {
      browserLogger.error({ error, timeline }, 'Failed to calculate number of tracks');
      setCalculationError('Failed to calculate number of tracks');
      return MIN_TRACKS; // Default fallback
    }
  }, [timeline, forcedTrackCount]);

  // Virtualized clip rendering (only visible clips + overscan)
  const visibleClips = useMemo<Clip[]>(() => {
    try {
      if (!timeline?.clips.length) return [];

      const overscan = 500; // pixels outside viewport to render
      const viewportStartTime = (scrollLeft - overscan) / zoom;
      const viewportEndTime = (scrollLeft + viewportWidth + overscan) / zoom;

      return timeline.clips.filter((clip) => {
        const clipStart = clip.timelinePosition;
        const clipEnd = clipStart + (clip.end - clip.start);
        return clipEnd >= viewportStartTime && clipStart <= viewportEndTime;
      });
    } catch (error) {
      browserLogger.error({ error, timeline, scrollLeft, zoom }, 'Failed to calculate visible clips');
      setCalculationError('Failed to calculate visible clips');
      return [];
    }
  }, [timeline?.clips, scrollLeft, viewportWidth, zoom]);

  // Clear errors when timeline changes
  useEffect(() => {
    setCalculationError(null);
  }, [timeline]);

  return {
    timelineDuration,
    numTracks,
    visibleClips,
    calculationError,
  };
}
