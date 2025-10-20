'use client';

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';
import type { Timeline, Clip, Marker, Track } from '@/types/timeline';

const MAX_HISTORY = 50; // Maximum undo history
const MIN_CLIP_DURATION = 0.1;

// Allow Immer to proxy Map/Set instances (used by selectedClipIds)
enableMapSet();

type EditorStore = {
  timeline: Timeline | null;
  currentTime: number; // Playhead position in seconds
  zoom: number; // Pixels per second
  selectedClipIds: Set<string>; // Multi-select support
  copiedClips: Clip[]; // Clipboard for copy/paste
  history: Timeline[]; // Undo history
  historyIndex: number; // Current position in history
  setTimeline: (timeline: Timeline) => void;
  addClip: (clip: Clip) => void;
  reorderClips: (ids: string[]) => void;
  updateClip: (id: string, patch: Partial<Clip>) => void;
  removeClip: (id: string) => void;
  splitClipAtTime: (clipId: string, time: number) => void;
  setCurrentTime: (time: number) => void;
  setZoom: (zoom: number) => void;
  addMarker: (marker: Marker) => void;
  removeMarker: (id: string) => void;
  updateMarker: (id: string, patch: Partial<Marker>) => void;
  updateTrack: (trackIndex: number, patch: Partial<Track>) => void;
  selectClip: (id: string, multi?: boolean) => void;
  clearSelection: () => void;
  copyClips: () => void;
  pasteClips: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
};

// Helper to deep clone timeline for history
const cloneTimeline = (timeline: Timeline | null): Timeline | null => {
  if (!timeline) return null;
  return JSON.parse(JSON.stringify(timeline));
};

const dedupeClips = (clips: Clip[]): Clip[] => {
  const seen = new Set<string>();
  const deduped: Clip[] = [];
  for (let i = clips.length - 1; i >= 0; i -= 1) {
    const clip = clips[i];
    if (seen.has(clip.id)) {
      continue;
    }
    seen.add(clip.id);
    deduped.unshift(clip);
  }
  return deduped;
};

export const useEditorStore = create<EditorStore>()(
  immer((set, get) => ({
    timeline: null,
    currentTime: 0,
    zoom: 50, // 50 pixels per second default
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

          clip.timelinePosition = Number.isFinite(clip.timelinePosition) ? Math.max(0, clip.timelinePosition) : 0;
          clip.start = Number.isFinite(clip.start) ? clip.start : 0;
          clip.end = Number.isFinite(clip.end) ? clip.end : clip.start + MIN_CLIP_DURATION;

          if (clip.sourceDuration === undefined || clip.sourceDuration === null) {
            clip.sourceDuration = null;
          } else if (typeof clip.sourceDuration === 'number' && Number.isFinite(clip.sourceDuration)) {
            clip.sourceDuration = Math.max(clip.sourceDuration, MIN_CLIP_DURATION);
          } else {
            clip.sourceDuration = null;
          }

          if (typeof clip.sourceDuration === 'number') {
            const maxDuration = Math.max(clip.sourceDuration, MIN_CLIP_DURATION);
            clip.start = Math.min(Math.max(clip.start, 0), Math.max(0, maxDuration - MIN_CLIP_DURATION));
            clip.end = Math.min(Math.max(clip.end, clip.start + MIN_CLIP_DURATION), maxDuration);
          } else {
            clip.start = Math.max(clip.start, 0);
            clip.end = Math.max(clip.end, clip.start + MIN_CLIP_DURATION);
          }

          const currentDuration = clip.end - clip.start;
          if (currentDuration < MIN_CLIP_DURATION - 1e-6) {
            const desiredEnd = clip.start + MIN_CLIP_DURATION;
            if (typeof clip.sourceDuration === 'number' && desiredEnd > clip.sourceDuration) {
              clip.end = clip.sourceDuration;
              clip.start = Math.max(0, clip.end - MIN_CLIP_DURATION);
            } else {
              clip.end = desiredEnd;
            }
          }

          clip.timelinePosition = Math.max(clip.timelinePosition, 0);

          if (state.timeline) {
            state.timeline.clips = dedupeClips(state.timeline.clips);
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
        state.zoom = Math.max(10, Math.min(200, zoom)); // Clamp between 10-200 px/s
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
        const selected = state.timeline.clips.filter((clip) =>
          state.selectedClipIds.has(clip.id)
        );
        state.copiedClips = JSON.parse(JSON.stringify(selected));
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
