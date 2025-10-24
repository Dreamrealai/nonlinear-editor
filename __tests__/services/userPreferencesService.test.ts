/**
 * Tests for UserPreferencesService
 *
 * Tests all user preferences functionality including:
 * - Getting user preferences with defaults
 * - Updating keyboard shortcuts
 * - Resetting keyboard shortcuts
 * - Validating shortcut configurations
 * - Checking for shortcut conflicts
 * - Error handling and edge cases
 *
 * Follows AAA pattern (Arrange-Act-Assert)
 */

import { UserPreferencesService } from '@/lib/services/userPreferencesService';
import { SupabaseClient } from '@supabase/supabase-js';
import { DEFAULT_KEYBOARD_SHORTCUTS, KeyboardShortcutConfig } from '@/types/userPreferences';

// Mock browser logger
jest.mock('@/lib/browserLogger', () => ({
  browserLogger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('UserPreferencesService', () => {
  let mockSupabase: jest.Mocked<SupabaseClient>;
  let userPreferencesService: UserPreferencesService;

  const mockUserId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    // Create mock Supabase client
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    } as unknown as jest.Mocked<SupabaseClient>;

    userPreferencesService = new UserPreferencesService(mockSupabase);
    jest.clearAllMocks();
  });

  describe('getUserPreferences', () => {
    it('should return user preferences from database', async () => {
      // Arrange
      const mockPreferences = {
        user_id: mockUserId,
        keyboard_shortcuts: DEFAULT_KEYBOARD_SHORTCUTS,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      mockSupabase.single.mockResolvedValue({
        data: mockPreferences,
        error: null,
      });

      // Act
      const result = await userPreferencesService.getUserPreferences(mockUserId);

      // Assert
      expect(result).toEqual({
        userId: mockUserId,
        keyboardShortcuts: DEFAULT_KEYBOARD_SHORTCUTS,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      });
      expect(mockSupabase.from).toHaveBeenCalledWith('user_preferences');
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', mockUserId);
    });

    it('should return defaults when no preferences exist (PGRST116 error)', async () => {
      // Arrange
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });

      // Act
      const result = await userPreferencesService.getUserPreferences(mockUserId);

      // Assert
      expect(result).toEqual({
        userId: mockUserId,
        keyboardShortcuts: DEFAULT_KEYBOARD_SHORTCUTS,
      });
    });

    it('should return defaults on database error', async () => {
      // Arrange
      mockSupabase.single.mockRejectedValue(new Error('Database connection failed'));

      // Act
      const result = await userPreferencesService.getUserPreferences(mockUserId);

      // Assert
      expect(result).toEqual({
        userId: mockUserId,
        keyboardShortcuts: DEFAULT_KEYBOARD_SHORTCUTS,
      });
    });

    it('should return defaults on other errors', async () => {
      // Arrange
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'OTHER_ERROR', message: 'Something went wrong' },
      });

      // Act
      const result = await userPreferencesService.getUserPreferences(mockUserId);

      // Assert
      expect(result).toEqual({
        userId: mockUserId,
        keyboardShortcuts: DEFAULT_KEYBOARD_SHORTCUTS,
      });
    });

    it('should handle custom keyboard shortcuts', async () => {
      // Arrange
      const customShortcuts: KeyboardShortcutConfig[] = [
        { id: 'undo', keys: ['Control', 'z'], enabled: true },
        { id: 'redo', keys: ['Control', 'y'], enabled: true },
      ];

      mockSupabase.single.mockResolvedValue({
        data: {
          user_id: mockUserId,
          keyboard_shortcuts: customShortcuts,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-02T00:00:00Z',
        },
        error: null,
      });

      // Act
      const result = await userPreferencesService.getUserPreferences(mockUserId);

      // Assert
      expect(result.keyboardShortcuts).toEqual(customShortcuts);
    });
  });

  describe('updateKeyboardShortcuts', () => {
    it('should update existing preferences', async () => {
      // Arrange
      const newShortcuts: KeyboardShortcutConfig[] = [
        { id: 'undo', keys: ['Control', 'z'], enabled: true },
        { id: 'redo', keys: ['Control', 'y'], enabled: true },
      ];

      mockSupabase.single
        .mockResolvedValueOnce({
          data: { user_id: mockUserId },
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: null,
        });

      // Act
      await userPreferencesService.updateKeyboardShortcuts(mockUserId, newShortcuts);

      // Assert
      expect(mockSupabase.update).toHaveBeenCalledWith({
        keyboard_shortcuts: newShortcuts,
      });
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', mockUserId);
    });

    it('should insert new preferences if none exist', async () => {
      // Arrange
      const newShortcuts: KeyboardShortcutConfig[] = [
        { id: 'undo', keys: ['Meta', 'z'], enabled: true },
      ];

      mockSupabase.single
        .mockResolvedValueOnce({
          data: null,
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: null,
        });

      // Act
      await userPreferencesService.updateKeyboardShortcuts(mockUserId, newShortcuts);

      // Assert
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        user_id: mockUserId,
        keyboard_shortcuts: newShortcuts,
      });
    });

    it('should throw error for duplicate shortcut IDs', async () => {
      // Arrange
      const duplicateShortcuts: KeyboardShortcutConfig[] = [
        { id: 'undo', keys: ['Meta', 'z'], enabled: true },
        { id: 'undo', keys: ['Control', 'z'], enabled: true },
      ];

      // Act & Assert
      await expect(
        userPreferencesService.updateKeyboardShortcuts(mockUserId, duplicateShortcuts)
      ).rejects.toThrow('Duplicate shortcut IDs found');
    });

    it('should throw error for duplicate key combinations', async () => {
      // Arrange
      const duplicateKeys: KeyboardShortcutConfig[] = [
        { id: 'undo', keys: ['Meta', 'z'], enabled: true },
        { id: 'redo', keys: ['Meta', 'z'], enabled: true },
      ];

      // Act & Assert
      await expect(
        userPreferencesService.updateKeyboardShortcuts(mockUserId, duplicateKeys)
      ).rejects.toThrow('Duplicate key combination');
    });

    it('should allow duplicate keys if one is disabled', async () => {
      // Arrange
      const shortcuts: KeyboardShortcutConfig[] = [
        { id: 'undo', keys: ['Meta', 'z'], enabled: true },
        { id: 'redo', keys: ['Meta', 'z'], enabled: false },
      ];

      mockSupabase.single
        .mockResolvedValueOnce({
          data: null,
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: null,
        });

      // Act & Assert
      await expect(
        userPreferencesService.updateKeyboardShortcuts(mockUserId, shortcuts)
      ).resolves.not.toThrow();
    });

    it('should throw error for invalid shortcut ID', async () => {
      // Arrange
      const invalidShortcuts: KeyboardShortcutConfig[] = [
        { id: '', keys: ['Meta', 'z'], enabled: true } as KeyboardShortcutConfig,
      ];

      // Act & Assert
      await expect(
        userPreferencesService.updateKeyboardShortcuts(mockUserId, invalidShortcuts)
      ).rejects.toThrow('Invalid shortcut ID');
    });

    it('should throw error for shortcut without keys', async () => {
      // Arrange
      const invalidShortcuts: KeyboardShortcutConfig[] = [{ id: 'undo', keys: [], enabled: true }];

      // Act & Assert
      await expect(
        userPreferencesService.updateKeyboardShortcuts(mockUserId, invalidShortcuts)
      ).rejects.toThrow('must have at least one key');
    });

    it('should throw error for shortcut without enabled property', async () => {
      // Arrange
      const invalidShortcuts: never[] = [{ id: 'undo', keys: ['Meta', 'z'] } as never];

      // Act & Assert
      await expect(
        userPreferencesService.updateKeyboardShortcuts(mockUserId, invalidShortcuts)
      ).rejects.toThrow('must have a boolean enabled property');
    });

    it('should normalize key combinations for duplicate detection', async () => {
      // Arrange - Keys in different order and case
      const shortcuts: KeyboardShortcutConfig[] = [
        { id: 'undo', keys: ['z', 'Meta'], enabled: true },
        { id: 'redo', keys: ['META', 'Z'], enabled: true },
      ];

      // Act & Assert
      await expect(
        userPreferencesService.updateKeyboardShortcuts(mockUserId, shortcuts)
      ).rejects.toThrow('Duplicate key combination');
    });
  });

  describe('resetKeyboardShortcuts', () => {
    it('should reset shortcuts to defaults', async () => {
      // Arrange
      mockSupabase.single
        .mockResolvedValueOnce({
          data: { user_id: mockUserId },
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: null,
        });

      // Act
      await userPreferencesService.resetKeyboardShortcuts(mockUserId);

      // Assert
      expect(mockSupabase.update).toHaveBeenCalledWith({
        keyboard_shortcuts: DEFAULT_KEYBOARD_SHORTCUTS,
      });
    });

    it('should create new preferences with defaults if none exist', async () => {
      // Arrange
      mockSupabase.single
        .mockResolvedValueOnce({
          data: null,
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: null,
        });

      // Act
      await userPreferencesService.resetKeyboardShortcuts(mockUserId);

      // Assert
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        user_id: mockUserId,
        keyboard_shortcuts: DEFAULT_KEYBOARD_SHORTCUTS,
      });
    });
  });

  describe('checkShortcutConflict', () => {
    it('should return no conflict for unique key combination', async () => {
      // Arrange
      mockSupabase.single.mockResolvedValue({
        data: {
          user_id: mockUserId,
          keyboard_shortcuts: [
            { id: 'undo', keys: ['Meta', 'z'], enabled: true },
            { id: 'redo', keys: ['Meta', 'Shift', 'z'], enabled: true },
          ],
        },
        error: null,
      });

      // Act
      const result = await userPreferencesService.checkShortcutConflict(mockUserId, ['Meta', 's']);

      // Assert
      expect(result.conflict).toBe(false);
      expect(result.conflictingShortcut).toBeUndefined();
    });

    it('should detect conflict with existing shortcut', async () => {
      // Arrange
      const existingShortcuts = [
        { id: 'undo', keys: ['Meta', 'z'], enabled: true },
        { id: 'save', keys: ['Meta', 's'], enabled: true },
      ];

      mockSupabase.single.mockResolvedValue({
        data: {
          user_id: mockUserId,
          keyboard_shortcuts: existingShortcuts,
        },
        error: null,
      });

      // Act
      const result = await userPreferencesService.checkShortcutConflict(mockUserId, ['Meta', 's']);

      // Assert
      expect(result.conflict).toBe(true);
      expect(result.conflictingShortcut).toEqual({
        id: 'save',
        keys: ['Meta', 's'],
        enabled: true,
      });
    });

    it('should ignore disabled shortcuts when checking conflicts', async () => {
      // Arrange
      mockSupabase.single.mockResolvedValue({
        data: {
          user_id: mockUserId,
          keyboard_shortcuts: [
            { id: 'undo', keys: ['Meta', 'z'], enabled: true },
            { id: 'save', keys: ['Meta', 's'], enabled: false },
          ],
        },
        error: null,
      });

      // Act
      const result = await userPreferencesService.checkShortcutConflict(mockUserId, ['Meta', 's']);

      // Assert
      expect(result.conflict).toBe(false);
    });

    it('should exclude specified shortcut ID from conflict check', async () => {
      // Arrange
      mockSupabase.single.mockResolvedValue({
        data: {
          user_id: mockUserId,
          keyboard_shortcuts: [{ id: 'save', keys: ['Meta', 's'], enabled: true }],
        },
        error: null,
      });

      // Act
      const result = await userPreferencesService.checkShortcutConflict(
        mockUserId,
        ['Meta', 's'],
        'save'
      );

      // Assert
      expect(result.conflict).toBe(false);
    });

    it('should normalize keys for conflict detection', async () => {
      // Arrange
      mockSupabase.single.mockResolvedValue({
        data: {
          user_id: mockUserId,
          keyboard_shortcuts: [{ id: 'save', keys: ['s', 'Meta'], enabled: true }],
        },
        error: null,
      });

      // Act - Keys in different order and case
      const result = await userPreferencesService.checkShortcutConflict(mockUserId, ['META', 'S']);

      // Assert
      expect(result.conflict).toBe(true);
    });

    it('should return defaults when database errors occur', async () => {
      // Arrange - Service returns defaults on error
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'DB_ERROR', message: 'Database error' },
      });

      // Act
      const result = await userPreferencesService.checkShortcutConflict(mockUserId, ['Meta', 's']);

      // Assert - When preferences can't be loaded, defaults are used which contain Meta+s for save
      expect(result.conflict).toBe(true);
      expect(result.conflictingShortcut?.id).toBe('save');
    });
  });

  describe('Edge cases and validation', () => {
    it('should handle empty shortcuts array', async () => {
      // Arrange
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      // Act & Assert
      await expect(
        userPreferencesService.updateKeyboardShortcuts(mockUserId, [])
      ).resolves.not.toThrow();
    });

    it('should handle shortcuts with whitespace in keys', async () => {
      // Arrange
      const shortcuts: KeyboardShortcutConfig[] = [
        { id: 'undo', keys: [' Meta ', ' z '], enabled: true },
        { id: 'redo', keys: ['Meta', 'Shift', 'z'], enabled: true },
      ];

      mockSupabase.single
        .mockResolvedValueOnce({
          data: null,
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: null,
        });

      // Act & Assert
      await expect(
        userPreferencesService.updateKeyboardShortcuts(mockUserId, shortcuts)
      ).resolves.not.toThrow();
    });

    it('should handle single key shortcuts', async () => {
      // Arrange
      const shortcuts: KeyboardShortcutConfig[] = [
        { id: 'delete', keys: ['Delete'], enabled: true },
        { id: 'escape', keys: ['Escape'], enabled: true },
      ];

      mockSupabase.single
        .mockResolvedValueOnce({
          data: null,
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: null,
        });

      // Act & Assert
      await expect(
        userPreferencesService.updateKeyboardShortcuts(mockUserId, shortcuts)
      ).resolves.not.toThrow();
    });

    it('should handle complex multi-key shortcuts', async () => {
      // Arrange
      const shortcuts: KeyboardShortcutConfig[] = [
        {
          id: 'complex',
          keys: ['Control', 'Shift', 'Alt', 'Meta', 'F'],
          enabled: true,
        },
      ];

      mockSupabase.single
        .mockResolvedValueOnce({
          data: null,
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: null,
        });

      // Act & Assert
      await expect(
        userPreferencesService.updateKeyboardShortcuts(mockUserId, shortcuts)
      ).resolves.not.toThrow();
    });

    it('should validate all shortcuts in array', async () => {
      // Arrange
      const shortcuts: KeyboardShortcutConfig[] = [
        { id: 'valid1', keys: ['Meta', 'a'], enabled: true },
        { id: 'valid2', keys: ['Meta', 'b'], enabled: true },
        { id: 'invalid', keys: [], enabled: true }, // Invalid!
      ];

      // Act & Assert
      await expect(
        userPreferencesService.updateKeyboardShortcuts(mockUserId, shortcuts)
      ).rejects.toThrow('must have at least one key');
    });
  });

  describe('Integration scenarios', () => {
    it('should support complete preference update flow', async () => {
      // Arrange
      const newShortcuts: KeyboardShortcutConfig[] = [
        { id: 'undo', keys: ['Control', 'z'], enabled: true },
        { id: 'redo', keys: ['Control', 'y'], enabled: true },
        { id: 'save', keys: ['Control', 's'], enabled: true },
      ];

      // First call: check existing preferences
      mockSupabase.single.mockResolvedValueOnce({
        data: { user_id: mockUserId },
        error: null,
      });

      // Second call: get updated preferences after update
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          user_id: mockUserId,
          keyboard_shortcuts: newShortcuts,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-02T00:00:00Z',
        },
        error: null,
      });

      mockSupabase.eq.mockReturnThis();
      mockSupabase.update.mockReturnValueOnce({
        eq: jest.fn().mockResolvedValue({
          error: null,
        }),
      } as never);

      // Act
      await userPreferencesService.updateKeyboardShortcuts(mockUserId, newShortcuts);
      const result = await userPreferencesService.getUserPreferences(mockUserId);

      // Assert
      expect(result.keyboardShortcuts).toEqual(newShortcuts);
    });

    it('should support conflict checking before update', async () => {
      // Arrange
      const existingShortcuts = [
        { id: 'undo', keys: ['Meta', 'z'], enabled: true },
        { id: 'redo', keys: ['Meta', 'Shift', 'z'], enabled: true },
      ];

      mockSupabase.single.mockResolvedValue({
        data: {
          user_id: mockUserId,
          keyboard_shortcuts: existingShortcuts,
        },
        error: null,
      });

      // Act
      const conflict = await userPreferencesService.checkShortcutConflict(mockUserId, [
        'Meta',
        'z',
      ]);

      // Assert
      expect(conflict.conflict).toBe(true);
      expect(conflict.conflictingShortcut?.id).toBe('undo');
    });
  });
});
