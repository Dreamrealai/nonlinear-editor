/**
 * useTimelineDraggingWithSnap Hook
 *
 * Wrapper around useTimelineDragging that adds snap visualization
 * Tracks snap candidates and active snap position during dragging
 * Provides mouse position tracking for distance tooltips
 * Detects snap transitions for flash animations
 */
'use client';

import { useState, useEffect, useRef } from 'react';
import type { Timeline } from '@/types/timeline';
import { useTimelineDragging } from './useTimelineDragging';
import type { DraggingClip } from './useTimelineDragging';
import { TIMELINE_CONSTANTS } from '@/lib/constants/ui';

const { SNAP_INTERVAL_SECONDS: SNAP_INTERVAL, SNAP_THRESHOLD_SECONDS: SNAP_THRESHOLD } =
  TIMELINE_CONSTANTS;

export type SnapInfo = {
  snapPosition: number;
  isSnapping: boolean;
  snapCandidates: number[];
  distanceToSnap: number; // Distance in seconds to nearest snap point
  mouseX: number; // Mouse X position in pixels for tooltip positioning
  mouseY: number; // Mouse Y position in pixels for tooltip positioning
  justSnapped: boolean; // Triggers flash animation when transitioning to snapped state
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
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const { timeline, containerRef } = options;
  const previousSnapStateRef = useRef<boolean>(false);

  // Track mouse position during dragging
  useEffect(() => {
    if (!draggingState.draggingClip) {
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setMousePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [draggingState.draggingClip, containerRef]);

  // Calculate snap info whenever dragging state changes
  useEffect(() => {
    if (!draggingState.draggingClip || !timeline) {
      setSnapInfo(null);
      previousSnapStateRef.current = false;
      return;
    }

    const draggingClip: DraggingClip = draggingState.draggingClip;
    const clip = timeline.clips.find((c) => c.id === draggingClip.id);

    if (!clip) {
      setSnapInfo(null);
      previousSnapStateRef.current = false;
      return;
    }

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
    let distanceToSnap = 0;

    // Find nearest snap candidate
    if (snapCandidates.length > 0) {
      let nearestCandidate = snapCandidates[0];
      let minDistance = Math.abs(position - nearestCandidate!);

      for (const candidate of snapCandidates) {
        if (!Number.isFinite(candidate)) continue;
        const distance = Math.abs(candidate - position);
        if (distance < minDistance) {
          minDistance = distance;
          nearestCandidate = candidate;
        }
        if (distance <= SNAP_THRESHOLD) {
          isSnapping = true;
          snapPosition = candidate;
          distanceToSnap = 0;
          break;
        }
      }

      // If not snapping, calculate distance to nearest candidate
      if (!isSnapping && nearestCandidate !== undefined) {
        distanceToSnap = position - nearestCandidate;
      }
    }

    // Detect snap transition for flash effect
    const justSnapped = isSnapping && !previousSnapStateRef.current;
    previousSnapStateRef.current = isSnapping;

    setSnapInfo({
      snapPosition,
      isSnapping,
      snapCandidates: snapCandidates.filter((c) => Number.isFinite(c) && c >= 0),
      distanceToSnap,
      mouseX: mousePosition.x,
      mouseY: mousePosition.y,
      justSnapped,
    });
  }, [draggingState.draggingClip, timeline, mousePosition]);

  return {
    ...draggingState,
    snapInfo,
    trimPreviewInfo: draggingState.trimPreviewInfo,
  };
}
