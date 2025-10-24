/**
 * Clipboard Store - Copy/Paste Operations
 *
 * Manages the clipboard for copy/paste operations.
 * Works with the Selection and Timeline stores to provide
 * standard clipboard functionality.
 *
 * Features:
 * - Copy selected clips
 * - Paste with relative positioning
 * - Clipboard state persistence
 * - Multi-clip support
 *
 * Architecture:
 * - Deep clones clips to prevent mutations
 * - Preserves relative positions
 * - Generates new IDs on paste
 */
'use client';

import { create } from 'zustand';
import type { Clip } from '@/types/timeline';

type ClipboardStore = {
  // ===== State =====
  copiedClips: Clip[];

  // ===== Actions =====
  copyClips: (clips: Clip[]) => void;
  pasteClips: (targetTime: number) => Clip[];
  clearClipboard: () => void;
  hasClips: () => boolean;
};

export const useClipboardStore = create<ClipboardStore>()((set, get) => ({
  copiedClips: [],

  copyClips: (clips) =>
    set(() => ({
      copiedClips: structuredClone(clips),
    })),

  pasteClips: (targetTime) => {
    const state = get();
    if (state.copiedClips.length === 0) return [];

    const pastedClips: Clip[] = [];
    const minPosition = Math.min(...state.copiedClips.map((c) => c.timelinePosition));

    state.copiedClips.forEach((copiedClip) => {
      const offset = copiedClip.timelinePosition - minPosition;
      const newClip: Clip = {
        ...copiedClip,
        id: `${copiedClip.id}-paste-${Date.now()}-${Math.random()}`,
        timelinePosition: targetTime + offset,
      };
      pastedClips.push(newClip);
    });

    return pastedClips;
  },

  clearClipboard: () => set(() => ({ copiedClips: [] })),

  hasClips: () => get().copiedClips.length > 0,
}));
