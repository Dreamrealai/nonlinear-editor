/**
 * Timeline Keyboard Shortcuts
 *
 * Centralized keyboard shortcuts for timeline editing with user customization support.
 * Replaces useTimelineKeyboardShortcuts with customizable version.
 */
'use client';

import { useCustomizableKeyboardShortcuts } from './useCustomizableKeyboardShortcuts';
import { useEditorStore } from '@/state/useEditorStore';
import toast from 'react-hot-toast';

interface UseTimelineShortcutsOptions {
  /** Enable/disable shortcuts */
  enabled?: boolean;
  /** Callback when transition panel should open */
  onAddTransition?: () => void;
}

/**
 * Hook that sets up all timeline keyboard shortcuts with user customization
 */
export function useTimelineShortcuts({
  enabled = true,
  onAddTransition,
}: UseTimelineShortcutsOptions = {}): void {
  // Get editor state and actions
  const timeline = useEditorStore((state) => state.timeline);
  const currentTime = useEditorStore((state) => state.currentTime);
  const selectedClipIds = useEditorStore((state) => state.selectedClipIds);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const canUndo = useEditorStore((state) => state.canUndo);
  const canRedo = useEditorStore((state) => state.canRedo);
  const copyClips = useEditorStore((state) => state.copyClips);
  const pasteClips = useEditorStore((state) => state.pasteClips);
  const removeClip = useEditorStore((state) => state.removeClip);
  const clearSelection = useEditorStore((state) => state.clearSelection);
  const selectClip = useEditorStore((state) => state.selectClip);
  const splitClipAtTime = useEditorStore((state) => state.splitClipAtTime);
  const toggleClipLock = useEditorStore((state) => state.toggleClipLock);

  // Define shortcut actions
  useCustomizableKeyboardShortcuts({
    enabled,
    actions: [
      // General actions
      {
        id: 'undo',
        description: 'Undo the last action',
        category: 'general',
        priority: 10,
        action: () => {
          if (canUndo()) {
            undo();
            toast.success('Undo', { duration: 1000 });
          }
        },
      },
      {
        id: 'redo',
        description: 'Redo the last undone action',
        category: 'general',
        priority: 10,
        action: () => {
          if (canRedo()) {
            redo();
            toast.success('Redo', { duration: 1000 });
          }
        },
      },

      // Editing actions
      {
        id: 'copy',
        description: 'Copy selected clips',
        category: 'editing',
        action: () => {
          if (selectedClipIds.size > 0) {
            copyClips();
            toast.success(
              `Copied ${selectedClipIds.size} clip${selectedClipIds.size > 1 ? 's' : ''}`,
              { duration: 1500 }
            );
          }
        },
      },
      {
        id: 'paste',
        description: 'Paste copied clips',
        category: 'editing',
        action: () => {
          pasteClips();
        },
      },
      {
        id: 'delete',
        description: 'Delete selected clips',
        category: 'editing',
        action: () => {
          if (selectedClipIds.size > 0) {
            const count = selectedClipIds.size;
            selectedClipIds.forEach((clipId) => removeClip(clipId));
            toast.success(`Deleted ${count} clip${count > 1 ? 's' : ''}`, { duration: 1500 });
          }
        },
      },
      {
        id: 'selectAll',
        description: 'Select all clips in timeline',
        category: 'editing',
        action: () => {
          if (timeline?.clips && timeline.clips.length > 0) {
            clearSelection();
            timeline.clips.forEach((clip) => selectClip(clip.id, true));
            toast.success(
              `Selected ${timeline.clips.length} clip${timeline.clips.length > 1 ? 's' : ''}`,
              { duration: 1500 }
            );
          }
        },
      },

      // Timeline-specific actions
      {
        id: 'splitClip',
        description: 'Split clip at playhead position',
        category: 'timeline',
        action: () => {
          if (!timeline?.clips) return;

          const clipAtPlayhead = timeline.clips.find((clip) => {
            const clipStart = clip.timelinePosition;
            const clipEnd = clipStart + (clip.end - clip.start);
            return currentTime > clipStart && currentTime < clipEnd;
          });

          if (clipAtPlayhead) {
            splitClipAtTime(clipAtPlayhead.id, currentTime);
            toast.success('Clip split', { duration: 1000 });
          }
        },
      },
      {
        id: 'toggleLock',
        description: 'Lock/unlock selected clips',
        category: 'timeline',
        action: () => {
          if (selectedClipIds.size > 0) {
            selectedClipIds.forEach((clipId) => toggleClipLock(clipId));
          }
        },
      },
      {
        id: 'addTransition',
        description: 'Add transition to selected clips',
        category: 'timeline',
        action: () => {
          if (selectedClipIds.size > 0 && onAddTransition) {
            onAddTransition();
          }
        },
      },
    ],
  });
}
