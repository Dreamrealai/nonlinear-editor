/**
 * Clips Slice - Clip Management Operations
 *
 * Handles all clip-related operations including:
 * - Adding, updating, removing clips
 * - Duplicating and splitting clips
 * - Reordering clips
 */
import type { Clip, Timeline } from '@/types/timeline';
import { CLIP_CONSTANTS, EDITOR_CONSTANTS } from '@/lib/constants';
import { timelineAnnouncements } from '@/lib/utils/screenReaderAnnouncer';
import { getClipFileName } from '@/lib/utils/timelineUtils';

const { MIN_CLIP_DURATION } = CLIP_CONSTANTS;
const { MAX_HISTORY } = EDITOR_CONSTANTS;

/**
 * Removes duplicate clips from an array.
 * Keeps the last occurrence of each unique clip ID.
 */
const dedupeClips = (clips: Clip[]): Clip[] => {
  if (clips.length <= 1) return clips;

  const seen = new Set<string>();
  const deduped: Clip[] = [];

  for (let i = clips.length - 1; i >= 0; i -= 1) {
    const clip = clips[i];
    if (!clip) continue;
    if (!seen.has(clip.id)) {
      seen.add(clip.id);
      deduped.push(clip);
    }
  }

  return deduped.reverse();
};

/**
 * Deep clones a timeline for history snapshots.
 */
const cloneTimeline = (timeline: Timeline | null): Timeline | null => {
  if (!timeline) return null;
  return structuredClone(timeline);
};

export interface ClipsSlice {
  /** Add a clip to the timeline */
  addClip: (clip: Clip) => void;
  /** Update clip properties (validates durations and positions) */
  updateClip: (id: string, patch: Partial<Clip>) => void;
  /** Update clip color for visual organization */
  updateClipColor: (id: string, color: string | null) => void;
  /** Remove a clip from timeline */
  removeClip: (id: string) => void;
  /** Duplicate a clip (places copy right after original) */
  duplicateClip: (id: string) => void;
  /** Split a clip at a specific timeline position */
  splitClipAtTime: (clipId: string, time: number) => void;
  /** Reorder clips by ID array */
  reorderClips: (ids: string[]) => void;
}

export interface ClipsSliceState {
  timeline: Timeline | null;
  history: Timeline[];
  historyIndex: number;
  selectedClipIds: Set<string>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createClipsSlice = (set: any): ClipsSlice => ({
  addClip: (clip): void =>
    set((state): void => {
      if (!state.timeline) return;
      state.timeline.clips.push(clip);
      state.timeline.clips = dedupeClips(state.timeline.clips);

      // Announce to screen readers
      if (typeof window !== 'undefined') {
        timelineAnnouncements.clipAdded(getClipFileName(clip), clip.trackIndex);
      }

      // Save to history
      const cloned = cloneTimeline(state.timeline);
      if (cloned) {
        state.history = state.history.slice(0, state.historyIndex + 1);
        state.history.push(cloned);
        if (state.history.length > MAX_HISTORY) {
          state.history.shift();
        } else {
          state.historyIndex++;
        }
      }
    }),

  updateClip: (id, patch): void =>
    set((state): void => {
      const clip = state.timeline?.clips.find((existing): boolean => existing.id === id);
      if (clip) {
        Object.assign(clip, patch);

        // Ensure numeric validity
        clip.timelinePosition = Number.isFinite(clip.timelinePosition)
          ? Math.max(0, clip.timelinePosition)
          : 0;
        clip.start = Number.isFinite(clip.start) ? Math.max(0, clip.start) : 0;
        clip.end = Number.isFinite(clip.end) ? clip.end : clip.start + MIN_CLIP_DURATION;

        // Normalize sourceDuration
        if (clip.sourceDuration !== undefined && clip.sourceDuration !== null) {
          if (typeof clip.sourceDuration === 'number' && Number.isFinite(clip.sourceDuration)) {
            clip.sourceDuration = Math.max(clip.sourceDuration, MIN_CLIP_DURATION);
          } else {
            clip.sourceDuration = null;
          }
        } else {
          clip.sourceDuration = null;
        }

        // Validate start/end bounds with sourceDuration
        if (typeof clip.sourceDuration === 'number') {
          clip.start = Math.min(clip.start, Math.max(0, clip.sourceDuration - MIN_CLIP_DURATION));
          clip.end = Math.min(clip.end, clip.sourceDuration);
        }

        // Ensure minimum duration
        if (clip.end - clip.start < MIN_CLIP_DURATION) {
          clip.end = clip.start + MIN_CLIP_DURATION;
          // If we exceed sourceDuration, shift both start and end back
          if (typeof clip.sourceDuration === 'number' && clip.end > clip.sourceDuration) {
            clip.end = clip.sourceDuration;
            clip.start = Math.max(0, clip.end - MIN_CLIP_DURATION);
          }
        }

        if (state.timeline) {
          state.timeline.clips = dedupeClips(state.timeline.clips);
        }

        // Save to history immediately for simple clip updates
        // Note: Debounced history saving is handled in useEditorStore for drag operations
        const cloned = cloneTimeline(state.timeline);
        if (cloned) {
          state.history = state.history.slice(0, state.historyIndex + 1);
          state.history.push(cloned);
          if (state.history.length > MAX_HISTORY) {
            state.history.shift();
          } else {
            state.historyIndex++;
          }
        }
      }
    }),

  removeClip: (id): void =>
    set((state): void => {
      if (!state.timeline) return;

      const clipToRemove = state.timeline.clips.find((clip): boolean => clip.id === id);

      state.timeline.clips = state.timeline.clips.filter((clip): boolean => clip.id !== id);
      state.timeline.clips = dedupeClips(state.timeline.clips);
      state.selectedClipIds.delete(id);

      // Announce to screen readers
      if (typeof window !== 'undefined' && clipToRemove) {
        timelineAnnouncements.clipRemoved(getClipFileName(clipToRemove));
      }

      // Save to history
      const cloned = cloneTimeline(state.timeline);
      if (cloned) {
        state.history = state.history.slice(0, state.historyIndex + 1);
        state.history.push(cloned);
        if (state.history.length > MAX_HISTORY) {
          state.history.shift();
        } else {
          state.historyIndex++;
        }
      }
    }),

  duplicateClip: (id): void =>
    set((state): void => {
      if (!state.timeline) return;

      const clipIndex = state.timeline.clips.findIndex((clip): boolean => clip.id === id);
      if (clipIndex === -1) return;

      const originalClip = state.timeline.clips[clipIndex];
      if (!originalClip) return;

      const clipDuration = originalClip.end - originalClip.start;
      const newPosition = originalClip.timelinePosition + clipDuration;

      const duplicateClip: Clip = {
        ...structuredClone(originalClip),
        id: `${id}-duplicate-${Date.now()}`,
        timelinePosition: newPosition,
        transitionToNext: { type: 'none', duration: 0 },
      };

      state.timeline.clips.splice(clipIndex + 1, 0, duplicateClip);
      state.timeline.clips = dedupeClips(state.timeline.clips);

      state.selectedClipIds.clear();
      state.selectedClipIds.add(duplicateClip.id);

      if (typeof window !== 'undefined') {
        timelineAnnouncements.clipAdded(
          `Duplicate of ${getClipFileName(originalClip)}`,
          duplicateClip.trackIndex
        );
      }

      // Save to history
      const cloned = cloneTimeline(state.timeline);
      if (cloned) {
        state.history = state.history.slice(0, state.historyIndex + 1);
        state.history.push(cloned);
        if (state.history.length > MAX_HISTORY) {
          state.history.shift();
        } else {
          state.historyIndex++;
        }
      }
    }),

  splitClipAtTime: (clipId, time): void =>
    set((state): void => {
      if (!state.timeline) return;
      const clipIndex = state.timeline.clips.findIndex((c): boolean => c.id === clipId);
      if (clipIndex === -1) return;

      const originalClip = state.timeline.clips[clipIndex];
      if (!originalClip) return;

      const clipStart = originalClip.timelinePosition;
      const clipEnd = originalClip.timelinePosition + (originalClip.end - originalClip.start);

      if (time <= clipStart || time >= clipEnd) return;

      const splitOffset = time - clipStart;
      const newClipStart = originalClip.start + splitOffset;

      const firstClipDuration = newClipStart - originalClip.start;
      const secondClipDuration = originalClip.end - newClipStart;

      if (firstClipDuration < MIN_CLIP_DURATION || secondClipDuration < MIN_CLIP_DURATION) {
        return;
      }

      const secondClip: Clip = {
        ...originalClip,
        id: `${clipId}-split-${Date.now()}`,
        start: newClipStart,
        timelinePosition: time,
      };

      originalClip.end = newClipStart;
      originalClip.transitionToNext = { type: 'none', duration: 0 };

      state.timeline.clips.splice(clipIndex + 1, 0, secondClip);
      state.timeline.clips = dedupeClips(state.timeline.clips);

      // Save to history
      const cloned = cloneTimeline(state.timeline);
      if (cloned) {
        state.history = state.history.slice(0, state.historyIndex + 1);
        state.history.push(cloned);
        if (state.history.length > MAX_HISTORY) {
          state.history.shift();
        } else {
          state.historyIndex++;
        }
      }
    }),

  updateClipColor: (id, color): void =>
    set((state): void => {
      if (!state.timeline) return;
      const clip = state.timeline.clips.find((c): boolean => c.id === id);
      if (!clip) return;

      // Set or clear the color
      clip.color = color || undefined;

      // Save to history
      const cloned = cloneTimeline(state.timeline);
      if (cloned) {
        state.history = state.history.slice(0, state.historyIndex + 1);
        state.history.push(cloned);
        if (state.history.length > MAX_HISTORY) {
          state.history.shift();
        } else {
          state.historyIndex++;
        }
      }
    }),

  reorderClips: (ids): void =>
    set((state): void => {
      if (!state.timeline) return;
      const clipMap = new Map(state.timeline.clips.map((clip): [string, Clip] => [clip.id, clip]));
      state.timeline.clips = ids
        .map((id) => clipMap.get(id))
        .filter((clip): clip is Clip => Boolean(clip));
      state.timeline.clips = dedupeClips(state.timeline.clips);

      // Save to history
      const cloned = cloneTimeline(state.timeline);
      if (cloned) {
        state.history = state.history.slice(0, state.historyIndex + 1);
        state.history.push(cloned);
        if (state.history.length > MAX_HISTORY) {
          state.history.shift();
        } else {
          state.historyIndex++;
        }
      }
    }),
});
