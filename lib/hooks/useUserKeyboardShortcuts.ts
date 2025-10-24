/**
 * User Keyboard Shortcuts Hook
 *
 * Loads user-customized keyboard shortcuts from preferences.
 * Falls back to defaults if no custom shortcuts are configured.
 */
'use client';

import { useState, useEffect } from 'react';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import { UserPreferencesService } from '@/lib/services/userPreferencesService';
import type { KeyboardShortcutConfig } from '@/types/userPreferences';
import { DEFAULT_KEYBOARD_SHORTCUTS } from '@/types/userPreferences';
import { browserLogger } from '@/lib/browserLogger';

interface UseUserKeyboardShortcutsReturn {
  /** User's keyboard shortcuts (or defaults) */
  shortcuts: KeyboardShortcutConfig[];
  /** Whether shortcuts are loading */
  loading: boolean;
  /** Get shortcut by ID */
  getShortcut: (id: string) => KeyboardShortcutConfig | undefined;
  /** Get keys for a specific shortcut */
  getShortcutKeys: (id: string) => string[];
  /** Check if a shortcut is enabled */
  isShortcutEnabled: (id: string) => boolean;
}

/**
 * Hook to load and access user's keyboard shortcuts
 */
export function useUserKeyboardShortcuts(): UseUserKeyboardShortcutsReturn {
  const { supabaseClient } = useSupabase();
  const [shortcuts, setShortcuts] = useState<KeyboardShortcutConfig[]>(DEFAULT_KEYBOARD_SHORTCUTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadShortcuts = async () => {
      if (!supabaseClient) {
        setLoading(false);
        return;
      }

      try {
        // Get current user
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        // Load user preferences
        const service = new UserPreferencesService(supabaseClient);
        const preferences = await service.getUserPreferences(user.id);
        setShortcuts(preferences.keyboardShortcuts);
      } catch (error) {
        browserLogger.error({ error }, 'Failed to load user keyboard shortcuts');
        // Keep using defaults on error
      } finally {
        setLoading(false);
      }
    };

    loadShortcuts();
  }, [supabaseClient]);

  // Helper to get a specific shortcut
  const getShortcut = (id: string): KeyboardShortcutConfig | undefined => {
    return shortcuts.find((s) => s.id === id);
  };

  // Helper to get keys for a shortcut
  const getShortcutKeys = (id: string): string[] => {
    const shortcut = getShortcut(id);
    return shortcut?.keys || [];
  };

  // Helper to check if shortcut is enabled
  const isShortcutEnabled = (id: string): boolean => {
    const shortcut = getShortcut(id);
    return shortcut?.enabled ?? false;
  };

  return {
    shortcuts,
    loading,
    getShortcut,
    getShortcutKeys,
    isShortcutEnabled,
  };
}
