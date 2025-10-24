/**
 * Customizable Keyboard Shortcuts Hook
 *
 * Enhanced version of keyboard shortcuts that respects user customization.
 * Combines useUserKeyboardShortcuts with useGlobalKeyboardShortcuts.
 */
'use client';

import { useMemo } from 'react';
import { useUserKeyboardShortcuts } from './useUserKeyboardShortcuts';
import { useGlobalKeyboardShortcuts, type KeyboardShortcut } from './useGlobalKeyboardShortcuts';

interface ShortcutAction {
  id: string;
  action: () => void;
  description: string;
  category: 'general' | 'playback' | 'editing' | 'navigation' | 'timeline' | 'other';
  priority?: number;
}

interface UseCustomizableKeyboardShortcutsOptions {
  /** Shortcut actions to register */
  actions: ShortcutAction[];
  /** Enable/disable all shortcuts */
  enabled?: boolean;
  /** Disable shortcuts when typing in inputs */
  disableInInputs?: boolean;
}

/**
 * Hook that combines user preferences with keyboard shortcut actions
 */
export function useCustomizableKeyboardShortcuts({
  actions,
  enabled = true,
  disableInInputs = true,
}: UseCustomizableKeyboardShortcutsOptions): void {
  const { shortcuts: userShortcuts, loading } = useUserKeyboardShortcuts();

  // Combine user shortcuts with action definitions
  const shortcuts = useMemo<KeyboardShortcut[]>((): { id: string; keys: string[]; description: string; category: "general" | "playback" | "editing" | "navigation" | "timeline" | "other"; action: () => void; priority: number | undefined; enabled: boolean; }[] => {
    return actions.map((actionDef): { id: string; keys: string[]; description: string; category: "general" | "playback" | "editing" | "navigation" | "timeline" | "other"; action: () => void; priority: number | undefined; enabled: boolean; } => {
      // Find user's custom shortcut for this action
      const userShortcut = userShortcuts.find((s): boolean => s.id === actionDef.id);

      return {
        id: actionDef.id,
        keys: userShortcut?.keys || [],
        description: actionDef.description,
        category: actionDef.category,
        action: actionDef.action,
        priority: actionDef.priority,
        enabled: userShortcut?.enabled ?? true,
      };
    });
  }, [actions, userShortcuts]);

  // Use global keyboard shortcuts hook with combined config
  useGlobalKeyboardShortcuts({
    shortcuts,
    enabled: enabled && !loading,
    disableInInputs,
  });
}
