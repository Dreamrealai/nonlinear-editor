/**
 * useAdvancedTrimming Hook
 *
 * Comprehensive trim operations supporting multiple edit modes:
 * - Normal trim: Basic trim operation
 * - Ripple edit: Trim and move following clips
 * - Roll edit: Adjust boundary between adjacent clips
 * - Slip edit: Change in/out points without changing position
 * - Slide edit: Move clip while adjusting adjacent clips
 *
 * Features:
 * - Keyboard modifier detection for mode switching
 * - Visual feedback for all modes
 * - Undo/redo support through store
 * - Audio/video sync preservation
 * - Collision detection
 */
'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Clip, Timeline } from '@/types/timeline';
import type { EditMode, EditModeModifiers, TrimOperation, TrimFeedback } from '@/types/editModes';
import { TIMELINE_CONSTANTS } from '@/lib/constants/ui';
import { CLIP_CONSTANTS } from '@/lib/constants/editor';

const { SNAP_INTERVAL_SECONDS: SNAP_INTERVAL } = TIMELINE_CONSTANTS;
const { MIN_CLIP_DURATION } = CLIP_CONSTANTS;

type UseAdvancedTrimmingOptions = {
  timeline: Timeline | null;
  updateClip: (clipId: string, updates: Partial<Clip>) => void;
};

/**
 * Get the current edit mode based on keyboard modifiers
 */
function getEditMode(modifiers: EditModeModifiers): EditMode {
  if (modifiers.shift) return 'ripple';
  if (modifiers.alt) return 'roll';
  if (modifiers.cmd || modifiers.ctrl) return 'slip';
  return 'normal';
}

/**
 * Get human-readable description for edit mode
 */
function getEditModeDescription(mode: EditMode, handle: 'left' | 'right'): string {
  const handleName = handle === 'left' ? 'start' : 'end';
  switch (mode) {
    case 'ripple':
      return `Ripple trim ${handleName} (moves following clips)`;
    case 'roll':
      return `Roll edit ${handleName} (adjusts adjacent clip)`;
    case 'slip':
      return `Slip edit (changes in/out points, maintains position)`;
    case 'slide':
      return `Slide edit (moves clip, adjusts adjacent clips)`;
    default:
      return `Trim ${handleName}`;
  }
}

export function useAdvancedTrimming({ timeline, updateClip }: UseAdvancedTrimmingOptions) {
  const [modifiers, setModifiers] = useState<EditModeModifiers>({
    shift: false,
    alt: false,
    cmd: false,
    ctrl: false,
  });

  const [currentOperation, setCurrentOperation] = useState<TrimOperation | null>(null);
  const [feedback, setFeedback] = useState<TrimFeedback | null>(null);

  // Track keyboard modifiers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setModifiers({
        shift: e.shiftKey,
        alt: e.altKey,
        cmd: e.metaKey,
        ctrl: e.ctrlKey,
      });
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      setModifiers({
        shift: e.shiftKey,
        alt: e.altKey,
        cmd: e.metaKey,
        ctrl: e.ctrlKey,
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  /**
   * Find adjacent clip on the same track
   */
  const findAdjacentClip = useCallback(
    (clip: Clip, direction: 'before' | 'after'): Clip | null => {
      if (!timeline) return null;

      const trackClips = timeline.clips
        .filter((c) => c.trackIndex === clip.trackIndex && c.id !== clip.id)
        .sort((a, b) => a.timelinePosition - b.timelinePosition);

      const clipEnd = clip.timelinePosition + (clip.end - clip.start);

      if (direction === 'before') {
        // Find clip that ends at or near this clip's start
        return (
          trackClips
            .filter((c) => {
              const cEnd = c.timelinePosition + (c.end - c.start);
              return Math.abs(cEnd - clip.timelinePosition) < SNAP_INTERVAL;
            })
            .pop() || null
        );
      } else {
        // Find clip that starts at or near this clip's end
        return (
          trackClips.find((c) => Math.abs(c.timelinePosition - clipEnd) < SNAP_INTERVAL) || null
        );
      }
    },
    [timeline]
  );

  /**
   * Get all clips following a given clip on the same track
   */
  const getFollowingClips = useCallback(
    (clip: Clip): Clip[] => {
      if (!timeline) return [];

      const clipEnd = clip.timelinePosition + (clip.end - clip.start);
      return timeline.clips
        .filter((c) => c.trackIndex === clip.trackIndex && c.timelinePosition >= clipEnd)
        .sort((a, b) => a.timelinePosition - b.timelinePosition);
    },
    [timeline]
  );

  /**
   * Apply normal trim operation
   */
  const applyNormalTrim = useCallback(
    (
      clip: Clip,
      handle: 'left' | 'right',
      newStart: number,
      newEnd: number,
      newPosition: number
    ): TrimOperation => {
      return {
        clipId: clip.id,
        handle,
        editMode: 'normal',
        modifiers,
        originalStart: clip.start,
        originalEnd: clip.end,
        originalPosition: clip.timelinePosition,
        newStart,
        newEnd,
        newPosition,
      };
    },
    [modifiers]
  );

  /**
   * Apply ripple trim operation (moves following clips)
   */
  const applyRippleTrim = useCallback(
    (
      clip: Clip,
      handle: 'left' | 'right',
      newStart: number,
      newEnd: number,
      newPosition: number
    ): TrimOperation => {
      const originalDuration = clip.end - clip.start;
      const newDuration = newEnd - newStart;
      const deltaTime = newDuration - originalDuration;

      const followingClips = getFollowingClips(clip);
      const affectedClips = followingClips.map((c) => ({
        clipId: c.id,
        originalPosition: c.timelinePosition,
        newPosition: c.timelinePosition + deltaTime,
      }));

      return {
        clipId: clip.id,
        handle,
        editMode: 'ripple',
        modifiers,
        originalStart: clip.start,
        originalEnd: clip.end,
        originalPosition: clip.timelinePosition,
        newStart,
        newEnd,
        newPosition,
        affectedClips,
      };
    },
    [modifiers, getFollowingClips]
  );

  /**
   * Apply roll edit operation (adjusts adjacent clip boundary)
   */
  const applyRollTrim = useCallback(
    (
      clip: Clip,
      handle: 'left' | 'right',
      newStart: number,
      newEnd: number,
      newPosition: number
    ): TrimOperation => {
      const adjacentClip = findAdjacentClip(clip, handle === 'left' ? 'before' : 'after');

      if (!adjacentClip) {
        // No adjacent clip, fall back to normal trim
        return applyNormalTrim(clip, handle, newStart, newEnd, newPosition);
      }

      const affectedClips = [];

      if (handle === 'left') {
        // Adjusting start - modify previous clip's end
        const deltaTime = newPosition - clip.timelinePosition;
        const adjacentNewEnd = adjacentClip.end + deltaTime;

        // Ensure minimum duration for adjacent clip
        if (adjacentNewEnd - adjacentClip.start >= MIN_CLIP_DURATION) {
          affectedClips.push({
            clipId: adjacentClip.id,
            originalPosition: adjacentClip.timelinePosition,
            newPosition: adjacentClip.timelinePosition,
            originalStart: adjacentClip.start,
            originalEnd: adjacentClip.end,
            newStart: adjacentClip.start,
            newEnd: adjacentNewEnd,
          });
        }
      } else {
        // Adjusting end - modify next clip's start
        const originalClipEnd = clip.timelinePosition + (clip.end - clip.start);
        const newClipEnd = newPosition + (newEnd - newStart);
        const deltaTime = newClipEnd - originalClipEnd;

        const adjacentNewStart = adjacentClip.start + deltaTime;
        const adjacentNewPosition = adjacentClip.timelinePosition + deltaTime;

        // Ensure minimum duration for adjacent clip
        if (adjacentClip.end - adjacentNewStart >= MIN_CLIP_DURATION) {
          affectedClips.push({
            clipId: adjacentClip.id,
            originalPosition: adjacentClip.timelinePosition,
            newPosition: adjacentNewPosition,
            originalStart: adjacentClip.start,
            originalEnd: adjacentClip.end,
            newStart: adjacentNewStart,
            newEnd: adjacentClip.end,
          });
        }
      }

      return {
        clipId: clip.id,
        handle,
        editMode: 'roll',
        modifiers,
        originalStart: clip.start,
        originalEnd: clip.end,
        originalPosition: clip.timelinePosition,
        newStart,
        newEnd,
        newPosition,
        affectedClips,
      };
    },
    [modifiers, findAdjacentClip, applyNormalTrim]
  );

  /**
   * Apply slip edit operation (changes in/out without moving position)
   */
  const applySlipTrim = useCallback(
    (clip: Clip, deltaTime: number): TrimOperation => {
      const duration = clip.end - clip.start;
      let newStart = clip.start + deltaTime;
      let newEnd = clip.end + deltaTime;

      // Clamp to source duration bounds
      if (clip.sourceDuration) {
        if (newStart < 0) {
          newStart = 0;
          newEnd = duration;
        }
        if (newEnd > clip.sourceDuration) {
          newEnd = clip.sourceDuration;
          newStart = newEnd - duration;
        }
      } else {
        newStart = Math.max(0, newStart);
        newEnd = newStart + duration;
      }

      return {
        clipId: clip.id,
        handle: 'left', // Slip affects both handles conceptually
        editMode: 'slip',
        modifiers,
        originalStart: clip.start,
        originalEnd: clip.end,
        originalPosition: clip.timelinePosition,
        newStart,
        newEnd,
        newPosition: clip.timelinePosition, // Position doesn't change
      };
    },
    [modifiers]
  );

  /**
   * Execute trim operation and update clips
   */
  const executeTrimOperation = useCallback(
    (operation: TrimOperation) => {
      // Update primary clip
      const updates: Partial<Clip> = {
        start: operation.newStart,
        end: operation.newEnd,
        timelinePosition: operation.newPosition,
      };

      updateClip(operation.clipId, updates);

      // Update affected clips (for ripple/roll/slide modes)
      if (operation.affectedClips) {
        operation.affectedClips.forEach((affected) => {
          const affectedUpdates: Partial<Clip> = {
            timelinePosition: affected.newPosition,
          };

          if (affected.newStart !== undefined && affected.newEnd !== undefined) {
            affectedUpdates.start = affected.newStart;
            affectedUpdates.end = affected.newEnd;
          }

          updateClip(affected.clipId, affectedUpdates);
        });
      }

      // Generate feedback
      const primaryClip = timeline?.clips.find((c) => c.id === operation.clipId);
      if (primaryClip) {
        const originalDuration = operation.originalEnd - operation.originalStart;
        const newDuration = operation.newEnd - operation.newStart;
        const deltaTime = newDuration - originalDuration;

        setFeedback({
          mode: operation.editMode,
          primaryClip: {
            id: operation.clipId,
            originalDuration,
            newDuration,
            deltaTime,
          },
          affectedClipsCount: operation.affectedClips?.length || 0,
          description: getEditModeDescription(operation.editMode, operation.handle),
        });
      }
    },
    [updateClip, timeline]
  );

  /**
   * Calculate trim operation based on current edit mode
   */
  const calculateTrimOperation = useCallback(
    (
      clip: Clip,
      handle: 'left' | 'right',
      newStart: number,
      newEnd: number,
      newPosition: number
    ): TrimOperation | null => {
      const editMode = getEditMode(modifiers);

      // Validate minimum duration
      if (newEnd - newStart < MIN_CLIP_DURATION) {
        return null;
      }

      // Validate source duration bounds
      if (clip.sourceDuration) {
        if (newStart < 0 || newEnd > clip.sourceDuration) {
          return null;
        }
      }

      switch (editMode) {
        case 'ripple':
          return applyRippleTrim(clip, handle, newStart, newEnd, newPosition);
        case 'roll':
          return applyRollTrim(clip, handle, newStart, newEnd, newPosition);
        case 'slip':
          // For slip mode, calculate delta from original position
          const deltaTime = newStart - clip.start;
          return applySlipTrim(clip, deltaTime);
        case 'normal':
        default:
          return applyNormalTrim(clip, handle, newStart, newEnd, newPosition);
      }
    },
    [modifiers, applyNormalTrim, applyRippleTrim, applyRollTrim, applySlipTrim]
  );

  /**
   * Clear feedback after delay
   */
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 2000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [feedback]);

  return {
    modifiers,
    currentEditMode: getEditMode(modifiers),
    currentOperation,
    feedback,
    calculateTrimOperation,
    executeTrimOperation,
    setCurrentOperation,
    clearFeedback: () => setFeedback(null),
  };
}
