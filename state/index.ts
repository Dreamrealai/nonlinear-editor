/**
 * State Management - Centralized Store Exports
 *
 * This file provides centralized exports for all Zustand stores.
 * Each store is now domain-specific and focused on a single responsibility.
 *
 * Store Architecture:
 * - useTimelineStore: Core timeline data (clips, markers, tracks, overlays)
 * - usePlaybackStore: Playback controls (time, zoom, play/pause)
 * - useSelectionStore: Clip selection management
 * - useHistoryStore: Undo/redo functionality
 * - useClipboardStore: Copy/paste operations
 *
 * Migration from useEditorStore:
 * The original useEditorStore (610 lines) has been split into 5 focused stores
 * for better maintainability, performance, and testing.
 *
 * Benefits:
 * - Reduced re-renders (components only subscribe to relevant stores)
 * - Better code organization and separation of concerns
 * - Easier testing (each store can be tested independently)
 * - Improved performance (smaller state updates)
 * - Clearer API boundaries
 */

// Core stores
export { useTimelineStore } from './useTimelineStore';
export { usePlaybackStore } from './usePlaybackStore';
export { useSelectionStore } from './useSelectionStore';
export { useHistoryStore } from './useHistoryStore';
export { useClipboardStore } from './useClipboardStore';

// Legacy export for backward compatibility
// This will be removed after full migration
export { useEditorStore } from './useEditorStore';

/**
 * Composite hook for components that need multiple stores
 * Use this during migration to maintain existing behavior
 *
 * NOTE: Temporarily disabled to resolve build issues - will be re-enabled after build completion
 */
/*
export const useEditor = () => {
  const timeline = useTimelineStore();
  const playback = usePlaybackStore();
  const selection = useSelectionStore();
  const history = useHistoryStore();
  const clipboard = useClipboardStore();

  return {
    // Timeline
    timeline: timeline.timeline,
    setTimeline: timeline.setTimeline,
    addClip: timeline.addClip,
    updateClip: timeline.updateClip,
    removeClip: timeline.removeClip,
    reorderClips: timeline.reorderClips,
    splitClipAtTime: timeline.splitClipAtTime,
    addMarker: timeline.addMarker,
    removeMarker: timeline.removeMarker,
    updateMarker: timeline.updateMarker,
    updateTrack: timeline.updateTrack,
    addTextOverlay: timeline.addTextOverlay,
    removeTextOverlay: timeline.removeTextOverlay,
    updateTextOverlay: timeline.updateTextOverlay,
    addTransitionToClips: timeline.addTransitionToClips,

    // Playback
    currentTime: playback.currentTime,
    zoom: playback.zoom,
    isPlaying: playback.isPlaying,
    setCurrentTime: playback.setCurrentTime,
    setZoom: playback.setZoom,
    play: playback.play,
    pause: playback.pause,
    togglePlayPause: playback.togglePlayPause,

    // Selection
    selectedClipIds: selection.selectedClipIds,
    selectClip: selection.selectClip,
    deselectClip: selection.deselectClip,
    clearSelection: selection.clearSelection,
    isSelected: selection.isSelected,
    getSelectedCount: selection.getSelectedCount,
    getSelectedIds: selection.getSelectedIds,

    // History
    saveToHistory: history.saveToHistory,
    undo: history.undo,
    redo: history.redo,
    canUndo: history.canUndo,
    canRedo: history.canRedo,

    // Clipboard
    copyClips: clipboard.copyClips,
    pasteClips: clipboard.pasteClips,
    hasClips: clipboard.hasClips,
  };
};
*/
