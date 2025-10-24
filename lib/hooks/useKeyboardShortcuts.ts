/**
 * Keyboard Shortcuts Hook
 *
 * Provides keyboard shortcut handling for the video editor.
 * Supports both Mac (Cmd) and Windows/Linux (Ctrl) modifiers.
 *
 * Shortcuts:
 * - Cmd/Ctrl+Z: Undo
 * - Cmd+Shift+Z / Ctrl+Y: Redo
 * - Delete/Backspace: Delete selected clips
 * - Cmd/Ctrl+C: Copy selected clips
 * - Cmd/Ctrl+V: Paste clips
 * - Cmd/Ctrl+A: Select all clips
 * - Space: Play/Pause (when not typing)
 */
'use client';

import { useEffect } from 'react';
import { useEditorStore } from '@/state/useEditorStore';
import type { Timeline } from '@/types/timeline';
import toast from 'react-hot-toast';

type KeyboardShortcutOptions = {
  /** Enable/disable all shortcuts */
  enabled?: boolean;
  /** Callback when play/pause is triggered */
  onPlayPause?: () => void;
};

/**
 * Detects if the user is on a Mac
 */
const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().includes('MAC');

/**
 * Checks if an element should block keyboard shortcuts (e.g., input fields)
 */
const isTypingContext = (target: EventTarget | null): boolean => {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  const isContentEditable = target.isContentEditable;
  return isContentEditable || tagName === 'input' || tagName === 'textarea' || tagName === 'select';
};

export function useKeyboardShortcuts(options: KeyboardShortcutOptions = {}): void {
  const { enabled = true, onPlayPause } = options;

  const timeline = useEditorStore((state): Timeline | null => state.timeline);
  const selectedClipIds = useEditorStore((state): Set<string> => state.selectedClipIds);
  const undo = useEditorStore((state): () => void => state.undo);
  const redo = useEditorStore((state): () => void => state.redo);
  const canUndo = useEditorStore((state): () => boolean => state.canUndo);
  const canRedo = useEditorStore((state): () => boolean => state.canRedo);
  const removeClip = useEditorStore((state): (id: string) => void => state.removeClip);
  const copyClips = useEditorStore((state): () => void => state.copyClips);
  const pasteClips = useEditorStore((state): () => void => state.pasteClips);
  const selectClip = useEditorStore((state): (id: string, multi?: boolean) => void => state.selectClip);
  const clearSelection = useEditorStore((state): () => void => state.clearSelection);

  useEffect((): (() => void) | undefined => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent): void => {
      // Don't trigger shortcuts when typing in inputs
      if (isTypingContext(event.target)) {
        return;
      }

      const metaKey = isMac ? event.metaKey : event.ctrlKey;
      const shiftKey = event.shiftKey;
      const key = event.key.toLowerCase();

      // Undo: Cmd+Z or Ctrl+Z
      if (metaKey && key === 'z' && !shiftKey) {
        if (canUndo()) {
          event.preventDefault();
          undo();
          toast.success('Undo', { duration: 1000 });
        }
        return;
      }

      // Redo: Cmd+Shift+Z (Mac) or Ctrl+Y (Windows/Linux) or Ctrl+Shift+Z
      if ((metaKey && shiftKey && key === 'z') || (metaKey && key === 'y' && !isMac)) {
        if (canRedo()) {
          event.preventDefault();
          redo();
          toast.success('Redo', { duration: 1000 });
        }
        return;
      }

      // Copy: Cmd+C or Ctrl+C
      if (metaKey && key === 'c') {
        if (selectedClipIds.size > 0) {
          event.preventDefault();
          copyClips();
          toast.success(
            `Copied ${selectedClipIds.size} clip${selectedClipIds.size > 1 ? 's' : ''}`,
            {
              duration: 1500,
            }
          );
        }
        return;
      }

      // Paste: Cmd+V or Ctrl+V
      if (metaKey && key === 'v') {
        event.preventDefault();
        pasteClips();
        return;
      }

      // Select All: Cmd+A or Ctrl+A
      if (metaKey && key === 'a') {
        if (timeline?.clips && timeline.clips.length > 0) {
          event.preventDefault();
          clearSelection();
          timeline.clips.forEach((clip): void => selectClip(clip.id, true));
          toast.success(
            `Selected ${timeline.clips.length} clip${timeline.clips.length > 1 ? 's' : ''}`,
            {
              duration: 1500,
            }
          );
        }
        return;
      }

      // Delete: Delete or Backspace
      if (key === 'delete' || key === 'backspace') {
        if (selectedClipIds.size > 0) {
          event.preventDefault();
          const count = selectedClipIds.size;
          selectedClipIds.forEach((clipId): void => removeClip(clipId));
          toast.success(`Deleted ${count} clip${count > 1 ? 's' : ''}`, { duration: 1500 });
        }
        return;
      }

      // Play/Pause: Space
      if (key === ' ' || key === 'spacebar') {
        event.preventDefault();
        if (onPlayPause) {
          onPlayPause();
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return (): void => window.removeEventListener('keydown', handleKeyDown);
  }, [
    enabled,
    timeline,
    selectedClipIds,
    undo,
    redo,
    canUndo,
    canRedo,
    removeClip,
    copyClips,
    pasteClips,
    selectClip,
    clearSelection,
    onPlayPause,
  ]);
}
