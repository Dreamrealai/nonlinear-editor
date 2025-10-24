/**
 * Timeline Store - Clip and Timeline Management
 *
 * Manages the core timeline data including clips, markers, tracks, and text overlays.
 * This store is responsible for the main timeline state without playback or history concerns.
 *
 * Features:
 * - Timeline initialization and updates
 * - Clip CRUD operations
 * - Clip reordering and splitting
 * - Marker management
 * - Track management
 * - Text overlay management
 * - Transition management
 *
 * Architecture:
 * - Uses Immer for immutable updates
 * - Automatic deduplication of clips
 * - Validation of clip durations and positions
 */
'use client';

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Timeline, Clip, Marker, Track, TextOverlay, TransitionType } from '@/types/timeline';
import { CLIP_CONSTANTS } from '@/lib/constants';

const { MIN_CLIP_DURATION } = CLIP_CONSTANTS;

/**
 * Removes duplicate clips from an array.
 * Keeps the last occurrence of each unique clip ID.
 */
const dedupeClips = (clips: Clip[]): Clip[] => {
  const seen = new Set<string>();
  const deduped: Clip[] = [];
  for (let i = clips.length - 1; i >= 0; i -= 1) {
    const clip = clips[i];
    if (!clip) continue;
    if (seen.has(clip.id)) continue;
    seen.add(clip.id);
    deduped.unshift(clip);
  }
  return deduped;
};

type TimelineStore = {
  // ===== State =====
  timeline: Timeline | null;

  // ===== Timeline Actions =====
  setTimeline: (timeline: Timeline) => void;
  getTimeline: () => Timeline | null;

  // ===== Clip Actions =====
  addClip: (clip: Clip) => void;
  updateClip: (id: string, patch: Partial<Clip>) => void;
  removeClip: (id: string) => void;
  reorderClips: (ids: string[]) => void;
  splitClipAtTime: (clipId: string, time: number) => void;

  // ===== Marker Actions =====
  addMarker: (marker: Marker) => void;
  removeMarker: (id: string) => void;
  updateMarker: (id: string, patch: Partial<Marker>) => void;

  // ===== Track Actions =====
  updateTrack: (trackIndex: number, patch: Partial<Track>) => void;

  // ===== Text Overlay Actions =====
  addTextOverlay: (textOverlay: TextOverlay) => void;
  removeTextOverlay: (id: string) => void;
  updateTextOverlay: (id: string, patch: Partial<TextOverlay>) => void;

  // ===== Transition Actions =====
  addTransitionToClips: (
    clipIds: string[],
    transitionType: TransitionType,
    duration: number
  ) => void;
};

export const useTimelineStore = create<TimelineStore>()(
  immer((set, get) => ({
    timeline: null,

    setTimeline: (timeline) =>
      set((state) => {
        state.timeline = timeline;
        if (state.timeline) {
          state.timeline.clips = dedupeClips(state.timeline.clips);
        }
      }),

    getTimeline: () => get().timeline,

    addClip: (clip) =>
      set((state) => {
        if (!state.timeline) return;
        state.timeline.clips.push(clip);
        state.timeline.clips = dedupeClips(state.timeline.clips);
      }),

    updateClip: (id, patch) =>
      set((state) => {
        const clip = state.timeline?.clips.find((existing) => existing.id === id);
        if (!clip) return;

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
          if (typeof clip.sourceDuration === 'number' && clip.end > clip.sourceDuration) {
            clip.end = clip.sourceDuration;
            clip.start = Math.max(0, clip.end - MIN_CLIP_DURATION);
          }
        }

        if (state.timeline) {
          state.timeline.clips = dedupeClips(state.timeline.clips);
        }
      }),

    removeClip: (id) =>
      set((state) => {
        if (!state.timeline) return;
        state.timeline.clips = state.timeline.clips.filter((clip) => clip.id !== id);
        state.timeline.clips = dedupeClips(state.timeline.clips);
      }),

    reorderClips: (ids) =>
      set((state) => {
        if (!state.timeline) return;
        const clipMap = new Map(state.timeline.clips.map((clip) => [clip.id, clip]));
        state.timeline.clips = ids
          .map((id) => clipMap.get(id))
          .filter((clip): clip is Clip => Boolean(clip));
        state.timeline.clips = dedupeClips(state.timeline.clips);
      }),

    splitClipAtTime: (clipId, time) =>
      set((state) => {
        if (!state.timeline) return;
        const clipIndex = state.timeline.clips.findIndex((c) => c.id === clipId);
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

    addTextOverlay: (textOverlay) =>
      set((state) => {
        if (!state.timeline) return;
        if (!state.timeline.textOverlays) {
          state.timeline.textOverlays = [];
        }
        state.timeline.textOverlays.push(textOverlay);
      }),

    removeTextOverlay: (id) =>
      set((state) => {
        if (!state.timeline?.textOverlays) return;
        state.timeline.textOverlays = state.timeline.textOverlays.filter((t) => t.id !== id);
      }),

    updateTextOverlay: (id, patch) =>
      set((state) => {
        const textOverlay = state.timeline?.textOverlays?.find((t) => t.id === id);
        if (textOverlay) {
          Object.assign(textOverlay, patch);
        }
      }),

    addTransitionToClips: (clipIds, transitionType, duration) =>
      set((state) => {
        if (!state.timeline) return;
        clipIds.forEach((clipId) => {
          const clip = state.timeline!.clips.find((c) => c.id === clipId);
          if (clip) {
            clip.transitionToNext = { type: transitionType, duration };
          }
        });
      }),
  }))
);
