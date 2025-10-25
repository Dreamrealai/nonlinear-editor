/**
 * @jest-environment node
 */
import { AuthService } from '@/lib/services/authService';
import {
  createMockSupabaseClient,
  createMockUser,
  createMockUserProfile,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  mockQuerySuccess,
  mockQueryError,
  resetAllMocks,
} from '@/test-utils/mockSupabase';
import { trackError } from '@/lib/errorTracking';
import { cache } from '@/lib/cache';
import { invalidateUserCache, invalidateUserProfile } from '@/lib/cacheInvalidation';

// Mock dependencies
jest.mock('@/lib/errorTracking');
jest.mock('@/lib/cache');
jest.mock('@/lib/cacheInvalidation');

describe('AuthService', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  let authService: AuthService;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    authService = new AuthService(mockSupabase as any);
    jest.clearAllMocks();
  });

  afterEach(() => {
    resetAllMocks(mockSupabase);
  });

  describe('getCurrentUser', () => {
    it('should return user when authenticated', async () => {
      // Arrange
      const mockUser = mockAuthenticatedUser(mockSupabase);

      // Act
      const result = await authService.getCurrentUser();

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
      expect(trackError).not.toHaveBeenCalled();
    });

    it('should return null when not authenticated', async () => {
      // Arrange
      mockUnauthenticatedUser(mockSupabase);

      // Act
      const result = await authService.getCurrentUser();

      // Assert
      expect(result).toBeNull();
      expect(trackError).toHaveBeenCalled();
    });

    it('should handle errors and throw', async () => {
      // Arrange
      const error = new Error('Auth service unavailable');
      mockSupabase.auth.getUser.mockRejectedValue(error);

      // Act & Assert
      await expect(authService.getCurrentUser()).rejects.toThrow('Auth service unavailable');
      expect(trackError).toHaveBeenCalled();
    });
  });

  describe('getUserProfile', () => {
    const userId = '550e8400-e29b-41d4-a716-446655440000';

    it('should return profile from cache if available', async () => {
      // Arrange
      const mockProfile = createMockUserProfile({ id: userId });
      (cache.get as jest.Mock).mockResolvedValue(mockProfile);

      // Act
      const result = await authService.getUserProfile(userId);

      // Assert
      expect(result).toEqual(mockProfile);
      expect(cache.get).toHaveBeenCalledWith(`user:profile:${userId}`);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should fetch from database when not cached', async () => {
      // Arrange
      const mockProfile = createMockUserProfile({ id: userId });
      (cache.get as jest.Mock).mockResolvedValue(null);
      mockQuerySuccess(mockSupabase, mockProfile);

      // Act
      const result = await authService.getUserProfile(userId);

      // Assert
      expect(result).toEqual(mockProfile);
      expect(mockSupabase.from).toHaveBeenCalledWith('user_profiles');
      expect(mockSupabase.select).toHaveBeenCalledWith('*');
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', userId);
      expect(cache.set).toHaveBeenCalled();
    });

    it('should return null when profile not found', async () => {
      // Arrange
      (cache.get as jest.Mock).mockResolvedValue(null);
      mockQuerySuccess(mockSupabase, null);

      // Act
      const result = await authService.getUserProfile(userId);

      // Assert
      expect(result).toBeNull();
    });

    it('should throw error when database query fails', async () => {
      // Arrange
      (cache.get as jest.Mock).mockResolvedValue(null);
      mockQueryError(mockSupabase, 'Database error');

      // Act & Assert
      await expect(authService.getUserProfile(userId)).rejects.toThrow(
        'Failed to fetch user profile'
      );
      expect(trackError).toHaveBeenCalled();
    });
  });

  describe('requireAuth', () => {
    it('should return user when authenticated', async () => {
      // Arrange
      const mockUser = mockAuthenticatedUser(mockSupabase);

      // Act
      const result = await authService.requireAuth();

      // Assert
      expect(result).toEqual(mockUser);
    });

    it('should throw error when not authenticated', async () => {
      // Arrange
      mockUnauthenticatedUser(mockSupabase);

      // Act & Assert
      await expect(authService.requireAuth()).rejects.toThrow('User is not authenticated');
      expect(trackError).toHaveBeenCalled();
    });
  });

  describe('signOut', () => {
    it('should sign out successfully', async () => {
      // Arrange
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });

      // Act
      await authService.signOut();

      // Assert
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
      expect(trackError).not.toHaveBeenCalled();
    });

    it('should handle sign out errors', async () => {
      // Arrange
      const error = { message: 'Sign out failed', name: 'AuthError' };
      mockSupabase.auth.signOut.mockResolvedValue({ error });

      // Act & Assert
      await expect(authService.signOut()).rejects.toThrow('Failed to sign out');
      expect(trackError).toHaveBeenCalled();
    });
  });

  describe('deleteUserAccount', () => {
    const userId = '550e8400-e29b-41d4-a716-446655440000';

    it('should delete user account and all associated data', async () => {
      // Arrange
      mockSupabase.from.mockImplementation((table: string) => {
        const builder = mockSupabase;
        builder.delete.mockReturnValue(builder);
        builder.eq.mockResolvedValue({ data: null, error: null });
        return builder;
      });

      mockSupabase.storage.list.mockResolvedValue({
        data: [{ name: 'file1.jpg' }, { name: 'file2.jpg' }],
        error: null,
      });

      mockSupabase.storage.remove.mockResolvedValue({ data: null, error: null });

      // Act
      await authService.deleteUserAccount(userId);

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('projects');
      expect(mockSupabase.from).toHaveBeenCalledWith('user_activity_history');
      expect(mockSupabase.storage.list).toHaveBeenCalledWith(userId);
      expect(mockSupabase.storage.remove).toHaveBeenCalled();
      expect(invalidateUserCache).toHaveBeenCalledWith(userId);
    });

    it('should throw error when project deletion fails', async () => {
      // Arrange
      mockSupabase.from.mockImplementation((table: string) => {
        const builder = mockSupabase;
        builder.delete.mockReturnValue(builder);
        builder.eq.mockResolvedValue({
          data: null,
          error: { message: 'Delete failed' },
        });
        return builder;
      });

      // Act & Assert
      await expect(authService.deleteUserAccount(userId)).rejects.toThrow(
        'Failed to delete user projects'
      );
      expect(trackError).toHaveBeenCalled();
    });

    it('should continue when activity history deletion fails', async () => {
      // Arrange
      let callCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        const builder = mockSupabase;
        builder.delete.mockReturnValue(builder);

        callCount++;
        if (callCount === 1) {
          // First call (projects) succeeds
          builder.eq.mockResolvedValue({ data: null, error: null });
        } else {
          // Second call (activity history) fails
          builder.eq.mockResolvedValue({
            data: null,
            error: { message: 'History delete failed' },
          });
        }
        return builder;
      });

      mockSupabase.storage.list.mockResolvedValue({ data: [], error: null });

      // Act
      await authService.deleteUserAccount(userId);

      // Assert
      expect(invalidateUserCache).toHaveBeenCalledWith(userId);
      expect(trackError).toHaveBeenCalled(); // Error tracked but didn't throw
    });

    it('should continue when storage deletion fails', async () => {
      // Arrange
      mockSupabase.from.mockImplementation((table: string) => {
        const builder = mockSupabase;
        builder.delete.mockReturnValue(builder);
        builder.eq.mockResolvedValue({ data: null, error: null });
        return builder;
      });

      mockSupabase.storage.list.mockResolvedValue({
        data: [{ name: 'file1.jpg' }],
        error: null,
      });

      mockSupabase.storage.remove.mockResolvedValue({
        data: null,
        error: { message: 'Storage delete failed' },
      });

      // Act
      await authService.deleteUserAccount(userId);

      // Assert
      expect(invalidateUserCache).toHaveBeenCalledWith(userId);
      expect(trackError).toHaveBeenCalled(); // Error tracked but didn't throw
    });
  });

  describe('updateUserProfile', () => {
    const userId = '550e8400-e29b-41d4-a716-446655440000';

    it('should update user profile and invalidate cache', async () => {
      // Arrange
      const updates = { tier: 'pro' };
      const updatedProfile = createMockUserProfile({ id: userId, tier: 'pro' });

      mockSupabase.from.mockImplementation(() => {
        const builder = mockSupabase;
        builder.update.mockReturnValue(builder);
        builder.eq.mockReturnValue(builder);
        builder.select.mockReturnValue(builder);
        builder.single.mockResolvedValue({ data: updatedProfile, error: null });
        return builder;
      });

      // Act
      const result = await authService.updateUserProfile(userId, updates);

      // Assert
      expect(result).toEqual(updatedProfile);
      expect(mockSupabase.from).toHaveBeenCalledWith('user_profiles');
      expect(mockSupabase.update).toHaveBeenCalledWith(updates);
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', userId);
      expect(invalidateUserProfile).toHaveBeenCalledWith(userId);
    });

    it('should throw error when update fails', async () => {
      // Arrange
      const updates = { tier: 'pro' };

      mockSupabase.from.mockImplementation(() => {
        const builder = mockSupabase;
        builder.update.mockReturnValue(builder);
        builder.eq.mockReturnValue(builder);
        builder.select.mockReturnValue(builder);
        builder.single.mockResolvedValue({
          data: null,
          error: { message: 'Update failed' },
        });
        return builder;
      });

      // Act & Assert
      await expect(authService.updateUserProfile(userId, updates)).rejects.toThrow(
        'Failed to update user profile'
      );
      expect(trackError).toHaveBeenCalled();
    });

    it('should throw error when profile not found', async () => {
      // Arrange
      const updates = { tier: 'pro' };

      mockSupabase.from.mockImplementation(() => {
        const builder = mockSupabase;
        builder.update.mockReturnValue(builder);
        builder.eq.mockReturnValue(builder);
        builder.select.mockReturnValue(builder);
        builder.single.mockResolvedValue({ data: null, error: null });
        return builder;
      });

      // Act & Assert
      await expect(authService.updateUserProfile(userId, updates)).rejects.toThrow(
        'User profile not found'
      );
    });
  });
});
