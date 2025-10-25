/**
 * Guides Slice - Timeline Guide Operations
 *
 * Handles guide-related operations including:
 * - Adding, updating, removing guides
 * - Toggling guide visibility
 */
import type { Guide, Timeline } from '@/types/timeline';
import type { WritableDraft } from 'immer';

export interface GuidesSlice {
  /** Timeline guides for precise alignment */
  guides: Guide[];
  /** Add a timeline guide */
  addGuide: (guide: Guide) => void;
  /** Remove a guide */
  removeGuide: (id: string) => void;
  /** Update guide properties */
  updateGuide: (id: string, patch: Partial<Guide>) => void;
  /** Toggle guide visibility */
  toggleGuideVisibility: (id: string) => void;
  /** Toggle all guides visibility */
  toggleAllGuidesVisibility: () => void;
  /** Clear all guides */
  clearAllGuides: () => void;
}

export interface GuidesSliceState {
  timeline: Timeline | null;
  guides: Guide[];
}

/**
 * Zustand set function type with Immer middleware
 */
type SetState = (fn: (state: WritableDraft<GuidesSliceState>) => void) => void;

export const createGuidesSlice = (set: SetState): GuidesSlice => ({
  guides: [],

  addGuide: (guide: Guide): void =>
    set((state): void => {
      if (!state.timeline) return;
      if (!state.timeline.guides) {
        state.timeline.guides = [];
      }
      state.timeline.guides.push(guide);
    }),

  removeGuide: (id: string): void =>
    set((state): void => {
      if (!state.timeline?.guides) return;
      state.timeline.guides = state.timeline.guides.filter((g: Guide): boolean => g.id !== id);
    }),

  updateGuide: (id: string, patch: Partial<Guide>): void =>
    set((state): void => {
      const guide = state.timeline?.guides?.find((g: Guide): boolean => g.id === id);
      if (guide) {
        Object.assign(guide, patch);
      }
    }),

  toggleGuideVisibility: (id: string): void =>
    set((state): void => {
      const guide = state.timeline?.guides?.find((g: Guide): boolean => g.id === id);
      if (guide) {
        guide.visible = !guide.visible;
      }
    }),

  toggleAllGuidesVisibility: (): void =>
    set((state): void => {
      if (!state.timeline?.guides) return;
      const anyVisible = state.timeline.guides.some((g: Guide): boolean => g.visible !== false);
      state.timeline.guides.forEach((guide: Guide): void => {
        guide.visible = !anyVisible;
      });
    }),

  clearAllGuides: (): void =>
    set((state): void => {
      if (!state.timeline) return;
      state.timeline.guides = [];
    }),
});
