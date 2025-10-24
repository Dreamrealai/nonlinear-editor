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
 * - Immer enables mutation syntax while maintaining immutability
 * - enableMapSet() allows Immer to handle Set<string> for selectedClipIds
 * - Deep cloning via JSON for history snapshots
 * - Automatic deduplication prevents duplicate clip IDs
 */
'use client';

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';
import type { Timeline, Clip, Marker, Track, TextOverlay, TransitionType } from '@/types/timeline';
import { EDITOR_CONSTANTS, CLIP_CONSTANTS, ZOOM_CONSTANTS } from '@/lib/constants';

const { MAX_HISTORY, HISTORY_DEBOUNCE_MS } = EDITOR_CONSTANTS;
const { MIN_CLIP_DURATION } = CLIP_CONSTANTS;
const { MIN_ZOOM, MAX_ZOOM, DEFAULT_ZOOM } = ZOOM_CONSTANTS;

// Enable Immer to proxy Map/Set instances (required for selectedClipIds Set)
enableMapSet();

/**
 * Debounce helper to reduce excessive history saves (per-clip)
 * Maps clip ID to timer to prevent batching unrelated edits
 */
const historyDebounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
const debouncedSaveHistory = (clipId: string, callback: () => void) => {
  const existingTimer = historyDebounceTimers.get(clipId);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }
  const timer = setTimeout(() => {
    historyDebounceTimers.delete(clipId);
    callback();
  }, HISTORY_DEBOUNCE_MS);
  historyDebounceTimers.set(clipId, timer);
};

/**
 * EditorStore type definition.
 * Contains all state and actions for the video editor.
 */
type EditorStore = {
  // ===== State =====
  /** Current timeline being edited (null when loading) */
  timeline: Timeline | null;
  /** Playhead position in seconds */
  currentTime: number;
  /** Timeline zoom level in pixels per second */
  zoom: number;
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
  /** Add a clip to the timeline */
  addClip: (clip: Clip) => void;
  /** Reorder clips by ID array */
  reorderClips: (ids: string[]) => void;
  /** Update clip properties (validates durations and positions) */
  updateClip: (id: string, patch: Partial<Clip>) => void;
  /** Remove a clip from timeline */
  removeClip: (id: string) => void;
  /** Split a clip at a specific timeline position */
  splitClipAtTime: (clipId: string, time: number) => void;

  // ===== Playback Actions =====
  /** Set playhead position */
  setCurrentTime: (time: number) => void;
  /** Set zoom level (clamped to 10-200 px/s) */
  setZoom: (zoom: number) => void;

  // ===== Marker Actions =====
  /** Add a timeline marker */
  addMarker: (marker: Marker) => void;
  /** Remove a marker */
  removeMarker: (id: string) => void;
  /** Update marker properties */
  updateMarker: (id: string, patch: Partial<Marker>) => void;

  // ===== Track Actions =====
  /** Update or create a track (auto-creates if not exists) */
  updateTrack: (trackIndex: number, patch: Partial<Track>) => void;

  // ===== Text Overlay Actions =====
  /** Add a text overlay to the timeline */
  addTextOverlay: (textOverlay: TextOverlay) => void;
  /** Remove a text overlay */
  removeTextOverlay: (id: string) => void;
  /** Update text overlay properties */
  updateTextOverlay: (id: string, patch: Partial<TextOverlay>) => void;

  // ===== Transition Actions =====
  /** Add a transition to selected clips */
  addTransitionToSelectedClips: (transitionType: TransitionType, duration: number) => void;

  // ===== Selection Actions =====
  /** Select/deselect clip (multi=true for multi-select) */
  selectClip: (id: string, multi?: boolean) => void;
  /** Clear all selections */
  clearSelection: () => void;

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
 * Deep clones a timeline for history snapshots.
 * Uses structuredClone for better performance and type safety.
 *
 * @param timeline - Timeline to clone (may be an Immer draft)
 * @returns Deep copy of timeline
 */
const cloneTimeline = (timeline: Timeline | null): Timeline | null => {
  if (!timeline) return null;
  // structuredClone is faster and more reliable than JSON.parse(JSON.stringify())
  // It also preserves Date objects, RegExp, Map, Set, and other built-in types
  return structuredClone(timeline);
};

/**
 * Removes duplicate clips from an array.
 * Keeps the last occurrence of each unique clip ID.
 *
 * @param clips - Array of clips (may contain duplicates)
 * @returns Deduplicated array of clips
 */
const dedupeClips = (clips: Clip[]): Clip[] => {
  const seen = new Set<string>();
  const deduped: Clip[] = [];
  // Iterate backwards to keep last occurrence
  for (let i = clips.length - 1; i >= 0; i -= 1) {
    const clip = clips[i];
    if (!clip) continue; // Skip undefined entries
    if (seen.has(clip.id)) {
      continue; // Skip duplicate
    }
    seen.add(clip.id);
    deduped.unshift(clip); // Add to front (preserves order)
  }
  return deduped;
};

export const useEditorStore = create<EditorStore>()(
  immer((set, get) => ({
    timeline: null,
    currentTime: 0,
    zoom: DEFAULT_ZOOM,
    selectedClipIds: new Set<string>(),
    copiedClips: [],
    history: [],
    historyIndex: -1,

    setTimeline: (timeline) =>
      set((state) => {
        state.timeline = timeline;
        if (state.timeline) {
          state.timeline.clips = dedupeClips(state.timeline.clips);
        }
        state.selectedClipIds = new Set();
        state.history = [cloneTimeline(timeline)].filter((t): t is Timeline => t !== null);
        state.historyIndex = 0;
      }),
    addClip: (clip) =>
      set((state) => {
        if (!state.timeline) return;
        state.timeline.clips.push(clip);
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
    reorderClips: (ids) =>
      set((state) => {
        if (!state.timeline) return;
        const clipMap = new Map(state.timeline.clips.map((clip) => [clip.id, clip]));
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
    updateClip: (id, patch) =>
      set((state) => {
        const clip = state.timeline?.clips.find((existing) => existing.id === id);
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

          // Per-clip debounced save to history (prevents batching unrelated edits)
          debouncedSaveHistory(id, () => {
            const currentState = useEditorStore.getState();
            const cloned = cloneTimeline(currentState.timeline);
            if (cloned) {
              useEditorStore.setState((s) => {
                s.history = s.history.slice(0, s.historyIndex + 1);
                s.history.push(cloned);
                if (s.history.length > MAX_HISTORY) {
                  s.history.shift();
                } else {
                  s.historyIndex++;
                }
              });
            }
          });
        }
      }),
    removeClip: (id) =>
      set((state) => {
        if (!state.timeline) return;
        state.timeline.clips = state.timeline.clips.filter((clip) => clip.id !== id);
        state.timeline.clips = dedupeClips(state.timeline.clips);
        state.selectedClipIds.delete(id);

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
    splitClipAtTime: (clipId, time) =>
      set((state) => {
        if (!state.timeline) return;
        const clipIndex = state.timeline.clips.findIndex((c) => c.id === clipId);
        if (clipIndex === -1) return;

        const originalClip = state.timeline.clips[clipIndex];
        if (!originalClip) return;

        // Calculate split position relative to clip's content
        const clipStart = originalClip.timelinePosition;
        const clipEnd = originalClip.timelinePosition + (originalClip.end - originalClip.start);

        // Validate split is within clip bounds
        if (time <= clipStart || time >= clipEnd) return;

        const splitOffset = time - clipStart;
        const newClipStart = originalClip.start + splitOffset;

        // Validate both resulting clips meet minimum duration
        const firstClipDuration = newClipStart - originalClip.start;
        const secondClipDuration = originalClip.end - newClipStart;

        if (firstClipDuration < MIN_CLIP_DURATION || secondClipDuration < MIN_CLIP_DURATION) {
          // Split would create clips shorter than minimum duration - silently reject
          // (This is expected behavior during normal interaction, not an error)
          return;
        }

        // Create second half of clip
        const secondClip: Clip = {
          ...originalClip,
          id: `${clipId}-split-${Date.now()}`,
          start: newClipStart,
          timelinePosition: time,
        };

        // Update first half
        originalClip.end = newClipStart;
        originalClip.transitionToNext = { type: 'none', duration: 0 };

        // Insert second clip after first
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
    setCurrentTime: (time) =>
      set((state) => {
        state.currentTime = time;
      }),
    setZoom: (zoom) =>
      set((state) => {
        state.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
      }),
    addMarker: (marker) =>
      set((state) => {
        if (!state.timeline) return;
        if (!state.timeline.markers) {
          state.timeline.markers = [];
        }
        state.timeline.markers.push(marker);
      }),
    removeMarker: (id) =>
      set((state) => {
        if (!state.timeline?.markers) return;
        state.timeline.markers = state.timeline.markers.filter((m) => m.id !== id);
      }),
    updateMarker: (id, patch) =>
      set((state) => {
        const marker = state.timeline?.markers?.find((m) => m.id === id);
        if (marker) {
          Object.assign(marker, patch);
        }
      }),
    updateTrack: (trackIndex, patch) =>
      set((state) => {
        if (!state.timeline) return;
        if (!state.timeline.tracks) {
          state.timeline.tracks = [];
        }

        let track = state.timeline.tracks.find((t) => t.index === trackIndex);
        if (!track) {
          // Create track if it doesn't exist
          track = {
            id: `track-${trackIndex}`,
            index: trackIndex,
            name: `Track ${trackIndex + 1}`,
            type: 'video',
          };
          state.timeline.tracks.push(track);
        }

        Object.assign(track, patch);
      }),

    // ===== Text Overlay Actions =====
    addTextOverlay: (textOverlay) =>
      set((state) => {
        if (!state.timeline) return;
        if (!state.timeline.textOverlays) {
          state.timeline.textOverlays = [];
        }
        state.timeline.textOverlays.push(textOverlay);

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
    removeTextOverlay: (id) =>
      set((state) => {
        if (!state.timeline?.textOverlays) return;
        state.timeline.textOverlays = state.timeline.textOverlays.filter((t) => t.id !== id);

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
    updateTextOverlay: (id, patch) =>
      set((state) => {
        const textOverlay = state.timeline?.textOverlays?.find((t) => t.id === id);
        if (textOverlay) {
          Object.assign(textOverlay, patch);

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
        }
      }),

    // ===== Transition Actions =====
    addTransitionToSelectedClips: (transitionType, duration) =>
      set((state) => {
        if (!state.timeline) return;

        // Add transition to all selected clips
        state.selectedClipIds.forEach((clipId) => {
          const clip = state.timeline!.clips.find((c) => c.id === clipId);
          if (clip) {
            clip.transitionToNext = { type: transitionType, duration };
          }
        });

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

    selectClip: (id, multi = false) =>
      set((state) => {
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
    clearSelection: () =>
      set((state) => {
        state.selectedClipIds.clear();
      }),

    // Copy selected clips to clipboard
    copyClips: () =>
      set((state) => {
        if (!state.timeline) return;
        const selected = state.timeline.clips.filter((clip) => state.selectedClipIds.has(clip.id));
        state.copiedClips = structuredClone(selected);
      }),

    // Paste clips from clipboard at current playhead position
    pasteClips: () =>
      set((state) => {
        if (!state.timeline || state.copiedClips.length === 0) return;

        const currentTime = state.currentTime;
        const pastedClips: Clip[] = [];

        // Find the earliest timeline position among copied clips
        const minPosition = Math.min(...state.copiedClips.map((c) => c.timelinePosition));

        state.copiedClips.forEach((copiedClip) => {
          const offset = copiedClip.timelinePosition - minPosition;
          const newClip: Clip = {
            ...copiedClip,
            id: `${copiedClip.id}-paste-${Date.now()}-${Math.random()}`,
            timelinePosition: currentTime + offset,
          };
          pastedClips.push(newClip);
          state.timeline!.clips.push(newClip);
        });

        // Select pasted clips
        state.selectedClipIds.clear();
        pastedClips.forEach((clip) => state.selectedClipIds.add(clip.id));

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

    // Undo last action
    undo: () =>
      set((state) => {
        if (state.historyIndex > 0) {
          state.historyIndex--;
          const previousState = state.history[state.historyIndex];
          if (previousState) {
            state.timeline = cloneTimeline(previousState);
          }
        }
      }),

    // Redo previously undone action
    redo: () =>
      set((state) => {
        if (state.historyIndex < state.history.length - 1) {
          state.historyIndex++;
          const nextState = state.history[state.historyIndex];
          if (nextState) {
            state.timeline = cloneTimeline(nextState);
          }
        }
      }),

    // Check if undo is available
    canUndo: () => {
      const state = get();
      return state.historyIndex > 0;
    },

    // Check if redo is available
    canRedo: () => {
      const state = get();
      return state.historyIndex < state.history.length - 1;
    },
  }))
);
