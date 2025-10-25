/**
 * Tracks Slice - Track Management Operations
 *
 * Handles track-related operations including:
 * - Updating track properties
 * - Auto-creating tracks
 */

import type { Track, Timeline } from '@/types/timeline';

export interface TracksSlice {
  /** Update or create a track (auto-creates if not exists) */
  updateTrack: (trackIndex: number, patch: Partial<Track>) => void;
}

export interface TracksSliceState {
  timeline: Timeline | null;
}

export const createTracksSlice = (set: (fn: (state: TracksSliceState) => void) => void): TracksSlice => ({
  updateTrack: (trackIndex: number, patch: Partial<Track>): void =>
    set((state: TracksSliceState): void => {
      if (!state.timeline) return;
      if (!state.timeline.tracks) {
        state.timeline.tracks = [];
      }

      let track = state.timeline.tracks.find((t: Track): boolean => t.index === trackIndex);
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
});
