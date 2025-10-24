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

/**
 * High-level editor actions with history integration
 */
export const useEditorActions = () => {
  // ===== Timeline Actions with History =====

  const addClipWithHistory = (clip: Clip) => {
    useTimelineStore.getState().addClip(clip);
    const timeline = useTimelineStore.getState().timeline;
    useHistoryStore.getState().saveToHistory(timeline);
  };

  const updateClipWithHistory = (id: string, patch: Partial<Clip>) => {
    useTimelineStore.getState().updateClip(id, patch);
    const timeline = useTimelineStore.getState().timeline;
    // Debounced by clip ID to prevent excessive history saves during dragging
    useHistoryStore.getState().saveToHistory(timeline, `update-${id}`);
  };

  const removeClipWithHistory = (id: string) => {
    useTimelineStore.getState().removeClip(id);
    useSelectionStore.getState().deselectClip(id);
    const timeline = useTimelineStore.getState().timeline;
    useHistoryStore.getState().saveToHistory(timeline);
  };

  const reorderClipsWithHistory = (ids: string[]) => {
    useTimelineStore.getState().reorderClips(ids);
    const timeline = useTimelineStore.getState().timeline;
    useHistoryStore.getState().saveToHistory(timeline);
  };

  const splitClipAtTimeWithHistory = (clipId: string, time: number) => {
    useTimelineStore.getState().splitClipAtTime(clipId, time);
    const timeline = useTimelineStore.getState().timeline;
    useHistoryStore.getState().saveToHistory(timeline);
  };

  // ===== Marker Actions with History =====

  const addMarkerWithHistory = (marker: Marker) => {
    useTimelineStore.getState().addMarker(marker);
    const timeline = useTimelineStore.getState().timeline;
    useHistoryStore.getState().saveToHistory(timeline);
  };

  const removeMarkerWithHistory = (id: string) => {
    useTimelineStore.getState().removeMarker(id);
    const timeline = useTimelineStore.getState().timeline;
    useHistoryStore.getState().saveToHistory(timeline);
  };

  const updateMarkerWithHistory = (id: string, patch: Partial<Marker>) => {
    useTimelineStore.getState().updateMarker(id, patch);
    const timeline = useTimelineStore.getState().timeline;
    useHistoryStore.getState().saveToHistory(timeline, `marker-${id}`);
  };

  // ===== Text Overlay Actions with History =====

  const addTextOverlayWithHistory = (textOverlay: TextOverlay) => {
    useTimelineStore.getState().addTextOverlay(textOverlay);
    const timeline = useTimelineStore.getState().timeline;
    useHistoryStore.getState().saveToHistory(timeline);
  };

  const removeTextOverlayWithHistory = (id: string) => {
    useTimelineStore.getState().removeTextOverlay(id);
    const timeline = useTimelineStore.getState().timeline;
    useHistoryStore.getState().saveToHistory(timeline);
  };

  const updateTextOverlayWithHistory = (id: string, patch: Partial<TextOverlay>) => {
    useTimelineStore.getState().updateTextOverlay(id, patch);
    const timeline = useTimelineStore.getState().timeline;
    useHistoryStore.getState().saveToHistory(timeline, `overlay-${id}`);
  };

  // ===== Transition Actions with History =====

  const addTransitionToSelectedClips = (transitionType: TransitionType, duration: number) => {
    const selectedIds = useSelectionStore.getState().getSelectedIds();
    useTimelineStore.getState().addTransitionToClips(selectedIds, transitionType, duration);
    const timeline = useTimelineStore.getState().timeline;
    useHistoryStore.getState().saveToHistory(timeline);
  };

  // ===== Copy/Paste Actions =====

  const copySelectedClips = () => {
    const timeline = useTimelineStore.getState().timeline;
    const selectedIds = useSelectionStore.getState().getSelectedIds();
    const selectedClips = timeline?.clips.filter((c) => selectedIds.includes(c.id)) || [];
    useClipboardStore.getState().copyClips(selectedClips);
  };

  const pasteClipsAtCurrentTime = () => {
    const currentTime = usePlaybackStore.getState().currentTime;
    const pastedClips = useClipboardStore.getState().pasteClips(currentTime);

    if (pastedClips.length === 0) return;

    // Add all pasted clips
    pastedClips.forEach((clip) => {
      useTimelineStore.getState().addClip(clip);
    });

    // Save to history
    const timeline = useTimelineStore.getState().timeline;
    useHistoryStore.getState().saveToHistory(timeline);

    // Select pasted clips
    useSelectionStore.getState().clearSelection();
    pastedClips.forEach((clip) => {
      useSelectionStore.getState().selectClip(clip.id, true);
    });
  };

  // ===== Undo/Redo Actions =====

  const undo = () => {
    const previousTimeline = useHistoryStore.getState().undo();
    if (previousTimeline) {
      useTimelineStore.getState().setTimeline(previousTimeline);
    }
  };

  const redo = () => {
    const nextTimeline = useHistoryStore.getState().redo();
    if (nextTimeline) {
      useTimelineStore.getState().setTimeline(nextTimeline);
    }
  };

  // ===== Initialization =====

  const initializeEditor = (timeline: Timeline | null) => {
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
