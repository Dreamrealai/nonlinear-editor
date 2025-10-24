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
import { timelineAnnouncements } from '@/lib/utils/screenReaderAnnouncer';
import { getClipFileName, formatTimecode } from '@/lib/utils/timelineUtils';

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
  /** Timecode display mode (duration or timecode) */
  timecodeDisplayMode: 'duration' | 'timecode';
  /** Auto-scroll timeline during playback to follow playhead */
  autoScrollEnabled: boolean;

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
  /** Toggle timecode display mode */
  toggleTimecodeDisplayMode: () => void;
  /** Toggle auto-scroll during playback */
  toggleAutoScroll: () => void;
  /** Calculate zoom to fit entire timeline in viewport */
  calculateFitToTimelineZoom: (viewportWidth: number) => number;
  /** Calculate zoom to fit selected clips in viewport */
  calculateFitToSelectionZoom: (viewportWidth: number) => number;
  /** Apply zoom to fit entire timeline */
  fitToTimeline: (viewportWidth: number) => void;
  /** Apply zoom to fit selected clips */
  fitToSelection: (viewportWidth: number) => void;
  /** Set zoom to specific preset percentage */
  setZoomPreset: (preset: 25 | 50 | 100 | 200 | 400) => void;

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

  // ===== Lock Actions =====
  /** Lock a clip to prevent editing/moving */
  lockClip: (id: string) => void;
  /** Unlock a clip to allow editing/moving */
  unlockClip: (id: string) => void;
  /** Toggle lock state for a clip */
  toggleClipLock: (id: string) => void;
  /** Lock all selected clips */
  lockSelectedClips: () => void;
  /** Unlock all selected clips */
  unlockSelectedClips: () => void;

  // ===== Clipboard Actions =====
  /** Copy selected clips to clipboard */
  copyClips: () => void;
  /** Paste clips from clipboard at playhead position */
  pasteClips: () => void;

  // ===== Group Actions =====
  /** Create a group from selected clips */
  groupSelectedClips: (name?: string) => void;
  /** Ungroup clips in a group */
  ungroupClips: (groupId: string) => void;
  /** Get all clip IDs in a group */
  getGroupClipIds: (groupId: string) => string[];
  /** Check if a clip is grouped */
  isClipGrouped: (clipId: string) => boolean;
  /** Get group ID for a clip */
  getClipGroupId: (clipId: string) => string | null;

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
  if (clips.length <= 1) return clips; // Fast path for small arrays

  const seen = new Set<string>();
  const deduped: Clip[] = [];

  // Iterate backwards to keep last occurrence
  for (let i = clips.length - 1; i >= 0; i -= 1) {
    const clip = clips[i];
    if (!clip) continue; // Skip undefined entries
    if (!seen.has(clip.id)) {
      seen.add(clip.id);
      deduped.push(clip); // Push to end (we'll reverse later)
    }
  }

  // Reverse to restore original order (faster than unshift in loop)
  return deduped.reverse();
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
    timecodeDisplayMode: 'duration',
    autoScrollEnabled: true,

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

        // Get clip info before removing for screen reader announcement
        const clipToRemove = state.timeline.clips.find((clip) => clip.id === id);

        state.timeline.clips = state.timeline.clips.filter((clip) => clip.id !== id);
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
    toggleTimecodeDisplayMode: () =>
      set((state) => {
        state.timecodeDisplayMode =
          state.timecodeDisplayMode === 'duration' ? 'timecode' : 'duration';
      }),
    toggleAutoScroll: () =>
      set((state) => {
        state.autoScrollEnabled = !state.autoScrollEnabled;
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
    selectClipsInRange: (startX, startY, endX, endY, zoom, trackHeight, multi = false) =>
      set((state) => {
        if (!state.timeline) return;

        // Calculate bounding box of selection rectangle
        const minX = Math.min(startX, endX);
        const maxX = Math.max(startX, endX);
        const minY = Math.min(startY, endY);
        const maxY = Math.max(startY, endY);

        // Clear selection if not multi-select
        if (!multi) {
          state.selectedClipIds.clear();
        }

        // Check each clip for intersection with selection rectangle
        state.timeline.clips.forEach((clip) => {
          const clipLeft = clip.timelinePosition * zoom;
          const clipRight = clipLeft + (clip.end - clip.start) * zoom;
          const clipTop = clip.trackIndex * trackHeight + 8; // +8 for top offset
          const clipBottom = clipTop + (trackHeight - 16); // -16 for top/bottom padding

          // Check if clip intersects with selection rectangle
          const intersects =
            clipRight >= minX && clipLeft <= maxX && clipBottom >= minY && clipTop <= maxY;

          if (intersects) {
            state.selectedClipIds.add(clip.id);
          }
        });
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

    // ===== Lock Actions =====
    lockClip: (id) =>
      set((state) => {
        const clip = state.timeline?.clips.find((c) => c.id === id);
        if (clip) {
          clip.locked = true;
        }
      }),

    unlockClip: (id) =>
      set((state) => {
        const clip = state.timeline?.clips.find((c) => c.id === id);
        if (clip) {
          clip.locked = false;
        }
      }),

    toggleClipLock: (id) =>
      set((state) => {
        const clip = state.timeline?.clips.find((c) => c.id === id);
        if (clip) {
          clip.locked = !clip.locked;

          // Announce to screen readers
          if (typeof window !== 'undefined') {
            if (clip.locked) {
              timelineAnnouncements.clipLocked(getClipFileName(clip));
            } else {
              timelineAnnouncements.clipUnlocked(getClipFileName(clip));
            }
          }
        }
      }),

    lockSelectedClips: () =>
      set((state) => {
        if (!state.timeline) return;
        state.selectedClipIds.forEach((clipId) => {
          const clip = state.timeline!.clips.find((c) => c.id === clipId);
          if (clip) {
            clip.locked = true;
          }
        });
      }),

    unlockSelectedClips: () =>
      set((state) => {
        if (!state.timeline) return;
        state.selectedClipIds.forEach((clipId) => {
          const clip = state.timeline!.clips.find((c) => c.id === clipId);
          if (clip) {
            clip.locked = false;
          }
        });
      }),

    // ===== Group Actions =====
    groupSelectedClips: (name) =>
      set((state) => {
        if (!state.timeline || state.selectedClipIds.size < 2) return;

        // Initialize groups array if needed
        if (!state.timeline.groups) {
          state.timeline.groups = [];
        }

        // Generate group ID
        const groupId = `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Get selected clip IDs
        const clipIds = Array.from(state.selectedClipIds);

        // Create group
        state.timeline.groups.push({
          id: groupId,
          name: name || `Group ${state.timeline.groups.length + 1}`,
          clipIds,
          created_at: Date.now(),
        });

        // Set groupId on all selected clips
        state.timeline.clips.forEach((clip) => {
          if (clipIds.includes(clip.id)) {
            clip.groupId = groupId;
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

    ungroupClips: (groupId) =>
      set((state) => {
        if (!state.timeline || !state.timeline.groups) return;

        // Remove group
        state.timeline.groups = state.timeline.groups.filter((g) => g.id !== groupId);

        // Clear groupId from clips
        state.timeline.clips.forEach((clip) => {
          if (clip.groupId === groupId) {
            delete clip.groupId;
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

    getGroupClipIds: (groupId) => {
      const state = get();
      if (!state.timeline || !state.timeline.groups) return [];

      const group = state.timeline.groups.find((g) => g.id === groupId);
      return group ? [...group.clipIds] : [];
    },

    isClipGrouped: (clipId) => {
      const state = get();
      if (!state.timeline) return false;

      const clip = state.timeline.clips.find((c) => c.id === clipId);
      return Boolean(clip?.groupId);
    },

    getClipGroupId: (clipId) => {
      const state = get();
      if (!state.timeline) return null;

      const clip = state.timeline.clips.find((c) => c.id === clipId);
      return clip?.groupId || null;
    },

    // ===== Zoom Preset Actions =====
    /**
     * Calculate zoom to fit entire timeline in viewport
     * @param viewportWidth - Width of the timeline viewport in pixels
     * @returns Calculated zoom level (clamped to MIN_ZOOM-MAX_ZOOM)
     */
    calculateFitToTimelineZoom: (viewportWidth: number) => {
      const state = get();
      if (!state.timeline || state.timeline.clips.length === 0 || viewportWidth <= 0) {
        return DEFAULT_ZOOM;
      }

      // Calculate total timeline duration
      const timelineDuration = Math.max(
        ...state.timeline.clips.map((clip) => clip.timelinePosition + (clip.end - clip.start))
      );

      // Add 10% padding on each side for better visual spacing
      const padding = 0.1;
      const effectiveWidth = viewportWidth * (1 - 2 * padding);

      // Calculate zoom: pixels per second needed to fit duration in viewport
      const calculatedZoom = effectiveWidth / timelineDuration;

      // Clamp to valid zoom range
      return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, calculatedZoom));
    },

    /**
     * Calculate zoom to fit selected clips in viewport
     * @param viewportWidth - Width of the timeline viewport in pixels
     * @returns Calculated zoom level (clamped to MIN_ZOOM-MAX_ZOOM)
     */
    calculateFitToSelectionZoom: (viewportWidth: number) => {
      const state = get();
      if (!state.timeline || state.selectedClipIds.size === 0 || viewportWidth <= 0) {
        return state.zoom; // Return current zoom if no selection
      }

      // Get bounds of selected clips
      const selectedClips = state.timeline.clips.filter((clip) =>
        state.selectedClipIds.has(clip.id)
      );

      if (selectedClips.length === 0) {
        return state.zoom;
      }

      // Find min and max positions
      const minPosition = Math.min(...selectedClips.map((clip) => clip.timelinePosition));
      const maxPosition = Math.max(
        ...selectedClips.map((clip) => clip.timelinePosition + (clip.end - clip.start))
      );

      const selectionDuration = maxPosition - minPosition;

      // Add 10% padding on each side
      const padding = 0.1;
      const effectiveWidth = viewportWidth * (1 - 2 * padding);

      // Calculate zoom: pixels per second needed to fit selection in viewport
      const calculatedZoom = effectiveWidth / selectionDuration;

      // Clamp to valid zoom range
      return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, calculatedZoom));
    },

    /**
     * Apply zoom to fit entire timeline
     * @param viewportWidth - Width of the timeline viewport in pixels
     */
    fitToTimeline: (viewportWidth: number) => {
      const state = get();
      const newZoom = state.calculateFitToTimelineZoom(viewportWidth);
      set((s) => {
        s.zoom = newZoom;
      });
    },

    /**
     * Apply zoom to fit selected clips
     * @param viewportWidth - Width of the timeline viewport in pixels
     */
    fitToSelection: (viewportWidth: number) => {
      const state = get();
      const newZoom = state.calculateFitToSelectionZoom(viewportWidth);
      set((s) => {
        s.zoom = newZoom;
      });
    },

    /**
     * Set zoom to specific preset percentage
     * Presets are based on DEFAULT_ZOOM (50 px/s)
     * - 25% = 12.5 px/s
     * - 50% = 25 px/s
     * - 100% = 50 px/s (default)
     * - 200% = 100 px/s
     * - 400% = 200 px/s (max)
     * @param preset - Preset percentage (25, 50, 100, 200, 400)
     */
    setZoomPreset: (preset: 25 | 50 | 100 | 200 | 400) => {
      const zoomMap = {
        25: DEFAULT_ZOOM * 0.25,
        50: DEFAULT_ZOOM * 0.5,
        100: DEFAULT_ZOOM,
        200: DEFAULT_ZOOM * 2,
        400: DEFAULT_ZOOM * 4,
      };
      const newZoom = zoomMap[preset];
      set((state) => {
        state.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
      });
    },
  }))
);
