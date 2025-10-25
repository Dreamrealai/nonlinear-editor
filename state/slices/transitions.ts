/**
 * Transitions Slice - Transition Management Operations
 *
 * Handles transition operations including:
 * - Adding transitions to selected clips
 */

import type { Timeline, TransitionType, Clip } from '@/types/timeline';
import { EDITOR_CONSTANTS } from '@/lib/constants';

const { MAX_HISTORY } = EDITOR_CONSTANTS;

/**
 * Deep clones a timeline for history snapshots.
 */
const cloneTimeline = (timeline: Timeline | null): Timeline | null => {
  if (!timeline) return null;
  return structuredClone(timeline);
};

export interface TransitionsSlice {
  /** Add a transition to selected clips */
  addTransitionToSelectedClips: (transitionType: TransitionType, duration: number) => void;
}

export interface TransitionsSliceState {
  timeline: Timeline | null;
  selectedClipIds: Set<string>;
  history: Timeline[];
  historyIndex: number;
}

export const createTransitionsSlice = (set: (fn: (state: TransitionsSliceState) => void) => void): TransitionsSlice => ({
  addTransitionToSelectedClips: (transitionType: TransitionType, duration: number): void =>
    set((state: TransitionsSliceState): void => {
      if (!state.timeline) return;

      state.selectedClipIds.forEach((clipId: string): void => {
        const clip = state.timeline!.clips.find((c: Clip): boolean => c.id === clipId);
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
});
