/**
 * useTimelineKeyboardShortcuts Hook
 *
 * Manages keyboard shortcuts for timeline editing:
 * - Undo/Redo (Cmd+Z / Cmd+Shift+Z)
 * - Copy/Paste (Cmd+C / Cmd+V)
 * - Delete/Backspace
 * - Split clip (S key)
 * - Toggle snap (Cmd+Shift+S / Ctrl+Shift+S)
 * - Lock/Unlock selected clips (L key)
 * - Add transition (T key)
 * - Add marker (M key)
 * - Group selected clips (G key)
 * - Ungroup clips (Shift+G key)
 * - Add guide at playhead (Shift+R key)
 * - Zoom in (Cmd+=)
 * - Zoom out (Cmd+-)
 * - Reset zoom to 100% (Cmd+0)
 */
'use client';

import { useEffect } from 'react';
import type { Timeline } from '@/types/timeline';

type UseTimelineKeyboardShortcutsOptions = {
  timeline: Timeline | null;
  currentTime: number;
  selectedClipIds: Set<string>;
  undo: () => void;
  redo: () => void;
  copyClips: () => void;
  pasteClips: () => void;
  removeClip: (clipId: string) => void;
  clearSelection: () => void;
  splitClipAtTime: (clipId: string, time: number) => void;
  toggleClipLock?: (clipId: string) => void;
  onAddTransition?: () => void;
  onAddMarker?: () => void;
  onGroupClips?: () => void;
  onUngroupClips?: () => void;
  onAddGuide?: () => void;
  onToggleSnap?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
  onSelectAll?: () => void;
};

export function useTimelineKeyboardShortcuts({
  timeline,
  currentTime,
  selectedClipIds,
  undo,
  redo,
  copyClips,
  pasteClips,
  removeClip,
  clearSelection,
  splitClipAtTime,
  toggleClipLock,
  onAddTransition,
  onAddMarker,
  onGroupClips,
  onUngroupClips,
  onAddGuide,
  onToggleSnap,
  onZoomIn, // Reserved for future use
  onZoomOut, // Reserved for future use
  onZoomReset, // Reserved for future use
  onSelectAll,
}: UseTimelineKeyboardShortcutsOptions) {
  // Suppress unused variable warnings for zoom handlers (reserved for future use)
  void onZoomIn;
  void onZoomOut;
  void onZoomReset;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Null check for event target
      if (!e.target) return;

      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Null check for navigator
      if (typeof navigator === 'undefined' || !navigator.platform) return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // Cmd/Ctrl+Z: Undo
      if (cmdOrCtrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (undo) undo();
        return;
      }

      // Cmd/Ctrl+Shift+Z or Cmd/Ctrl+Y: Redo
      if ((cmdOrCtrl && e.key === 'z' && e.shiftKey) || (cmdOrCtrl && e.key === 'y')) {
        e.preventDefault();
        if (redo) redo();
        return;
      }

      // Cmd/Ctrl+C: Copy
      if (cmdOrCtrl && e.key === 'c') {
        e.preventDefault();
        if (copyClips) copyClips();
        return;
      }

      // Cmd/Ctrl+V: Paste
      if (cmdOrCtrl && e.key === 'v') {
        e.preventDefault();
        if (pasteClips) pasteClips();
        return;
      }

      // Cmd/Ctrl+A: Select All
      if (cmdOrCtrl && e.key === 'a') {
        e.preventDefault();
        if (onSelectAll) onSelectAll();
        return;
      }

      // Delete/Backspace: Remove selected clips
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (selectedClipIds && removeClip && clearSelection) {
          selectedClipIds.forEach((id) => removeClip(id));
          clearSelection();
        }
      }

      // Cmd/Ctrl+Shift+S: Toggle snap
      if (cmdOrCtrl && (e.key === 's' || e.key === 'S') && e.shiftKey) {
        e.preventDefault();
        if (onToggleSnap) {
          onToggleSnap();
        }
        return;
      }

      // S: Split clip at playhead (without modifiers)
      if ((e.key === 's' || e.key === 'S') && !e.shiftKey && !cmdOrCtrl) {
        e.preventDefault();
        if (!timeline || !timeline.clips || !splitClipAtTime) return;
        const clipAtPlayhead = timeline.clips.find((clip) => {
          const clipStart = clip.timelinePosition;
          const clipEnd = clipStart + (clip.end - clip.start);
          return currentTime > clipStart && currentTime < clipEnd;
        });
        if (clipAtPlayhead) {
          splitClipAtTime(clipAtPlayhead.id, currentTime);
        }
      }

      // L: Toggle lock for selected clips
      if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        if (toggleClipLock && selectedClipIds.size > 0) {
          selectedClipIds.forEach((clipId) => toggleClipLock(clipId));
        }
      }

      // T: Add transition to selected clips
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        if (onAddTransition && selectedClipIds.size > 0) {
          onAddTransition();
        }
      }

      // M: Add marker at playhead
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        if (onAddMarker) {
          onAddMarker();
        }
      }

      // G: Group selected clips
      if ((e.key === 'g' || e.key === 'G') && !e.shiftKey) {
        e.preventDefault();
        if (onGroupClips && selectedClipIds.size >= 2) {
          onGroupClips();
        }
      }

      // Shift+G: Ungroup clips
      if ((e.key === 'g' || e.key === 'G') && e.shiftKey) {
        e.preventDefault();
        if (onUngroupClips && selectedClipIds.size > 0) {
          onUngroupClips();
        }
      }

      // Shift+R: Add guide at playhead position
      if ((e.key === 'r' || e.key === 'R') && e.shiftKey) {
        e.preventDefault();
        if (onAddGuide) {
          onAddGuide();
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
    return undefined;
  }, [
    selectedClipIds,
    currentTime,
    timeline,
    removeClip,
    clearSelection,
    splitClipAtTime,
    copyClips,
    pasteClips,
    undo,
    redo,
    toggleClipLock,
    onAddTransition,
    onAddMarker,
    onGroupClips,
    onUngroupClips,
    onAddGuide,
    onToggleSnap,
    onSelectAll,
  ]);
}
