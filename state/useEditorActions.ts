/**
 * Editor Actions - High-level actions with history integration
 *
 * This module provides high-level actions that combine multiple stores
 * and automatically handle history tracking. Use these actions instead of
 * calling store methods directly to ensure undo/redo works correctly.
 *
 * Features:
 * - Automatic history tracking
 * - Copy/paste with selection management
 * - Undo/redo with state synchronization
 * - Transition management
 *
 * Architecture:
 * - Wraps low-level store operations
 * - Coordinates between multiple stores
 * - Ensures consistent state updates
 */
'use client';

import type { Clip, Marker, TextOverlay, TransitionType, Timeline } from '@/types/timeline';
import {
  useTimelineStore,
  usePlaybackStore,
  useSelectionStore,
  useHistoryStore,
  useClipboardStore,
} from './index';

interface EditorActions {
  addClip: (clip: Clip) => void;
  updateClip: (id: string, patch: Partial<Clip>) => void;
  removeClip: (id: string) => void;
  reorderClips: (ids: string[]) => void;
  splitClipAtTime: (clipId: string, time: number) => void;
  addMarker: (marker: Marker) => void;
  removeMarker: (id: string) => void;
  updateMarker: (id: string, patch: Partial<Marker>) => void;
  addTextOverlay: (textOverlay: TextOverlay) => void;
  removeTextOverlay: (id: string) => void;
  updateTextOverlay: (id: string, patch: Partial<TextOverlay>) => void;
  addTransitionToSelectedClips: (transitionType: TransitionType, duration: number) => void;
  copySelectedClips: () => void;
  pasteClipsAtCurrentTime: () => void;
  undo: () => void;
  redo: () => void;
  initializeEditor: (timeline: Timeline | null) => void;
}

/**
 * High-level editor actions with history integration
 */
export const useEditorActions = (): EditorActions => {
  // ===== Timeline Actions with History =====

  const addClipWithHistory = (clip: Clip): void => {
    useTimelineStore.getState().addClip(clip);
    const timeline = useTimelineStore.getState().timeline;
    useHistoryStore.getState().saveToHistory(timeline);
  };

  const updateClipWithHistory = (id: string, patch: Partial<Clip>): void => {
    useTimelineStore.getState().updateClip(id, patch);
    const timeline = useTimelineStore.getState().timeline;
    // Debounced by clip ID to prevent excessive history saves during dragging
    useHistoryStore.getState().saveToHistory(timeline, `update-${id}`);
  };

  const removeClipWithHistory = (id: string): void => {
    useTimelineStore.getState().removeClip(id);
    useSelectionStore.getState().deselectClip(id);
    const timeline = useTimelineStore.getState().timeline;
    useHistoryStore.getState().saveToHistory(timeline);
  };

  const reorderClipsWithHistory = (ids: string[]): void => {
    useTimelineStore.getState().reorderClips(ids);
    const timeline = useTimelineStore.getState().timeline;
    useHistoryStore.getState().saveToHistory(timeline);
  };

  const splitClipAtTimeWithHistory = (clipId: string, time: number): void => {
    useTimelineStore.getState().splitClipAtTime(clipId, time);
    const timeline = useTimelineStore.getState().timeline;
    useHistoryStore.getState().saveToHistory(timeline);
  };

  // ===== Marker Actions with History =====

  const addMarkerWithHistory = (marker: Marker): void => {
    useTimelineStore.getState().addMarker(marker);
    const timeline = useTimelineStore.getState().timeline;
    useHistoryStore.getState().saveToHistory(timeline);
  };

  const removeMarkerWithHistory = (id: string): void => {
    useTimelineStore.getState().removeMarker(id);
    const timeline = useTimelineStore.getState().timeline;
    useHistoryStore.getState().saveToHistory(timeline);
  };

  const updateMarkerWithHistory = (id: string, patch: Partial<Marker>): void => {
    useTimelineStore.getState().updateMarker(id, patch);
    const timeline = useTimelineStore.getState().timeline;
    useHistoryStore.getState().saveToHistory(timeline, `marker-${id}`);
  };

  // ===== Text Overlay Actions with History =====

  const addTextOverlayWithHistory = (textOverlay: TextOverlay): void => {
    useTimelineStore.getState().addTextOverlay(textOverlay);
    const timeline = useTimelineStore.getState().timeline;
    useHistoryStore.getState().saveToHistory(timeline);
  };

  const removeTextOverlayWithHistory = (id: string): void => {
    useTimelineStore.getState().removeTextOverlay(id);
    const timeline = useTimelineStore.getState().timeline;
    useHistoryStore.getState().saveToHistory(timeline);
  };

  const updateTextOverlayWithHistory = (id: string, patch: Partial<TextOverlay>): void => {
    useTimelineStore.getState().updateTextOverlay(id, patch);
    const timeline = useTimelineStore.getState().timeline;
    useHistoryStore.getState().saveToHistory(timeline, `overlay-${id}`);
  };

  // ===== Transition Actions with History =====

  const addTransitionToSelectedClips = (transitionType: TransitionType, duration: number): void => {
    const selectedIds = useSelectionStore.getState().getSelectedIds();
    useTimelineStore.getState().addTransitionToClips(selectedIds, transitionType, duration);
    const timeline = useTimelineStore.getState().timeline;
    useHistoryStore.getState().saveToHistory(timeline);
  };

  // ===== Copy/Paste Actions =====

  const copySelectedClips = (): void => {
    const timeline = useTimelineStore.getState().timeline;
    const selectedIds = useSelectionStore.getState().getSelectedIds();
    const selectedClips = timeline?.clips.filter((c): boolean => selectedIds.includes(c.id)) || [];
    useClipboardStore.getState().copyClips(selectedClips);
  };

  const pasteClipsAtCurrentTime = (): void => {
    const currentTime = usePlaybackStore.getState().currentTime;
    const pastedClips = useClipboardStore.getState().pasteClips(currentTime);

    if (pastedClips.length === 0) return;

    // Add all pasted clips
    pastedClips.forEach((clip): void => {
      useTimelineStore.getState().addClip(clip);
    });

    // Save to history
    const timeline = useTimelineStore.getState().timeline;
    useHistoryStore.getState().saveToHistory(timeline);

    // Select pasted clips
    useSelectionStore.getState().clearSelection();
    pastedClips.forEach((clip): void => {
      useSelectionStore.getState().selectClip(clip.id, true);
    });
  };

  // ===== Undo/Redo Actions =====

  const undo = (): void => {
    const previousTimeline = useHistoryStore.getState().undo();
    if (previousTimeline) {
      useTimelineStore.getState().setTimeline(previousTimeline);
    }
  };

  const redo = (): void => {
    const nextTimeline = useHistoryStore.getState().redo();
    if (nextTimeline) {
      useTimelineStore.getState().setTimeline(nextTimeline);
    }
  };

  // ===== Initialization =====

  const initializeEditor = (timeline: Timeline | null): void => {
    if (timeline) {
      useTimelineStore.getState().setTimeline(timeline);
      useHistoryStore.getState().initializeHistory(timeline);
    }
    useSelectionStore.getState().clearSelection();
    useClipboardStore.getState().clearClipboard();
    usePlaybackStore.getState().setCurrentTime(0);
  };

  return {
    // Timeline with history
    addClip: addClipWithHistory,
    updateClip: updateClipWithHistory,
    removeClip: removeClipWithHistory,
    reorderClips: reorderClipsWithHistory,
    splitClipAtTime: splitClipAtTimeWithHistory,

    // Markers with history
    addMarker: addMarkerWithHistory,
    removeMarker: removeMarkerWithHistory,
    updateMarker: updateMarkerWithHistory,

    // Text overlays with history
    addTextOverlay: addTextOverlayWithHistory,
    removeTextOverlay: removeTextOverlayWithHistory,
    updateTextOverlay: updateTextOverlayWithHistory,

    // Transitions with history
    addTransitionToSelectedClips,

    // Copy/paste
    copySelectedClips,
    pasteClipsAtCurrentTime,

    // Undo/redo
    undo,
    redo,

    // Initialization
    initializeEditor,
  };
};
