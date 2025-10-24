/**
 * User Preferences Service
 *
 * Service layer for managing user preferences including keyboard shortcuts.
 * Handles CRUD operations with proper validation and error handling.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserPreferences, KeyboardShortcutConfig } from '@/types/userPreferences';
import { DEFAULT_KEYBOARD_SHORTCUTS } from '@/types/userPreferences';
import { browserLogger } from '@/lib/browserLogger';

export class UserPreferencesService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get user preferences from database
   * Returns defaults if no preferences exist
   */
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    try {
      const { data, error } = await this.supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        // If no preferences exist, return defaults
        if (error.code === 'PGRST116') {
          return {
            userId,
            keyboardShortcuts: DEFAULT_KEYBOARD_SHORTCUTS,
          };
        }
        throw error;
      }

      return {
        userId: data.user_id,
        keyboardShortcuts: data.keyboard_shortcuts as KeyboardShortcutConfig[],
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      browserLogger.error({ error, userId }, 'Failed to get user preferences');
      // Return defaults on error
      return {
        userId,
        keyboardShortcuts: DEFAULT_KEYBOARD_SHORTCUTS,
      };
    }
  }

  /**
   * Update keyboard shortcuts for a user
   */
  async updateKeyboardShortcuts(
    userId: string,
    shortcuts: KeyboardShortcutConfig[]
  ): Promise<void> {
    try {
      // Validate shortcuts
      this.validateKeyboardShortcuts(shortcuts);

      // Check if preferences exist
      const { data: existing } = await this.supabase
        .from('user_preferences')
        .select('user_id')
        .eq('user_id', userId)
        .single();

      if (existing) {
        // Update existing preferences
        const { error } = await this.supabase
          .from('user_preferences')
          .update({ keyboard_shortcuts: shortcuts })
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        // Insert new preferences
        const { error } = await this.supabase
          .from('user_preferences')
          .insert({
            user_id: userId,
            keyboard_shortcuts: shortcuts,
          });

        if (error) throw error;
      }

      browserLogger.info({ userId, shortcutCount: shortcuts.length }, 'Updated keyboard shortcuts');
    } catch (error) {
      browserLogger.error({ error, userId }, 'Failed to update keyboard shortcuts');
      throw error;
    }
  }

  /**
   * Reset keyboard shortcuts to defaults
   */
  async resetKeyboardShortcuts(userId: string): Promise<void> {
    await this.updateKeyboardShortcuts(userId, DEFAULT_KEYBOARD_SHORTCUTS);
  }

  /**
   * Validate keyboard shortcut configurations
   */
  private validateKeyboardShortcuts(shortcuts: KeyboardShortcutConfig[]): void {
    // Check for duplicate shortcut IDs
    const ids = shortcuts.map((s) => s.id);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      throw new Error('Duplicate shortcut IDs found');
    }

    // Check for duplicate key combinations
    const keyComboMap = new Map<string, string>();
    for (const shortcut of shortcuts) {
      if (!shortcut.enabled) continue;

      const keyCombo = this.normalizeKeyCombo(shortcut.keys);
      const existingId = keyComboMap.get(keyCombo);

      if (existingId) {
        throw new Error(
          `Duplicate key combination: ${keyCombo} is assigned to both "${existingId}" and "${shortcut.id}"`
        );
      }

      keyComboMap.set(keyCombo, shortcut.id);
    }

    // Validate each shortcut
    for (const shortcut of shortcuts) {
      if (!shortcut.id || typeof shortcut.id !== 'string') {
        throw new Error('Invalid shortcut ID');
      }

      if (!Array.isArray(shortcut.keys) || shortcut.keys.length === 0) {
        throw new Error(`Shortcut "${shortcut.id}" must have at least one key`);
      }

      if (typeof shortcut.enabled !== 'boolean') {
        throw new Error(`Shortcut "${shortcut.id}" must have a boolean enabled property`);
      }
    }
  }

  /**
   * Normalize a key combination to a string for comparison
   */
  private normalizeKeyCombo(keys: string[]): string {
    // Sort and lowercase for consistent comparison
    return keys
      .map((k) => k.toLowerCase().trim())
      .sort()
      .join('+');
  }

  /**
   * Check if a key combination conflicts with existing shortcuts
   */
  async checkShortcutConflict(
    userId: string,
    keys: string[],
    excludeId?: string
  ): Promise<{ conflict: boolean; conflictingShortcut?: KeyboardShortcutConfig }> {
    const preferences = await this.getUserPreferences(userId);
    const keyCombo = this.normalizeKeyCombo(keys);

    for (const shortcut of preferences.keyboardShortcuts) {
      if (!shortcut.enabled) continue;
      if (excludeId && shortcut.id === excludeId) continue;

      const shortcutCombo = this.normalizeKeyCombo(shortcut.keys);
      if (shortcutCombo === keyCombo) {
        return { conflict: true, conflictingShortcut: shortcut };
      }
    }

    return { conflict: false };
  }
}
