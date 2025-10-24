/**
 * Editor Store - Global State Management
 *
 * Zustand store with Immer middleware for immutable state updates.
 * Manages timeline state, playback, selection, and undo/redo functionality.
 *
 * Features:
 * - Timeline clip management (add, update, delete, reorder)
 * - Undo/redo with 50-action history
 * - Multi-clip selection
 * - Copy/paste clipboard
 * - Markers and tracks
 * - Zoom level and playhead position
 *
 * Architecture:
 * - Composed from multiple slices for better maintainability
 * - Immer enables mutation syntax while maintaining immutability
 * - enableMapSet() allows Immer to handle Set<string> for selectedClipIds
 * - Deep cloning via structuredClone for history snapshots
 * - Automatic deduplication prevents duplicate clip IDs
 */
'use client';

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';
import type { Timeline, Clip } from '@/types/timeline';
import { EDITOR_CONSTANTS } from '@/lib/constants';
import { timelineAnnouncements } from '@/lib/utils/screenReaderAnnouncer';

// Import slices
import {
  createClipsSlice,
  createTracksSlice,
  createMarkersSlice,
  createGuidesSlice,
  createZoomSlice,
  createTextOverlaysSlice,
  createTransitionsSlice,
  createLockSlice,
  createGroupsSlice,
  createPlaybackSlice,
  type ClipsSlice,
  type TracksSlice,
  type MarkersSlice,
  type GuidesSlice,
  type ZoomSlice,
  type TextOverlaysSlice,
  type TransitionsSlice,
  type LockSlice,
  type GroupsSlice,
  type PlaybackSlice,
} from './slices';

const { MAX_HISTORY, HISTORY_DEBOUNCE_MS } = EDITOR_CONSTANTS;

// Enable Immer to proxy Map/Set instances (required for selectedClipIds Set)
enableMapSet();

/**
 * Debounce helper to reduce excessive history saves (per-clip)
 * Maps clip ID to timer to prevent batching unrelated edits
 */
const historyDebounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
export const debouncedSaveHistory = (clipId: string, callback: () => void): void => {
  const existingTimer = historyDebounceTimers.get(clipId);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }
  const timer = setTimeout((): void => {
    historyDebounceTimers.delete(clipId);
    callback();
  }, HISTORY_DEBOUNCE_MS);
  historyDebounceTimers.set(clipId, timer);
};

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

/**
 * Core EditorStore type definition.
 * Contains timeline state, selection, history, and clipboard.
 */
type EditorStoreCore = {
  // ===== State =====
  /** Current timeline being edited (null when loading) */
  timeline: Timeline | null;
  /** IDs of currently selected clips (supports multi-select) */
  selectedClipIds: Set<string>;
  /** Clipboard for copy/paste operations */
  copiedClips: Clip[];
  /** Undo/redo history (array of timeline snapshots) */
  history: Timeline[];
  /** Current position in history array */
  historyIndex: number;

  // ===== Timeline Actions =====
  /** Replace entire timeline (initializes history) */
  setTimeline: (timeline: Timeline) => void;

  // ===== Selection Actions =====
  /** Select/deselect clip (multi=true for multi-select) */
  selectClip: (id: string, multi?: boolean) => void;
  /** Clear all selections */
  clearSelection: () => void;
  /** Select clips within a rectangular area (rubber-band selection) */
  selectClipsInRange: (
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    zoom: number,
    trackHeight: number,
    multi?: boolean
  ) => void;
  /** Select all clips in a specific track */
  selectAllClipsInTrack: (trackIndex: number, multi?: boolean) => void;
  /** Select all clips in the timeline */
  selectAllClips: () => void;

  // ===== Clipboard Actions =====
  /** Copy selected clips to clipboard */
  copyClips: () => void;
  /** Paste clips from clipboard at playhead position */
  pasteClips: () => void;

  // ===== History Actions =====
  /** Undo last action */
  undo: () => void;
  /** Redo previously undone action */
  redo: () => void;
  /** Check if undo is available */
  canUndo: () => boolean;
  /** Check if redo is available */
  canRedo: () => boolean;
};

/**
 * Combined EditorStore type - merges core store with all slices
 */
export type EditorStore = EditorStoreCore &
  ClipsSlice &
  TracksSlice &
  MarkersSlice &
  GuidesSlice &
  ZoomSlice &
  TextOverlaysSlice &
  TransitionsSlice &
  LockSlice &
  GroupsSlice &
  PlaybackSlice;

export const useEditorStore = create<EditorStore>()(
  immer((set, get) => ({
    // ===== Core State =====
    timeline: null,
    selectedClipIds: new Set<string>(),
    copiedClips: [],
    history: [],
    historyIndex: -1,

    // ===== Core Actions =====
    setTimeline: (timeline): void =>
      set((state): void => {
        state.timeline = timeline;
        if (state.timeline) {
          state.timeline.clips = dedupeClips(state.timeline.clips);
        }
        state.selectedClipIds = new Set();
        state.history = [cloneTimeline(timeline)].filter((t): t is Timeline => t !== null);
        state.historyIndex = 0;
      }),

    // ===== Selection Actions =====
    selectClip: (id, multi = false): void =>
      set((state): void => {
        if (multi) {
          if (state.selectedClipIds.has(id)) {
            state.selectedClipIds.delete(id);
          } else {
            state.selectedClipIds.add(id);
          }
        } else {
          state.selectedClipIds.clear();
          state.selectedClipIds.add(id);
        }
      }),

    clearSelection: (): void =>
      set((state): void => {
        state.selectedClipIds.clear();
      }),

    selectClipsInRange: (startX, startY, endX, endY, zoom, trackHeight, multi = false): void =>
      set((state): void => {
        if (!state.timeline) return;

        const minX = Math.min(startX, endX);
        const maxX = Math.max(startX, endX);
        const minY = Math.min(startY, endY);
        const maxY = Math.max(startY, endY);

        if (!multi) {
          state.selectedClipIds.clear();
        }

        state.timeline.clips.forEach((clip): void => {
          const clipLeft = clip.timelinePosition * zoom;
          const clipRight = clipLeft + (clip.end - clip.start) * zoom;
          const clipTop = clip.trackIndex * trackHeight + 8;
          const clipBottom = clipTop + (trackHeight - 16);

          const intersects =
            clipRight >= minX && clipLeft <= maxX && clipBottom >= minY && clipTop <= maxY;

          if (intersects) {
            state.selectedClipIds.add(clip.id);
          }
        });
      }),

    selectAllClipsInTrack: (trackIndex, multi = false): void =>
      set((state): void => {
        if (!state.timeline) return;

        if (!multi) {
          state.selectedClipIds.clear();
        }

        state.timeline.clips.forEach((clip): void => {
          if (clip.trackIndex === trackIndex) {
            state.selectedClipIds.add(clip.id);
          }
        });

        // Announce selection for screen readers
        const count = Array.from(state.selectedClipIds).filter(
          (id): boolean => state.timeline?.clips.find((c): boolean => c.id === id)?.trackIndex === trackIndex
        ).length;
        timelineAnnouncements.clipSelected(count);
      }),

    selectAllClips: (): void =>
      set((state): void => {
        if (!state.timeline) return;

        state.timeline.clips.forEach((clip): void => {
          state.selectedClipIds.add(clip.id);
        });

        // Announce selection for screen readers
        timelineAnnouncements.clipSelected(state.selectedClipIds.size);
      }),

    // ===== Clipboard Actions =====
    copyClips: (): void =>
      set((state): void => {
        if (!state.timeline) return;
        const selected = state.timeline.clips.filter((clip): boolean => state.selectedClipIds.has(clip.id));
        state.copiedClips = structuredClone(selected);
      }),

    pasteClips: (): void =>
      set((state): void => {
        if (!state.timeline || state.copiedClips.length === 0) return;

        const currentTime = state.currentTime;
        const pastedClips: Clip[] = [];

        const minPosition = Math.min(...state.copiedClips.map((c): number => c.timelinePosition));

        state.copiedClips.forEach((copiedClip): void => {
          const offset = copiedClip.timelinePosition - minPosition;
          const newClip: Clip = {
            ...copiedClip,
            id: `${copiedClip.id}-paste-${Date.now()}-${Math.random()}`,
            timelinePosition: currentTime + offset,
          };
          pastedClips.push(newClip);
          state.timeline!.clips.push(newClip);
        });

        state.selectedClipIds.clear();
        pastedClips.forEach((clip): Set<string> => state.selectedClipIds.add(clip.id));

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

    // ===== History Actions =====
    undo: (): void =>
      set((state): void => {
        if (state.historyIndex > 0) {
          state.historyIndex--;
          const previousState = state.history[state.historyIndex];
          if (previousState) {
            state.timeline = cloneTimeline(previousState);
          }
        }
      }),

    redo: (): void =>
      set((state): void => {
        if (state.historyIndex < state.history.length - 1) {
          state.historyIndex++;
          const nextState = state.history[state.historyIndex];
          if (nextState) {
            state.timeline = cloneTimeline(nextState);
          }
        }
      }),

    canUndo: (): boolean => {
      const state = get();
      return state.historyIndex > 0;
    },

    canRedo: (): boolean => {
      const state = get();
      return state.historyIndex < state.history.length - 1;
    },

    // ===== Slices =====
    ...createClipsSlice(set, get, {} as any),
    ...createTracksSlice(set, get, {} as any),
    ...createMarkersSlice(set, get, {} as any),
    ...createGuidesSlice(set, get, {} as any),
    ...createZoomSlice(set, get, {} as any),
    ...createTextOverlaysSlice(set, get, {} as any),
    ...createTransitionsSlice(set, get, {} as any),
    ...createLockSlice(set, get, {} as any),
    ...createGroupsSlice(set, get, {} as any),
    ...createPlaybackSlice(set, get, {} as any),
  }))
);
