'use client';

import React, { useState, useEffect } from 'react';
import { X, Keyboard } from 'lucide-react';
import {
  type KeyboardShortcut,
  formatShortcut,
  getShortcutsByCategory,
  useGlobalKeyboardShortcuts,
} from '@/lib/hooks/useGlobalKeyboardShortcuts';

interface KeyboardShortcutsHelpProps {
  /** List of shortcuts to display */
  shortcuts: KeyboardShortcut[];
  /** Controlled open state */
  isOpen?: boolean;
  /** Callback when modal should close */
  onClose?: () => void;
}

const categoryLabels: Record<string, string> = {
  general: 'General',
  playback: 'Playback',
  editing: 'Editing',
  navigation: 'Navigation',
  other: 'Other',
};

/**
 * Keyboard Shortcuts Help Modal
 *
 * Displays all available keyboard shortcuts grouped by category.
 * Can be opened with Ctrl/Cmd+? or Ctrl/Cmd+/
 */
export function KeyboardShortcutsHelp({
  shortcuts,
  isOpen: controlledIsOpen,
  onClose,
}: KeyboardShortcutsHelpProps): React.ReactElement | null {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const handleClose = (): void => {
    if (controlledIsOpen !== undefined) {
      onClose?.();
    } else {
      setInternalIsOpen(false);
    }
  };

  // Register shortcut to open help modal (Ctrl/Cmd+? or Ctrl/Cmd+/)
  useGlobalKeyboardShortcuts({
    shortcuts: [
      {
        id: 'open-shortcuts-help',
        keys: ['meta', '?'],
        description: 'Show keyboard shortcuts',
        category: 'general',
        action: (): void => {
          if (controlledIsOpen === undefined) {
            setInternalIsOpen(true);
          }
        },
        priority: 100, // High priority
      },
      {
        id: 'open-shortcuts-help-alt',
        keys: ['meta', '/'],
        description: 'Show keyboard shortcuts',
        category: 'general',
        action: (): void => {
          if (controlledIsOpen === undefined) {
            setInternalIsOpen(true);
          }
        },
        priority: 100,
      },
    ],
    enabled: !isOpen, // Disable when modal is open
  });

  // Close on Escape key
  useEffect((): (() => void) => {
    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return (): void => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, handleClose]);

  // Prevent body scroll when modal is open
  useEffect((): (() => void) => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return (): void => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const groupedShortcuts = getShortcutsByCategory(shortcuts);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleClose}
      onKeyDown={(e): void => {
        if (e.key === 'Escape') {
          handleClose();
        }
      }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-modal-title"
        className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <Keyboard className="h-6 w-6 text-neutral-700" />
            <h2 id="shortcuts-modal-title" className="text-xl font-bold text-neutral-900">
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)] px-6 py-4">
          {Object.entries(groupedShortcuts).map(
            ([category, categoryShortcuts]): React.ReactElement | null => {
              if (categoryShortcuts.length === 0) return null;

              return (
                <div key={category} className="mb-6 last:mb-0">
                  <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wider mb-3">
                    {categoryLabels[category] || category}
                  </h3>
                  <div className="space-y-2">
                    {categoryShortcuts.map(
                      (shortcut): React.ReactElement => (
                        <div
                          key={shortcut.id}
                          className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-neutral-50 transition-colors"
                        >
                          <span className="text-sm text-neutral-700">{shortcut.description}</span>
                          <kbd className="flex items-center gap-1 rounded bg-neutral-100 px-3 py-1.5 text-xs font-mono font-semibold text-neutral-700 border border-neutral-300 shadow-sm">
                            {formatShortcut(shortcut.keys)}
                          </kbd>
                        </div>
                      )
                    )}
                  </div>
                </div>
              );
            }
          )}

          {Object.values(groupedShortcuts).every((arr): boolean => arr.length === 0) && (
            <div className="text-center py-12">
              <p className="text-neutral-500">No keyboard shortcuts available</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-200 px-6 py-3 bg-neutral-50">
          <p className="text-xs text-neutral-500 text-center">
            Press{' '}
            <kbd className="px-2 py-0.5 rounded bg-neutral-200 text-neutral-700 font-mono text-xs">
              Esc
            </kbd>{' '}
            to close
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to manage keyboard shortcuts help modal
 */
export function useKeyboardShortcutsHelp(): {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
} {
  const [isOpen, setIsOpen] = useState(false);

  const open = (): void => setIsOpen(true);
  const close = (): void => setIsOpen(false);
  const toggle = (): void => setIsOpen((prev): boolean => !prev);

  return {
    isOpen,
    open,
    close,
    toggle,
  };
}
