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
}: UseTimelineCalculationsOptions): {
  timelineDuration: number;
  numTracks: number;
  visibleClips: Clip[];
  calculationError: string | null;
} {
  const [calculationError, setCalculationError] = useState<string | null>(null);

  // Calculate timeline duration
  const timelineDuration = useMemo((): number => {
    try {
      const textOverlays = timeline?.textOverlays ?? [];
      const clipEndTimes = timeline?.clips.length
        ? timeline.clips.map((c): number => c.timelinePosition + (c.end - c.start))
        : [];
      const overlayEndTimes = textOverlays.length
        ? textOverlays.map((o): number => o.timelinePosition + o.duration)
        : [];
      const allEndTimes = [...clipEndTimes, ...overlayEndTimes];
      return allEndTimes.length ? Math.max(...allEndTimes, 30) : 30;
    } catch (error) {
      browserLogger.error({ error, timeline }, 'Failed to calculate timeline duration');
      // NOTE: Do NOT call setCalculationError here - setState in useMemo causes infinite loops (React error #185)
      return 30; // Default fallback
    }
  }, [timeline]);

  // Calculate number of tracks
  const numTracks = useMemo((): number => {
    try {
      const maxTrack = timeline?.clips.length
        ? Math.max(...timeline.clips.map((c): number => c.trackIndex), MIN_TRACKS - 1)
        : MIN_TRACKS - 1;
      return Math.max(maxTrack + 1, MIN_TRACKS, forcedTrackCount ?? 0);
    } catch (error) {
      browserLogger.error({ error, timeline }, 'Failed to calculate number of tracks');
      // NOTE: Do NOT call setCalculationError here - setState in useMemo causes infinite loops (React error #185)
      return MIN_TRACKS; // Default fallback
    }
  }, [timeline, forcedTrackCount]);

  // Virtualized clip rendering (only visible clips + overscan)
  // Enhanced with binary search for better performance with large clip arrays
  const visibleClips = useMemo<Clip[]>((): Clip[] => {
    try {
      if (!timeline?.clips.length) return [];

      const overscan = 500; // pixels outside viewport to render
      const viewportStartTime = (scrollLeft - overscan) / zoom;
      const viewportEndTime = (scrollLeft + viewportWidth + overscan) / zoom;

      // For large clip arrays (50+), use sorted + binary search for better performance
      if (timeline.clips.length > 50) {
        // Sort clips by timeline position (cached via sortedClips reference)
        const sortedClips = [...timeline.clips].sort(
          (a, b): number => a.timelinePosition - b.timelinePosition
        );

        // Binary search to find first visible clip
        let left = 0;
        let right = sortedClips.length - 1;
        let firstVisibleIndex = 0;

        while (left <= right) {
          const mid = Math.floor((left + right) / 2);
          const clip = sortedClips[mid];
          if (!clip) break;

          const clipEnd = clip.timelinePosition + (clip.end - clip.start);

          if (clipEnd < viewportStartTime) {
            left = mid + 1;
          } else {
            firstVisibleIndex = mid;
            right = mid - 1;
          }
        }

        // Collect visible clips from first visible index
        const visible: Clip[] = [];
        for (let i = firstVisibleIndex; i < sortedClips.length; i++) {
          const clip = sortedClips[i];
          if (!clip) break;

          const clipStart = clip.timelinePosition;
          const clipEnd = clipStart + (clip.end - clip.start);

          // Break early if we've passed the viewport
          if (clipStart > viewportEndTime) break;

          if (clipEnd >= viewportStartTime && clipStart <= viewportEndTime) {
            visible.push(clip);
          }
        }

        return visible;
      }

      // For smaller arrays, use simple filter (faster for small N)
      return timeline.clips.filter((clip): boolean => {
        const clipStart = clip.timelinePosition;
        const clipEnd = clipStart + (clip.end - clip.start);
        return clipEnd >= viewportStartTime && clipStart <= viewportEndTime;
      });
    } catch (error) {
      browserLogger.error(
        { error, timeline, scrollLeft, zoom },
        'Failed to calculate visible clips'
      );
      // NOTE: Do NOT call setCalculationError here - setState in useMemo causes infinite loops (React error #185)
      return [];
    }
  }, [timeline?.clips, scrollLeft, viewportWidth, zoom]);

  // Clear errors when timeline changes
  useEffect((): void => {
    setCalculationError(null);
  }, [timeline]);

  return {
    timelineDuration,
    numTracks,
    visibleClips,
    calculationError,
  };
}
