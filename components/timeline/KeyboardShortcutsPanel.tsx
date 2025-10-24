/**
 * KeyboardShortcutsPanel Component
 *
 * A modal dialog that displays all available keyboard shortcuts for the timeline editor.
 * Organized by category (Playback, Editing, Navigation, Selection).
 * Platform-specific display (Cmd on Mac, Ctrl on Windows).
 *
 * @example
 * ```tsx
 * const [isOpen, setIsOpen] = useState(false);
 * <KeyboardShortcutsPanel open={isOpen} onOpenChange={setIsOpen} />
 * ```
 */
'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Kbd } from '@/components/ui/Kbd';

/**
 * Props for the KeyboardShortcutsPanel component
 */
export interface KeyboardShortcutsPanelProps {
  /**
   * Whether the dialog is open
   */
  open: boolean;
  /**
   * Callback when the dialog open state changes
   */
  onOpenChange: (open: boolean) => void;
}

/**
 * Keyboard shortcut definition
 */
interface KeyboardShortcut {
  keys: string[];
  description: string;
  condition?: string;
}

/**
 * Keyboard shortcuts grouped by category
 */
interface ShortcutCategory {
  title: string;
  shortcuts: KeyboardShortcut[];
}

/**
 * All keyboard shortcuts organized by category
 */
const KEYBOARD_SHORTCUTS: ShortcutCategory[] = [
  {
    title: 'Editing',
    shortcuts: [
      {
        keys: ['Mod', 'Z'],
        description: 'Undo last action',
      },
      {
        keys: ['Mod', 'Shift', 'Z'],
        description: 'Redo last undone action',
      },
      {
        keys: ['Mod', 'Y'],
        description: 'Redo (alternative)',
      },
      {
        keys: ['Mod', 'C'],
        description: 'Copy selected clips',
      },
      {
        keys: ['Mod', 'V'],
        description: 'Paste copied clips',
      },
      {
        keys: ['Delete'],
        description: 'Delete selected clips',
      },
      {
        keys: ['Backspace'],
        description: 'Delete selected clips (alternative)',
      },
      {
        keys: ['S'],
        description: 'Split clip at playhead',
        condition: 'Clip under playhead',
      },
    ],
  },
  {
    title: 'Clips & Effects',
    shortcuts: [
      {
        keys: ['L'],
        description: 'Toggle lock/unlock selected clips',
        condition: 'Clips selected',
      },
      {
        keys: ['T'],
        description: 'Add transition to selected clips',
        condition: 'Clips selected',
      },
      {
        keys: ['G'],
        description: 'Group selected clips',
        condition: '2+ clips selected',
      },
      {
        keys: ['Shift', 'G'],
        description: 'Ungroup selected clips',
        condition: 'Clips selected',
      },
    ],
  },
  {
    title: 'Timeline',
    shortcuts: [
      {
        keys: ['M'],
        description: 'Add marker at playhead',
      },
      {
        keys: ['Shift', 'R'],
        description: 'Add guide at playhead',
      },
    ],
  },
  {
    title: 'Help',
    shortcuts: [
      {
        keys: ['?'],
        description: 'Show keyboard shortcuts (this dialog)',
      },
    ],
  },
];

/**
 * Displays all available keyboard shortcuts in a modal dialog
 *
 * Features:
 * - Organized by category (Editing, Clips & Effects, Timeline, Help)
 * - Platform-specific modifier keys (Cmd on Mac, Ctrl on Windows)
 * - Visual keyboard key badges
 * - Conditional hints for shortcuts requiring specific states
 *
 * @param open - Whether the dialog is open
 * @param onOpenChange - Callback when open state changes
 * @returns A modal dialog with categorized keyboard shortcuts
 */
export function KeyboardShortcutsPanel({ open, onOpenChange }: KeyboardShortcutsPanelProps): React.ReactElement {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            All available keyboard shortcuts for the timeline editor. Press{' '}
            <Kbd keys={['?']} /> to open this dialog anytime.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {KEYBOARD_SHORTCUTS.map((category): React.ReactElement => (
            <div key={category.title}>
              <h3 className="text-sm font-semibold text-neutral-900 mb-3">{category.title}</h3>
              <div className="space-y-2">
                {category.shortcuts.map((shortcut, index): React.ReactElement => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-neutral-50 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="text-sm text-neutral-700">{shortcut.description}</p>
                      {shortcut.condition && (
                        <p className="text-xs text-neutral-500 mt-0.5">
                          Requires: {shortcut.condition}
                        </p>
                      )}
                    </div>
                    <Kbd keys={shortcut.keys} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-neutral-200">
          <p className="text-xs text-neutral-600">
            <strong>Note:</strong> Keyboard shortcuts are disabled when typing in input fields or
            text areas.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
