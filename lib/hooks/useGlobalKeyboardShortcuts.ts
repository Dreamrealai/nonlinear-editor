/**
 * Global Keyboard Shortcuts Hook
 *
 * Provides a centralized keyboard shortcut system with:
 * - Configurable shortcuts
 * - Priority-based execution
 * - Context-aware handling
 * - Help modal integration
 */
'use client';

import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardShortcut {
  /** Unique identifier for the shortcut */
  id: string;
  /** Shortcut key combination */
  keys: string[];
  /** Description of what the shortcut does */
  description: string;
  /** Category for grouping in help modal */
  category: 'general' | 'playback' | 'editing' | 'navigation' | 'timeline' | 'other';
  /** Action to execute when shortcut is triggered */
  action: () => void;
  /** Priority for execution (higher = earlier, default = 0) */
  priority?: number;
  /** Enable/disable this shortcut */
  enabled?: boolean;
}

interface UseGlobalKeyboardShortcutsOptions {
  /** List of shortcuts to register */
  shortcuts: KeyboardShortcut[];
  /** Enable/disable all shortcuts */
  enabled?: boolean;
  /** Disable shortcuts when typing in inputs */
  disableInInputs?: boolean;
}

/**
 * Detects if the user is on a Mac
 */
const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().includes('MAC');

/**
 * Checks if an element should block keyboard shortcuts (e.g., input fields)
 */
function isTypingContext(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  const isContentEditable = target.isContentEditable;
  return isContentEditable || tagName === 'input' || tagName === 'textarea' || tagName === 'select';
}

/**
 * Normalize key names for consistency
 */
function normalizeKey(key: string): string {
  const keyMap: Record<string, string> = {
    ' ': 'space',
    spacebar: 'space',
    esc: 'escape',
    del: 'delete',
    cmd: 'meta',
    command: 'meta',
    ctrl: 'control',
    opt: 'alt',
    option: 'alt',
  };

  const normalized = key.toLowerCase().trim();
  return keyMap[normalized] || normalized;
}

/**
 * Convert shortcut keys array to a string representation
 */
export function formatShortcut(keys: string[]): string {
  return keys
    .map((key): string => {
      const normalized = normalizeKey(key);
      if (normalized === 'meta') {
        return isMac ? 'Cmd' : 'Ctrl';
      }
      if (normalized === 'control') {
        return 'Ctrl';
      }
      if (normalized === 'shift') {
        return 'Shift';
      }
      if (normalized === 'alt') {
        return isMac ? 'Opt' : 'Alt';
      }
      if (normalized === 'space') {
        return 'Space';
      }
      return key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
    })
    .join('+');
}

/**
 * Check if the pressed keys match a shortcut
 */
function matchesShortcut(event: KeyboardEvent, shortcutKeys: string[]): boolean {
  const pressedKeys = new Set<string>();

  // Add modifier keys
  if (event.metaKey) pressedKeys.add('meta');
  if (event.ctrlKey) pressedKeys.add('control');
  if (event.shiftKey) pressedKeys.add('shift');
  if (event.altKey) pressedKeys.add('alt');

  // Add main key
  const mainKey = normalizeKey(event.key);
  pressedKeys.add(mainKey);

  // Normalize shortcut keys
  const normalizedShortcut = shortcutKeys.map(normalizeKey);

  // Check if all shortcut keys are pressed
  if (normalizedShortcut.length !== pressedKeys.size) {
    return false;
  }

  return normalizedShortcut.every((key): boolean => pressedKeys.has(key));
}

/**
 * Global keyboard shortcuts hook
 */
export function useGlobalKeyboardShortcuts({
  shortcuts,
  enabled = true,
  disableInInputs = true,
}: UseGlobalKeyboardShortcutsOptions): void {
  // Store shortcuts in a ref to avoid recreating the handler
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent): void => {
      // Check if shortcuts are enabled
      if (!enabled) return;

      // Don't trigger shortcuts when typing in inputs
      if (disableInInputs && isTypingContext(event.target)) {
        return;
      }

      // Sort shortcuts by priority (higher priority first)
      const sortedShortcuts = [...shortcutsRef.current]
        .filter((s): boolean => s.enabled !== false)
        .sort((a, b): number => (b.priority || 0) - (a.priority || 0));

      // Find and execute the first matching shortcut
      for (const shortcut of sortedShortcuts) {
        if (matchesShortcut(event, shortcut.keys)) {
          event.preventDefault();
          event.stopPropagation();
          shortcut.action();
          break; // Only execute the first match
        }
      }
    },
    [enabled, disableInInputs]
  );

  useEffect((): (() => void) => {
    window.addEventListener('keydown', handleKeyDown);
    return (): void => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Get all keyboard shortcuts grouped by category
 */
export function getShortcutsByCategory(
  shortcuts: KeyboardShortcut[]
): Record<string, KeyboardShortcut[]> {
  const grouped: Record<string, KeyboardShortcut[]> = {
    general: [],
    playback: [],
    editing: [],
    navigation: [],
    other: [],
  };

  shortcuts.forEach((shortcut): void => {
    if (shortcut.enabled !== false) {
      if (!grouped[shortcut.category]) {
        grouped[shortcut.category] = [];
      }
      grouped[shortcut.category]?.push(shortcut);
    }
  });

  return grouped;
}
