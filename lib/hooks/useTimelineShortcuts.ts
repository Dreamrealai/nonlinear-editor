/**
 * Timeline Keyboard Shortcuts
 *
 * Centralized keyboard shortcuts for timeline editing with user customization support.
 * Replaces useTimelineKeyboardShortcuts with customizable version.
 */
'use client';

import { useCustomizableKeyboardShortcuts } from './useCustomizableKeyboardShortcuts';
import { useEditorStore } from '@/state/useEditorStore';
import type { Timeline } from '@/types/timeline';
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
  const timeline = useEditorStore((state): Timeline | null => state.timeline);
  const currentTime = useEditorStore((state): number => state.currentTime);
  const selectedClipIds = useEditorStore((state): Set<string> => state.selectedClipIds);
  const undo = useEditorStore((state): () => void => state.undo);
  const redo = useEditorStore((state): () => void => state.redo);
  const canUndo = useEditorStore((state): () => boolean => state.canUndo);
  const canRedo = useEditorStore((state): () => boolean => state.canRedo);
  const copyClips = useEditorStore((state): () => void => state.copyClips);
  const pasteClips = useEditorStore((state): () => void => state.pasteClips);
  const removeClip = useEditorStore((state): (id: string) => void => state.removeClip);
  const clearSelection = useEditorStore((state): () => void => state.clearSelection);
  const selectClip = useEditorStore((state): (id: string, multi?: boolean) => void => state.selectClip);
  const splitClipAtTime = useEditorStore((state): (clipId: string, time: number) => void => state.splitClipAtTime);
  const toggleClipLock = useEditorStore((state): (id: string) => void => state.toggleClipLock);

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
        action: (): void => {
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
        action: (): void => {
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
        action: (): void => {
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
        action: (): void => {
          pasteClips();
        },
      },
      {
        id: 'delete',
        description: 'Delete selected clips',
        category: 'editing',
        action: (): void => {
          if (selectedClipIds.size > 0) {
            const count = selectedClipIds.size;
            selectedClipIds.forEach((clipId): void => removeClip(clipId));
            toast.success(`Deleted ${count} clip${count > 1 ? 's' : ''}`, { duration: 1500 });
          }
        },
      },
      {
        id: 'selectAll',
        description: 'Select all clips in timeline',
        category: 'editing',
        action: (): void => {
          if (timeline?.clips && timeline.clips.length > 0) {
            clearSelection();
            timeline.clips.forEach((clip): void => selectClip(clip.id, true));
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
        action: (): void => {
          if (!timeline?.clips) return;

          const clipAtPlayhead = timeline.clips.find((clip): boolean => {
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
        action: (): void => {
          if (selectedClipIds.size > 0) {
            selectedClipIds.forEach((clipId): void => toggleClipLock(clipId));
          }
        },
      },
      {
        id: 'addTransition',
        description: 'Add transition to selected clips',
        category: 'timeline',
        action: (): void => {
          if (selectedClipIds.size > 0 && onAddTransition) {
            onAddTransition();
          }
        },
      },
    ],
  });
}
