/**
 * Keyboard Shortcuts Panel Component
 *
 * Settings UI for customizing keyboard shortcuts.
 * Features:
 * - List all available shortcuts grouped by category
 * - Inline editing of key combinations
 * - Conflict detection and warnings
 * - Reset to defaults option
 * - Enable/disable individual shortcuts
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import { UserPreferencesService } from '@/lib/services/userPreferencesService';
import type { KeyboardShortcutConfig } from '@/types/userPreferences';
import { DEFAULT_KEYBOARD_SHORTCUTS, SHORTCUT_METADATA } from '@/types/userPreferences';
import { formatShortcut } from '@/lib/hooks/useGlobalKeyboardShortcuts';
import toast from 'react-hot-toast';
import { browserLogger } from '@/lib/browserLogger';

interface ShortcutEditState {
  id: string;
  keys: string[];
}

export function KeyboardShortcutsPanel(): JSX.Element {
  const { supabaseClient } = useSupabase();
  const [shortcuts, setShortcuts] = useState<KeyboardShortcutConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingShortcut, setEditingShortcut] = useState<ShortcutEditState | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Load user preferences on mount
  useEffect((): void => {
    const loadPreferences = async (): Promise<void> => {
      if (!supabaseClient) return;

      try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return;

        setUserId(user.id);

        const service = new UserPreferencesService(supabaseClient);
        const preferences = await service.getUserPreferences(user.id);
        setShortcuts(preferences.keyboardShortcuts);
      } catch (error) {
        browserLogger.error({ error }, 'Failed to load keyboard shortcuts');
        toast.error('Failed to load keyboard shortcuts');
        // Fallback to defaults
        setShortcuts(DEFAULT_KEYBOARD_SHORTCUTS);
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, [supabaseClient]);

  // Save shortcuts to database
  const saveShortcuts = useCallback(
    async (newShortcuts: KeyboardShortcutConfig[]): Promise<void> => {
      if (!supabaseClient || !userId) return;

      setSaving(true);
      try {
        const service = new UserPreferencesService(supabaseClient);
        await service.updateKeyboardShortcuts(userId, newShortcuts);
        toast.success('Keyboard shortcuts saved');
      } catch (error) {
        browserLogger.error({ error }, 'Failed to save keyboard shortcuts');
        toast.error(
          error instanceof Error ? error.message : 'Failed to save keyboard shortcuts'
        );
      } finally {
        setSaving(false);
      }
    },
    [supabaseClient, userId]
  );

  // Toggle shortcut enabled state
  const toggleShortcut = useCallback(
    (id: string): void => {
      const newShortcuts = shortcuts.map((s): KeyboardShortcutConfig =>
        s.id === id ? { ...s, enabled: !s.enabled } : s
      );
      setShortcuts(newShortcuts);
      saveShortcuts(newShortcuts);
    },
    [shortcuts, saveShortcuts]
  );

  // Start editing a shortcut
  const startEditing = useCallback((shortcut: KeyboardShortcutConfig): void => {
    setEditingShortcut({ id: shortcut.id, keys: [...shortcut.keys] });
    setIsRecording(false);
  }, []);

  // Cancel editing
  const cancelEditing = useCallback((): void => {
    setEditingShortcut(null);
    setIsRecording(false);
  }, []);

  // Start recording key combination
  const startRecording = useCallback((): void => {
    setIsRecording(true);
    setEditingShortcut((prev): { keys: never[]; id: string; } | null => (prev ? { ...prev, keys: [] } : null));
  }, []);

  // Handle key press during recording
  const handleKeyPress = useCallback(
    (event: KeyboardEvent): void => {
      if (!isRecording || !editingShortcut) return;

      event.preventDefault();
      event.stopPropagation();

      const keys: string[] = [];

      // Add modifier keys
      if (event.metaKey) keys.push('Meta');
      if (event.ctrlKey) keys.push('Control');
      if (event.shiftKey) keys.push('Shift');
      if (event.altKey) keys.push('Alt');

      // Add main key (not modifiers)
      const mainKey = event.key;
      if (
        mainKey !== 'Meta' &&
        mainKey !== 'Control' &&
        mainKey !== 'Shift' &&
        mainKey !== 'Alt'
      ) {
        // Normalize special keys
        if (mainKey === ' ') {
          keys.push('Space');
        } else if (mainKey === 'Escape') {
          // Escape cancels recording
          cancelEditing();
          return;
        } else {
          keys.push(mainKey);
        }
      }

      // Only update if we have a complete key combination
      if (keys.length > 0 && keys.some((k): boolean => !['Meta', 'Control', 'Shift', 'Alt'].includes(k))) {
        setEditingShortcut({ id: editingShortcut.id, keys });
        setIsRecording(false);
      }
    },
    [isRecording, editingShortcut, cancelEditing]
  );

  // Add keyboard event listener for recording
  useEffect((): (() => void) | undefined => {
    if (isRecording) {
      window.addEventListener('keydown', handleKeyPress);
      return (): void => window.removeEventListener('keydown', handleKeyPress);
    }
    return undefined;
  }, [isRecording, handleKeyPress]);

  // Save edited shortcut
  const saveEditedShortcut = useCallback(async (): Promise<void> => {
    if (!editingShortcut || !supabaseClient || !userId) return;

    try {
      // Check for conflicts
      const service = new UserPreferencesService(supabaseClient);
      const { conflict, conflictingShortcut } = await service.checkShortcutConflict(
        userId,
        editingShortcut.keys,
        editingShortcut.id
      );

      if (conflict && conflictingShortcut) {
        const conflictMetadata = SHORTCUT_METADATA[conflictingShortcut.id];
        toast.error(
          `This key combination is already assigned to "${conflictMetadata?.label || conflictingShortcut.id}"`
        );
        return;
      }

      // Update shortcuts
      const newShortcuts = shortcuts.map((s): KeyboardShortcutConfig =>
        s.id === editingShortcut.id ? { ...s, keys: editingShortcut.keys } : s
      );
      setShortcuts(newShortcuts);
      await saveShortcuts(newShortcuts);
      setEditingShortcut(null);
    } catch (error) {
      browserLogger.error({ error }, 'Failed to save shortcut');
      toast.error('Failed to save shortcut');
    }
  }, [editingShortcut, shortcuts, saveShortcuts, supabaseClient, userId]);

  // Reset to defaults
  const resetToDefaults = useCallback(async (): Promise<void> => {
    if (!confirm('Reset all keyboard shortcuts to defaults?')) return;

    setShortcuts(DEFAULT_KEYBOARD_SHORTCUTS);
    await saveShortcuts(DEFAULT_KEYBOARD_SHORTCUTS);
  }, [saveShortcuts]);

  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce(
    (acc, shortcut): Record<string, KeyboardShortcutConfig[]> => {
      const metadata = SHORTCUT_METADATA[shortcut.id];
      if (!metadata) return acc;

      const category = metadata.category;
      if (!acc[category]) acc[category] = [];
      acc[category].push(shortcut);
      return acc;
    },
    {} as Record<string, KeyboardShortcutConfig[]>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Keyboard Shortcuts
          </h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            Customize keyboard shortcuts to match your workflow
          </p>
        </div>
        <button
          onClick={resetToDefaults}
          disabled={saving}
          className="rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 disabled:opacity-50 transition-colors"
        >
          Reset to Defaults
        </button>
      </div>

      {/* Shortcuts list grouped by category */}
      <div className="space-y-6">
        {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]): JSX.Element => (
          <div key={category}>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-3">
              {category}
            </h4>
            <div className="space-y-2">
              {categoryShortcuts.map((shortcut): JSX.Element | null => {
                const metadata = SHORTCUT_METADATA[shortcut.id];
                if (!metadata) return null;

                const isEditing = editingShortcut?.id === shortcut.id;
                const displayKeys = isEditing ? editingShortcut.keys : shortcut.keys;

                return (
                  <div
                    key={shortcut.id}
                    className="flex items-center justify-between rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      {/* Enable/Disable toggle */}
                      <button
                        onClick={(): void => toggleShortcut(shortcut.id)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          shortcut.enabled
                            ? 'bg-purple-600'
                            : 'bg-neutral-300 dark:bg-neutral-600'
                        }`}
                        aria-label={`${shortcut.enabled ? 'Disable' : 'Enable'} ${metadata.label}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            shortcut.enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>

                      {/* Shortcut info */}
                      <div className="flex-1">
                        <div className="font-medium text-neutral-900 dark:text-neutral-100">
                          {metadata.label}
                        </div>
                        <div className="text-sm text-neutral-600 dark:text-neutral-400">
                          {metadata.description}
                        </div>
                      </div>
                    </div>

                    {/* Key combination display/editor */}
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <>
                          <button
                            onClick={startRecording}
                            className={`px-3 py-1.5 rounded-md text-sm font-mono font-medium border-2 transition-all ${
                              isRecording
                                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 animate-pulse'
                                : 'border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-purple-400'
                            }`}
                          >
                            {isRecording
                              ? 'Press keys...'
                              : displayKeys.length > 0
                                ? formatShortcut(displayKeys)
                                : 'Click to record'}
                          </button>
                          <button
                            onClick={saveEditedShortcut}
                            disabled={displayKeys.length === 0 || saving}
                            className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md disabled:opacity-50 transition-colors"
                            aria-label="Save shortcut"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="p-2 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-md transition-colors"
                            aria-label="Cancel editing"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </>
                      ) : (
                        <>
                          <kbd className="px-3 py-1.5 rounded-md bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 text-sm font-mono font-medium text-neutral-700 dark:text-neutral-300">
                            {formatShortcut(shortcut.keys)}
                          </kbd>
                          {metadata.allowCustomization && (
                            <button
                              onClick={(): void => startEditing(shortcut)}
                              className="p-2 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-md transition-colors"
                              aria-label={`Edit ${metadata.label} shortcut`}
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Help text */}
      <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-900 dark:text-blue-200">
            <p className="font-medium mb-1">How to customize shortcuts:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-300">
              <li>Click the edit icon next to a shortcut</li>
              <li>Click "Click to record" and press your desired key combination</li>
              <li>Press Escape to cancel recording</li>
              <li>Shortcuts cannot conflict - you'll be warned if a combination is already in use</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
