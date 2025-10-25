/**
 * Text Overlays Slice - Text Overlay Management Operations
 *
 * Handles text overlay operations including:
 * - Adding, updating, removing text overlays
 */

import type { TextOverlay, Timeline } from '@/types/timeline';
import { EDITOR_CONSTANTS } from '@/lib/constants';

const { MAX_HISTORY } = EDITOR_CONSTANTS;

/**
 * Deep clones a timeline for history snapshots.
 */
const cloneTimeline = (timeline: Timeline | null): Timeline | null => {
  if (!timeline) return null;
  return structuredClone(timeline);
};

export interface TextOverlaysSlice {
  /** Add a text overlay to the timeline */
  addTextOverlay: (textOverlay: TextOverlay) => void;
  /** Remove a text overlay */
  removeTextOverlay: (id: string) => void;
  /** Update text overlay properties */
  updateTextOverlay: (id: string, patch: Partial<TextOverlay>) => void;
}

export interface TextOverlaysSliceState {
  timeline: Timeline | null;
  history: Timeline[];
  historyIndex: number;
}

export const createTextOverlaysSlice = (set: (fn: (state: TextOverlaysSliceState) => void) => void): TextOverlaysSlice => ({
  addTextOverlay: (textOverlay: TextOverlay): void =>
    set((state: TextOverlaysSliceState): void => {
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

  removeTextOverlay: (id: string): void =>
    set((state: TextOverlaysSliceState): void => {
      if (!state.timeline?.textOverlays) return;
      state.timeline.textOverlays = state.timeline.textOverlays.filter((t: TextOverlay): boolean => t.id !== id);

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

  updateTextOverlay: (id: string, patch: Partial<TextOverlay>): void =>
    set((state: TextOverlaysSliceState): void => {
      const textOverlay = state.timeline?.textOverlays?.find((t: TextOverlay): boolean => t.id === id);
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
});
