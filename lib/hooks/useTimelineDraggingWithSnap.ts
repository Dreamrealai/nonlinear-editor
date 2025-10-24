/**
 * useTimelineDraggingWithSnap Hook
 *
 * Wrapper around useTimelineDragging that adds snap visualization
 * Tracks snap candidates and active snap position during dragging
 */
'use client';

import { useState, useEffect } from 'react';
import type { Timeline } from '@/types/timeline';
import { useTimelineDragging } from './useTimelineDragging';
import type { DraggingClip } from './useTimelineDragging';
import { TIMELINE_CONSTANTS } from '@/lib/constants/ui';

const {
  SNAP_INTERVAL_SECONDS: SNAP_INTERVAL,
  SNAP_THRESHOLD_SECONDS: SNAP_THRESHOLD,
} = TIMELINE_CONSTANTS;

export type SnapInfo = {
  snapPosition: number;
  isSnapping: boolean;
  snapCandidates: number[];
};

type UseTimelineDraggingWithSnapOptions = {
  containerRef: React.RefObject<HTMLDivElement | null>;
  timeline: Timeline | null;
  zoom: number;
  numTracks: number;
  setCurrentTime: (time: number) => void;
  updateClip: (clipId: string, updates: Partial<import('@/types/timeline').Clip>) => void;
};

export function useTimelineDraggingWithSnap(options: UseTimelineDraggingWithSnapOptions) {
  const draggingState = useTimelineDragging(options);
  const [snapInfo, setSnapInfo] = useState<SnapInfo | null>(null);
  const { timeline } = options;

  // Calculate snap info whenever dragging state changes
  useEffect(() => {
    if (!draggingState.draggingClip || !timeline) {
      setSnapInfo(null);
      return;
    }

    const draggingClip: DraggingClip = draggingState.draggingClip;
    const clip = timeline.clips.find(c => c.id === draggingClip.id);

    if (!clip) {
      setSnapInfo(null);
      return;
    }

    const duration = Math.max(SNAP_INTERVAL, clip.end - clip.start);
    const position = clip.timelinePosition;

    // Build snap candidates
    const snapCandidates: number[] = [0];
    const trackClips = timeline.clips
      .filter((c) => c.trackIndex === clip.trackIndex && c.id !== clip.id)
      .sort((a, b) => a.timelinePosition - b.timelinePosition);

    // Add clip edges as snap candidates
    trackClips.forEach((c) => {
      snapCandidates.push(c.timelinePosition);
      snapCandidates.push(c.timelinePosition + Math.max(SNAP_INTERVAL, c.end - c.start));
    });

    // Check if currently snapping to any candidate
    let isSnapping = false;
    let snapPosition = position;

    for (const candidate of snapCandidates) {
      if (!Number.isFinite(candidate)) continue;
      if (Math.abs(candidate - position) <= SNAP_THRESHOLD) {
        isSnapping = true;
        snapPosition = candidate;
        break;
      }
    }

    setSnapInfo({
      snapPosition,
      isSnapping,
      snapCandidates: snapCandidates.filter(c => Number.isFinite(c) && c >= 0),
    });
  }, [draggingState.draggingClip, timeline]);

  return {
    ...draggingState,
    snapInfo,
  };
}
