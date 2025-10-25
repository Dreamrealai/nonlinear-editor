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
import type { WritableDraft } from 'immer';
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
  setTimeline: (timeline: Timeline | null) => void;
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

  // ===== Lock Actions =====
  lockClip: (id: string) => void;
  unlockClip: (id: string) => void;
  toggleClipLock: (id: string) => void;
};

export const useTimelineStore = create<TimelineStore>()(
  immer((set, get) => ({
    timeline: null,

    setTimeline: (timeline): void =>
      set((state): void => {
        state.timeline = timeline;
        if (state.timeline) {
          state.timeline.clips = dedupeClips(state.timeline.clips);
        }
      }),

    getTimeline: (): Timeline | null => get().timeline,

    addClip: (clip): void =>
      set((state): void => {
        if (!state.timeline) return;
        state.timeline.clips.push(clip);
        state.timeline.clips = dedupeClips(state.timeline.clips);
      }),

    updateClip: (id, patch): void =>
      set((state): void => {
        const clip = state.timeline?.clips.find((existing): boolean => existing.id === id);
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

    removeClip: (id): void =>
      set((state): void => {
        if (!state.timeline) return;
        state.timeline.clips = state.timeline.clips.filter((clip): boolean => clip.id !== id);
        state.timeline.clips = dedupeClips(state.timeline.clips);
      }),

    reorderClips: (ids): void =>
      set((state): void => {
        if (!state.timeline) return;
        const clipMap = new Map(
          state.timeline.clips.map((clip): [string, WritableDraft<Clip>] => [clip.id, clip])
        );
        state.timeline.clips = ids
          .map((id) => clipMap.get(id))
          .filter((clip): clip is Clip => Boolean(clip));
        state.timeline.clips = dedupeClips(state.timeline.clips);
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
      }),

    addMarker: (marker): void =>
      set((state): void => {
        if (!state.timeline) return;
        if (!state.timeline.markers) {
          state.timeline.markers = [];
        }
        state.timeline.markers.push(marker);
      }),

    removeMarker: (id): void =>
      set((state): void => {
        if (!state.timeline?.markers) return;
        state.timeline.markers = state.timeline.markers.filter((m): boolean => m.id !== id);
      }),

    updateMarker: (id, patch): void =>
      set((state): void => {
        const marker = state.timeline?.markers?.find((m): boolean => m.id === id);
        if (marker) {
          Object.assign(marker, patch);
        }
      }),

    updateTrack: (trackIndex, patch): void =>
      set((state): void => {
        if (!state.timeline) return;
        if (!state.timeline.tracks) {
          state.timeline.tracks = [];
        }

        let track = state.timeline.tracks.find((t): boolean => t.index === trackIndex);
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

    addTextOverlay: (textOverlay): void =>
      set((state): void => {
        if (!state.timeline) return;
        if (!state.timeline.textOverlays) {
          state.timeline.textOverlays = [];
        }
        state.timeline.textOverlays.push(textOverlay);
      }),

    removeTextOverlay: (id): void =>
      set((state): void => {
        if (!state.timeline?.textOverlays) return;
        state.timeline.textOverlays = state.timeline.textOverlays.filter(
          (t): boolean => t.id !== id
        );
      }),

    updateTextOverlay: (id, patch): void =>
      set((state): void => {
        const textOverlay = state.timeline?.textOverlays?.find((t): boolean => t.id === id);
        if (textOverlay) {
          Object.assign(textOverlay, patch);
        }
      }),

    addTransitionToClips: (clipIds, transitionType, duration): void =>
      set((state): void => {
        if (!state.timeline) return;
        clipIds.forEach((clipId): void => {
          const clip = state.timeline!.clips.find((c): boolean => c.id === clipId);
          if (clip) {
            clip.transitionToNext = { type: transitionType, duration };
          }
        });
      }),

    lockClip: (id): void =>
      set((state): void => {
        const clip = state.timeline?.clips.find((c): boolean => c.id === id);
        if (clip) {
          clip.locked = true;
        }
      }),

    unlockClip: (id): void =>
      set((state): void => {
        const clip = state.timeline?.clips.find((c): boolean => c.id === id);
        if (clip) {
          clip.locked = false;
        }
      }),

    toggleClipLock: (id): void =>
      set((state): void => {
        const clip = state.timeline?.clips.find((c): boolean => c.id === id);
        if (clip) {
          clip.locked = !clip.locked;
        }
      }),
  }))
);
