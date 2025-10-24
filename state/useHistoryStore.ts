/**
 * History Store - Undo/Redo Functionality
 *
 * Manages the undo/redo history for timeline operations.
 * Works in conjunction with the Timeline store to provide
 * time-travel debugging and operation reversal.
 *
 * Features:
 * - 50-action history buffer
 * - Debounced history saves
 * - Deep cloning for snapshots
 * - Undo/redo with state restoration
 *
 * Architecture:
 * - Uses structuredClone for deep copying
 * - Circular buffer for memory efficiency
 * - Per-operation debouncing
 * - State synchronization with Timeline store
 */
'use client';

import { create } from 'zustand';
import type { Timeline } from '@/types/timeline';
import { EDITOR_CONSTANTS } from '@/lib/constants';

const { MAX_HISTORY, HISTORY_DEBOUNCE_MS } = EDITOR_CONSTANTS;

/**
 * Deep clones a timeline for history snapshots.
 */
const cloneTimeline = (timeline: Timeline | null): Timeline | null => {
  if (!timeline) return null;
  return structuredClone(timeline);
};

/**
 * Debounce helper to reduce excessive history saves
 */
const historyDebounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
const debouncedSaveHistory = (key: string, callback: () => void): void => {
  const existingTimer = historyDebounceTimers.get(key);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }
  const timer = setTimeout((): void => {
    historyDebounceTimers.delete(key);
    callback();
  }, HISTORY_DEBOUNCE_MS);
  historyDebounceTimers.set(key, timer);
};

type HistoryStore = {
  // ===== State =====
  history: Timeline[];
  historyIndex: number;

  // ===== Actions =====
  saveToHistory: (timeline: Timeline | null, debounceKey?: string) => void;
  undo: () => Timeline | null;
  redo: () => Timeline | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;
  initializeHistory: (timeline: Timeline | null) => void;
};

export const useHistoryStore = create<HistoryStore>()((set, get) => ({
  history: [],
  historyIndex: -1,

  initializeHistory: (timeline): void =>
    set((): { history: Timeline[]; historyIndex: number; } => ({
      history: timeline ? [cloneTimeline(timeline)].filter((t): t is Timeline => t !== null) : [],
      historyIndex: timeline ? 0 : -1,
    })),

  saveToHistory: (timeline, debounceKey): void => {
    if (!timeline) return;

    const doSave = (): void => {
      const state = get();
      const cloned = cloneTimeline(timeline);
      if (!cloned) return;

      set((): { history: Timeline[]; historyIndex: number; } => ({
        history: [...state.history.slice(0, state.historyIndex + 1), cloned].slice(-MAX_HISTORY),
        historyIndex: Math.min(state.historyIndex + 1, MAX_HISTORY - 1),
      }));
    };

    if (debounceKey) {
      debouncedSaveHistory(debounceKey, doSave);
    } else {
      doSave();
    }
  },

  undo: (): Timeline | null => {
    const state = get();
    if (state.historyIndex > 0) {
      const newIndex = state.historyIndex - 1;
      const previousState = state.history[newIndex];
      if (previousState) {
        set((): { historyIndex: number; } => ({ historyIndex: newIndex }));
        // OPTIMIZATION: No need to clone on restore - the timeline is immutable
        // Cloning only happens when saving to history (line 82)
        return previousState;
      }
    }
    return null;
  },

  redo: (): Timeline | null => {
    const state = get();
    if (state.historyIndex < state.history.length - 1) {
      const newIndex = state.historyIndex + 1;
      const nextState = state.history[newIndex];
      if (nextState) {
        set((): { historyIndex: number; } => ({ historyIndex: newIndex }));
        // OPTIMIZATION: No need to clone on restore - the timeline is immutable
        // Cloning only happens when saving to history (line 82)
        return nextState;
      }
    }
    return null;
  },

  canUndo: (): boolean => {
    const state = get();
    return state.historyIndex > 0;
  },

  canRedo: (): boolean => {
    const state = get();
    return state.historyIndex < state.history.length - 1;
  },

  clearHistory: (): void =>
    set((): { history: never[]; historyIndex: number; } => ({
      history: [],
      historyIndex: -1,
    })),
}));
