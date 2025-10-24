/**
 * useTimelineDragging Hook
 *
 * Manages all drag interactions on the timeline:
 * - Clip dragging with collision detection and snapping
 * - Playhead dragging for seeking
 * - Trim handle dragging (left/right) with constraints
 * - Advanced edit modes (ripple, roll, slip, slide)
 *
 * Performance optimized with RAF throttling to prevent excessive re-renders
 */
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Clip, Timeline } from '@/types/timeline';
import { TIMELINE_CONSTANTS } from '@/lib/constants/ui';
import { CLIP_CONSTANTS } from '@/lib/constants/editor';
import { useAdvancedTrimming } from './useAdvancedTrimming';

const {
  TRACK_HEIGHT,
  SNAP_INTERVAL_SECONDS: SNAP_INTERVAL,
  SNAP_THRESHOLD_SECONDS: SNAP_THRESHOLD,
} = TIMELINE_CONSTANTS;
const { MIN_CLIP_DURATION } = CLIP_CONSTANTS;

export type DraggingClip = {
  id: string;
  offsetX: number;
  offsetY: number;
  duration: number;
};

export type TrimmingClip = {
  id: string;
  handle: 'left' | 'right';
  originalStart: number;
  originalEnd: number;
  originalPosition: number;
  sourceDuration: number | null;
};

export type SnapInfo = {
  snapPosition: number;
  isSnapping: boolean;
  snapCandidates: number[];
};

export type TrimPreviewInfo = {
  clipId: string;
  handle: 'left' | 'right';
  originalDuration: number;
  newDuration: number;
  originalStart: number;
  originalEnd: number;
  newStart: number;
  newEnd: number;
  position: {
    x: number;
    y: number;
  };
};

type UseTimelineDraggingOptions = {
  containerRef: React.RefObject<HTMLDivElement | null>;
  timeline: Timeline | null;
  zoom: number;
  numTracks: number;
  setCurrentTime: (time: number) => void;
  updateClip: (clipId: string, updates: Partial<Clip>) => void;
};

export interface UseTimelineDraggingReturn {
  draggingClip: DraggingClip | null;
  isDraggingPlayhead: boolean;
  trimmingClip: TrimmingClip | null;
  trimPreviewInfo: TrimPreviewInfo | null;
  setDraggingClip: React.Dispatch<React.SetStateAction<DraggingClip | null>>;
  setIsDraggingPlayhead: React.Dispatch<React.SetStateAction<boolean>>;
  setTrimmingClip: React.Dispatch<React.SetStateAction<TrimmingClip | null>>;
  currentEditMode: import('@/types/editModes').EditMode;
  editModeModifiers: import('@/types/editModes').EditModeModifiers;
  trimFeedback: import('@/types/editModes').TrimFeedback | null;
}

export function useTimelineDragging({
  containerRef,
  timeline,
  zoom,
  numTracks,
  setCurrentTime,
  updateClip,
}: UseTimelineDraggingOptions): UseTimelineDraggingReturn {
  const [draggingClip, setDraggingClip] = useState<DraggingClip | null>(null);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [trimmingClip, setTrimmingClip] = useState<TrimmingClip | null>(null);
  const [trimPreviewInfo, setTrimPreviewInfo] = useState<TrimPreviewInfo | null>(null);

  // Advanced trimming with edit modes support
  const advancedTrimming = useAdvancedTrimming({
    timeline,
    updateClip,
  });

  // RAF throttling for performance
  const rafIdRef = useRef<number | null>(null);
  const latestMouseEventRef = useRef<MouseEvent | null>(null);

  // Snap to grid helper
  const snapToGrid = useCallback(
    (value: number): number => Math.round(value / SNAP_INTERVAL) * SNAP_INTERVAL,
    []
  );

  // Compute safe position with collision detection
  const computeSafePosition = useCallback(
    (clipId: string, desiredPosition: number, targetTrackIndex?: number): number => {
      const basePosition = Math.max(0, desiredPosition);
      if (!timeline) {
        return Math.max(0, snapToGrid(basePosition));
      }

      const movingClip = timeline.clips.find((clip): boolean => clip.id === clipId);
      if (!movingClip) {
        return Math.max(0, snapToGrid(basePosition));
      }

      const duration = Math.max(SNAP_INTERVAL, movingClip.end - movingClip.start);
      let position = Math.max(0, snapToGrid(basePosition));

      const trackIndex =
        typeof targetTrackIndex === 'number' ? targetTrackIndex : movingClip.trackIndex;
      const trackClips = timeline.clips
        .filter((clip): boolean => clip.trackIndex === trackIndex && clip.id !== clipId)
        .sort((a, b): number => a.timelinePosition - b.timelinePosition);

      const previous = trackClips.filter((clip): boolean => clip.timelinePosition <= position).pop();
      const next = trackClips.find((clip): boolean => clip.timelinePosition >= position);

      let minStart = 0;
      if (previous) {
        const prevDuration = Math.max(SNAP_INTERVAL, previous.end - previous.start);
        minStart = previous.timelinePosition + prevDuration;
      }

      let maxStart = Number.POSITIVE_INFINITY;
      if (next) {
        maxStart = next.timelinePosition - duration;
        if (maxStart < minStart) {
          maxStart = minStart;
        }
      }

      position = Math.max(minStart, Math.min(position, maxStart));

      const gridCandidate = snapToGrid(position);
      if (
        gridCandidate >= minStart - SNAP_THRESHOLD &&
        gridCandidate <= maxStart + SNAP_THRESHOLD
      ) {
        position = gridCandidate;
      }

      const snapCandidates: number[] = [0, minStart];
      if (maxStart !== Number.POSITIVE_INFINITY) {
        snapCandidates.push(maxStart);
      }
      trackClips.forEach((clip): void => {
        snapCandidates.push(clip.timelinePosition);
        snapCandidates.push(clip.timelinePosition + Math.max(SNAP_INTERVAL, clip.end - clip.start));
      });

      for (const candidate of snapCandidates) {
        if (!Number.isFinite(candidate)) continue;
        if (Math.abs(candidate - position) <= SNAP_THRESHOLD) {
          position = candidate;
          break;
        }
      }

      return Math.max(0, position);
    },
    [timeline, snapToGrid]
  );

  // RAF-throttled mouse move handler
  const handleMouseMove = useCallback(
    (e: MouseEvent): void => {
      latestMouseEventRef.current = e;

      if (rafIdRef.current !== null) {
        return;
      }

      rafIdRef.current = requestAnimationFrame((): void => {
        rafIdRef.current = null;
        const event = latestMouseEventRef.current;
        if (!event || !containerRef.current || !timeline) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const time = Math.max(0, x / zoom);
        const y = event.clientY - rect.top;

        if (isDraggingPlayhead) {
          setCurrentTime(time);
        } else if (trimmingClip) {
          const clip = timeline.clips.find((c): boolean => c.id === trimmingClip.id);
          if (!clip) return;

          if (trimmingClip.handle === 'left') {
            // Trim start with advanced edit modes
            const deltaTime = time - trimmingClip.originalPosition;
            const maxEnd =
              typeof clip.sourceDuration === 'number'
                ? clip.sourceDuration
                : (trimmingClip.sourceDuration ?? trimmingClip.originalEnd);
            const newStart = Math.max(
              0,
              Math.min(trimmingClip.originalStart + deltaTime, Math.max(0, maxEnd - MIN_CLIP_DURATION))
            );
            const newPosition = Math.max(
              0,
              trimmingClip.originalPosition + (newStart - trimmingClip.originalStart)
            );

            // Calculate trim operation with current edit mode
            const operation = advancedTrimming.calculateTrimOperation(
              clip,
              'left',
              newStart,
<<<<<<< Updated upstream
              maxEnd,
              newPosition
            );
=======
              newEnd: maxEnd,
              position: {
                x: newPosition * zoom,
                y: clip.trackIndex * TRACK_HEIGHT,
              },
              isSnappedToGrid,
            });
>>>>>>> Stashed changes

            if (operation) {
              // Calculate new duration for preview
              const newDuration = maxEnd - newStart;
              const originalDuration = trimmingClip.originalEnd - trimmingClip.originalStart;

              // Update trim preview info
              setTrimPreviewInfo({
                clipId: trimmingClip.id,
                handle: 'left',
                originalDuration,
                newDuration,
                originalStart: trimmingClip.originalStart,
                originalEnd: trimmingClip.originalEnd,
                newStart,
                newEnd: maxEnd,
                position: {
                  x: newPosition * zoom,
                  y: clip.trackIndex * TRACK_HEIGHT,
                },
              });

              // Execute trim operation (applies to main clip and affected clips)
              if (
                maxEnd - newStart >= MIN_CLIP_DURATION &&
                (Math.abs(newStart - clip.start) > 1e-4 ||
                  Math.abs(newPosition - clip.timelinePosition) > 1e-4)
              ) {
                advancedTrimming.executeTrimOperation(operation);
              }
            }
          } else {
            // Trim end with advanced edit modes
            const clipWidth = time - clip.timelinePosition;
            const newEnd = clip.start + clipWidth;
            const maxEnd =
              typeof clip.sourceDuration === 'number'
                ? clip.sourceDuration
                : (trimmingClip.sourceDuration ?? undefined);
            const boundedEnd = Math.max(
              clip.start + MIN_CLIP_DURATION,
              typeof maxEnd === 'number' ? Math.min(newEnd, maxEnd) : newEnd
            );

            // Calculate trim operation with current edit mode
            const operation = advancedTrimming.calculateTrimOperation(
              clip,
              'right',
              clip.start,
              boundedEnd,
              clip.timelinePosition
            );

            if (operation) {
              // Calculate new duration for preview
              const newDuration = boundedEnd - clip.start;
              const originalDuration = trimmingClip.originalEnd - trimmingClip.originalStart;

              // Update trim preview info
              setTrimPreviewInfo({
                clipId: trimmingClip.id,
                handle: 'right',
                originalDuration,
                newDuration,
                originalStart: trimmingClip.originalStart,
                originalEnd: trimmingClip.originalEnd,
                newStart: clip.start,
                newEnd: boundedEnd,
                position: {
                  x: (clip.timelinePosition + newDuration) * zoom,
                  y: clip.trackIndex * TRACK_HEIGHT,
                },
              });

              // Execute trim operation (applies to main clip and affected clips)
              if (boundedEnd - clip.start >= MIN_CLIP_DURATION && Math.abs(boundedEnd - clip.end) > 1e-4) {
                advancedTrimming.executeTrimOperation(operation);
              }
            }
          }
        } else if (draggingClip) {
          const desiredPosition = Math.max(0, time - draggingClip.offsetX);
          const proposedTrack = Math.min(
            Math.max(0, Math.floor((y - draggingClip.offsetY) / TRACK_HEIGHT)),
            numTracks - 1
          );
          const safePosition = computeSafePosition(draggingClip.id, desiredPosition, proposedTrack);
          const clip = timeline.clips.find((item): boolean => item.id === draggingClip.id);
          if (
            !clip ||
            clip.timelinePosition !== safePosition ||
            clip.trackIndex !== proposedTrack
          ) {
            // Check if clip is part of a group
            const groupId = clip?.groupId;
            const group = timeline.groups?.find((g): boolean => g.id === groupId);

            if (groupId && group) {
              // Move all clips in group together, maintaining relative positions
              const originalPosition = clip.timelinePosition;
              const originalTrack = clip.trackIndex;
              const deltaPosition = safePosition - originalPosition;
              const deltaTrack = proposedTrack - originalTrack;

              // Update all clips in the group
              group.clipIds.forEach((clipId): void => {
                const groupClip = timeline.clips.find((c): boolean => c.id === clipId);
                if (groupClip) {
                  updateClip(clipId, {
                    timelinePosition: groupClip.timelinePosition + deltaPosition,
                    trackIndex: Math.max(
                      0,
                      Math.min(numTracks - 1, groupClip.trackIndex + deltaTrack)
                    ),
                  });
                }
              });
            } else {
              // Single clip, move normally
              updateClip(draggingClip.id, {
                timelinePosition: safePosition,
                trackIndex: proposedTrack,
              });
            }
          }
        }
      });
    },
    [
      isDraggingPlayhead,
      trimmingClip,
      draggingClip,
      zoom,
      timeline,
      setCurrentTime,
      updateClip,
      computeSafePosition,
      numTracks,
      snapToGrid,
      containerRef,
    ]
  );

  // Mouse up handler
  const handleMouseUp = useCallback((): void => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    latestMouseEventRef.current = null;

    if (draggingClip && timeline) {
      const clip = timeline.clips.find((item): boolean => item.id === draggingClip.id);
      if (clip) {
        const safePosition = computeSafePosition(clip.id, clip.timelinePosition, clip.trackIndex);
        if (clip.timelinePosition !== safePosition) {
          updateClip(clip.id, { timelinePosition: safePosition });
        }
      }
    }
    setIsDraggingPlayhead(false);
    setDraggingClip(null);
    setTrimmingClip(null);
    setTrimPreviewInfo(null);
  }, [draggingClip, timeline, computeSafePosition, updateClip]);

  // Attach/detach mouse event listeners
  useEffect((): (() => void) | undefined => {
    if (isDraggingPlayhead || draggingClip || trimmingClip) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return (): void => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
        latestMouseEventRef.current = null;
      };
    }
    return undefined;
  }, [isDraggingPlayhead, draggingClip, trimmingClip, handleMouseMove, handleMouseUp]);

  return {
    draggingClip,
    isDraggingPlayhead,
    trimmingClip,
    trimPreviewInfo,
    setDraggingClip,
    setIsDraggingPlayhead,
    setTrimmingClip,
    // Advanced trimming data
    currentEditMode: advancedTrimming.currentEditMode,
    editModeModifiers: advancedTrimming.modifiers,
    trimFeedback: advancedTrimming.feedback,
  };
}
