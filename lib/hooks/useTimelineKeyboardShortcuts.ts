/**
 * useTimelineKeyboardShortcuts Hook
 *
 * Manages keyboard shortcuts for timeline editing:
 * - Undo/Redo (Cmd+Z / Cmd+Shift+Z)
 * - Copy/Paste (Cmd+C / Cmd+V)
 * - Delete/Backspace
 * - Split clip (S key)
 * - Lock/Unlock selected clips (L key)
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
}: UseTimelineKeyboardShortcutsOptions) {
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

      // Delete/Backspace: Remove selected clips
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (selectedClipIds && removeClip && clearSelection) {
          selectedClipIds.forEach((id) => removeClip(id));
          clearSelection();
        }
      }

      // S: Split clip at playhead
      if (e.key === 's' || e.key === 'S') {
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
  ]);
}
