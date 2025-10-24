/**
 * Selection Store - Clip Selection Management
 *
 * Manages which clips are currently selected in the timeline.
 * Supports single and multi-selection modes.
 *
 * Features:
 * - Single clip selection
 * - Multi-selection with toggle
 * - Selection clearing
 * - Selection queries
 *
 * Architecture:
 * - Uses Set for O(1) lookups
 * - Immer middleware for Set support
 * - Simple, focused API
 */
'use client';

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';

enableMapSet();

type SelectionStore = {
  // ===== State =====
  selectedClipIds: Set<string>;

  // ===== Actions =====
  selectClip: (id: string, multi?: boolean) => void;
  deselectClip: (id: string) => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
  getSelectedCount: () => number;
  getSelectedIds: () => string[];
};

export const useSelectionStore = create<SelectionStore>()(
  immer((set, get) => ({
    selectedClipIds: new Set<string>(),

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

    deselectClip: (id) =>
      set((state) => {
        state.selectedClipIds.delete(id);
      }),

    clearSelection: () =>
      set((state) => {
        state.selectedClipIds.clear();
      }),

    isSelected: (id) => get().selectedClipIds.has(id),

    getSelectedCount: () => get().selectedClipIds.size,

    getSelectedIds: () => Array.from(get().selectedClipIds),
  }))
);
