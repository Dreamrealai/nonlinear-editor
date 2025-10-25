/**
 * Tests for AuthService
 *
 * Tests all authentication-related business logic including:
 * - User authentication and session management
 * - User profile retrieval with caching
 * - User profile updates and cache invalidation
 * - User account deletion and cleanup
 * - Error handling and edge cases
 *
 * Follows AAA pattern (Arrange-Act-Assert)
 */

import { AuthService, User, UserProfile } from '@/lib/services/authService';
import { SupabaseClient } from '@supabase/supabase-js';
import { cache, CacheKeys, CacheTTL } from '@/lib/cache';
import { invalidateUserCache, invalidateUserProfile } from '@/lib/cacheInvalidation';

// Mock external modules
jest.mock(
  '@/lib/errorTracking',
  () => ({
    trackError: jest.fn(),
    ErrorCategory: {
      AUTH: 'auth',
      DATABASE: 'database',
      EXTERNAL_SERVICE: 'external_service',
    },
    ErrorSeverity: {
      HIGH: 'high',
      MEDIUM: 'medium',
      LOW: 'low',
    },
  })
);

jest.mock(
  '@/lib/cache',
  () => ({
    cache: {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      delPattern: jest.fn(),
      clear: jest.fn(),
      getStats: jest.fn(),
    },
    CacheKeys: {
      userProfile: (userId: string) => `user:profile:${userId}`,
      userSettings: (userId: string) => `user:settings:${userId}`,
      userSubscription: (userId: string) => `user:subscription:${userId}`,
      projectMetadata: (projectId: string) => `project:metadata:${projectId}`,
      userProjects: (userId: string) => `user:projects:${userId}`,
    },
    CacheTTL: {
      userProfile: 300, // 5 minutes
    },
  })
);

jest.mock(
  '@/lib/cacheInvalidation',
  () => ({
    invalidateUserCache: jest.fn(),
    invalidateUserProfile: jest.fn(),
  })
);

describe('AuthService', () => {
  let mockSupabase: jest.Mocked<SupabaseClient>;
  let authService: AuthService;
  let mockCache: jest.Mocked<typeof cache>;
  let mockInvalidateUserCache: jest.MockedFunction<typeof invalidateUserCache>;
  let mockInvalidateUserProfile: jest.MockedFunction<typeof invalidateUserProfile>;

  const mockUser: User = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'test@example.com',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-15T00:00:00Z',
  };

  const mockUserProfile: UserProfile = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'test@example.com',
    tier: 'free',
    subscription_status: null,
  };

  beforeEach((): void => {
    // Create mock Supabase client
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
        signOut: jest.fn(),
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn(),
      eq: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      storage: {
        from: jest.fn().mockReturnThis(),
        list: jest.fn(),
        remove: jest.fn(),
      },
    } as unknown as jest.Mocked<SupabaseClient>;

    authService = new AuthService(mockSupabase);
    mockCache = cache as jest.Mocked<typeof cache>;
    mockInvalidateUserCache = invalidateUserCache as jest.MockedFunction<
      typeof invalidateUserCache
    >;
    mockInvalidateUserProfile = invalidateUserProfile as jest.MockedFunction<
      typeof invalidateUserProfile
    >;

    jest.clearAllMocks();
  });

  describe('getCurrentUser', () => {
    it('should return the current authenticated user', async () => {
      // Arrange
      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Act
      const result = await authService.getCurrentUser();

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockSupabase.auth.getUser).toHaveBeenCalledTimes(1);
    });

    it('should return null if user is not authenticated', async () => {
      // Arrange
      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act
      const result = await authService.getCurrentUser();

      // Assert
      expect(result).toBeNull();
    });

    it('should return null on authentication error', async () => {
      // Arrange
      const authError = { message: 'Invalid token' };
      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: authError,
      });

      // Act
      const result = await authService.getCurrentUser();

      // Assert
      expect(result).toBeNull();
    });

    it('should throw error on unexpected failure', async () => {
      // Arrange
      const error = new Error('Network error');
      (mockSupabase.auth.getUser as jest.Mock).mockRejectedValue(error);

      // Act & Assert
      await expect(authService.getCurrentUser()).rejects.toThrow('Network error');
    });
  });

  describe('getUserProfile', () => {
    const userId = '550e8400-e29b-41d4-a716-446655440000';

    it('should return cached user profile if available', async () => {
      // Arrange
      mockCache.get.mockResolvedValue(mockUserProfile);

      // Act
      const result = await authService.getUserProfile(userId);

      // Assert
      expect(result).toEqual(mockUserProfile);
      expect(mockCache.get).toHaveBeenCalledWith(CacheKeys.userProfile(userId));
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should fetch from database and cache if not in cache', async () => {
      // Arrange
      mockCache.get.mockResolvedValue(null);
      mockSupabase.single.mockResolvedValue({
        data: mockUserProfile,
        error: null,
      });

      // Act
      const result = await authService.getUserProfile(userId);

      // Assert
      expect(result).toEqual(mockUserProfile);
      expect(mockCache.get).toHaveBeenCalledWith(CacheKeys.userProfile(userId));
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', userId);
      expect(mockCache.set).toHaveBeenCalledWith(
        CacheKeys.userProfile(userId),
        mockUserProfile,
        CacheTTL.userProfile
      );
    });

    it('should return null if profile not found', async () => {
      // Arrange
      mockCache.get.mockResolvedValue(null);
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: null,
      });

      // Act
      const result = await authService.getUserProfile(userId);

      // Assert
      expect(result).toBeNull();
      expect(mockCache.set).not.toHaveBeenCalled();
    });

    it('should throw error on database failure', async () => {
      // Arrange
      mockCache.get.mockResolvedValue(null);
      const dbError = { message: 'Database connection failed' };
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: dbError,
      });

      // Act & Assert
      await expect(authService.getUserProfile(userId)).rejects.toThrow(
        'Failed to fetch user profile: Database connection failed'
      );
      expect(mockCache.set).not.toHaveBeenCalled();
    });
  });

  describe('requireAuth', () => {
    it('should return user if authenticated', async () => {
      // Arrange
      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Act
      const result = await authService.requireAuth();

      // Assert
      expect(result).toEqual(mockUser);
    });

    it('should throw error if user is not authenticated', async () => {
      // Arrange
      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act & Assert
      await expect(authService.requireAuth()).rejects.toThrow('User is not authenticated');
    });
  });

  describe('signOut', () => {
    it('should sign out user successfully', async () => {
      // Arrange
      (mockSupabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: null,
      });

      // Act
      await authService.signOut();

      // Assert
      expect(mockSupabase.auth.signOut).toHaveBeenCalledTimes(1);
    });

    it('should throw error if sign out fails', async () => {
      // Arrange
      const signOutError = { message: 'Sign out failed' };
      (mockSupabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: signOutError,
      });

      // Act & Assert
      await expect(authService.signOut()).rejects.toThrow('Failed to sign out: Sign out failed');
    });
  });

  describe('deleteUserAccount', () => {
    const userId = '550e8400-e29b-41d4-a716-446655440000';

    it('should delete user account and all associated data', async () => {
      // Arrange
      // Mock projects deletion chain
      const mockProjectsEq = jest.fn().mockResolvedValue({ error: null });
      const mockProjectsDelete = jest.fn().mockReturnValue({ eq: mockProjectsEq });
      const mockProjectsFrom = { delete: mockProjectsDelete };

      // Mock activity history deletion chain
      const mockHistoryEq = jest.fn().mockResolvedValue({ error: null });
      const mockHistoryDelete = jest.fn().mockReturnValue({ eq: mockHistoryEq });
      const mockHistoryFrom = { delete: mockHistoryDelete };

      // Mock from() to return different chains
      mockSupabase.from
        .mockReturnValueOnce(mockProjectsFrom as never)
        .mockReturnValueOnce(mockHistoryFrom as never);

      // Mock storage operations
      const mockStorageFrom = {
        list: jest.fn().mockResolvedValue({
          data: [{ name: 'video1.mp4' }, { name: 'video2.mp4' }],
          error: null,
        }),
        remove: jest.fn().mockResolvedValue({ error: null }),
      };
      mockSupabase.storage.from.mockReturnValue(mockStorageFrom as never);

      // Act
      await authService.deleteUserAccount(userId);

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('projects');
      expect(mockProjectsDelete).toHaveBeenCalled();
      expect(mockProjectsEq).toHaveBeenCalledWith('user_id', userId);
      expect(mockSupabase.from).toHaveBeenCalledWith('user_activity_history');
      expect(mockHistoryDelete).toHaveBeenCalled();
      expect(mockHistoryEq).toHaveBeenCalledWith('user_id', userId);
      expect(mockSupabase.storage.from).toHaveBeenCalledWith('assets');
      expect(mockStorageFrom.list).toHaveBeenCalledWith(userId);
      expect(mockStorageFrom.remove).toHaveBeenCalledWith([
        `${userId}/video1.mp4`,
        `${userId}/video2.mp4`,
      ]);
      expect(mockInvalidateUserCache).toHaveBeenCalledWith(userId);
    });

    it('should throw error if projects deletion fails', async () => {
      // Arrange
      const projectsError = { message: 'Failed to delete projects' };
      const mockProjectsEq = jest.fn().mockResolvedValue({ error: projectsError });
      const mockProjectsDelete = jest.fn().mockReturnValue({ eq: mockProjectsEq });
      const mockProjectsFrom = { delete: mockProjectsDelete };
      mockSupabase.from.mockReturnValueOnce(mockProjectsFrom as never);

      // Act & Assert
      await expect(authService.deleteUserAccount(userId)).rejects.toThrow(
        'Failed to delete user projects: Failed to delete projects'
      );
      expect(mockInvalidateUserCache).not.toHaveBeenCalled();
    });

    it('should continue if activity history deletion fails', async () => {
      // Arrange
      const mockProjectsEq = jest.fn().mockResolvedValue({ error: null });
      const mockProjectsDelete = jest.fn().mockReturnValue({ eq: mockProjectsEq });
      const mockProjectsFrom = { delete: mockProjectsDelete };

      const historyError = { message: 'History deletion failed' };
      const mockHistoryEq = jest.fn().mockResolvedValue({ error: historyError });
      const mockHistoryDelete = jest.fn().mockReturnValue({ eq: mockHistoryEq });
      const mockHistoryFrom = { delete: mockHistoryDelete };

      mockSupabase.from
        .mockReturnValueOnce(mockProjectsFrom as never)
        .mockReturnValueOnce(mockHistoryFrom as never);

      const mockStorageFrom = {
        list: jest.fn().mockResolvedValue({ data: [], error: null }),
      };
      mockSupabase.storage.from.mockReturnValue(mockStorageFrom as never);

      // Act
      await authService.deleteUserAccount(userId);

      // Assert
      expect(mockInvalidateUserCache).toHaveBeenCalledWith(userId);
    });

    it('should continue if storage operations fail', async () => {
      // Arrange
      const mockProjectsEq = jest.fn().mockResolvedValue({ error: null });
      const mockProjectsDelete = jest.fn().mockReturnValue({ eq: mockProjectsEq });
      const mockProjectsFrom = { delete: mockProjectsDelete };

      const mockHistoryEq = jest.fn().mockResolvedValue({ error: null });
      const mockHistoryDelete = jest.fn().mockReturnValue({ eq: mockHistoryEq });
      const mockHistoryFrom = { delete: mockHistoryDelete };

      mockSupabase.from
        .mockReturnValueOnce(mockProjectsFrom as never)
        .mockReturnValueOnce(mockHistoryFrom as never);

      const mockStorageFrom = {
        list: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Storage error' },
        }),
      };
      mockSupabase.storage.from.mockReturnValue(mockStorageFrom as never);

      // Act
      await authService.deleteUserAccount(userId);

      // Assert
      expect(mockInvalidateUserCache).toHaveBeenCalledWith(userId);
    });
  });

  describe('updateUserProfile', () => {
    const userId = '550e8400-e29b-41d4-a716-446655440000';

    it('should update user profile and invalidate cache', async () => {
      // Arrange
      const updates = { tier: 'pro' as const };
      const updatedProfile: UserProfile = {
        ...mockUserProfile,
        tier: 'pro',
      };
      mockSupabase.single.mockResolvedValue({
        data: updatedProfile,
        error: null,
      });

      // Act
      const result = await authService.updateUserProfile(userId, updates);

      // Assert
      expect(result).toEqual(updatedProfile);
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockSupabase.update).toHaveBeenCalledWith(updates);
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', userId);
      expect(mockSupabase.select).toHaveBeenCalled();
      expect(mockInvalidateUserProfile).toHaveBeenCalledWith(userId);
    });

    it('should throw error if profile not found', async () => {
      // Arrange
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: null,
      });

      // Act & Assert
      await expect(authService.updateUserProfile(userId, { tier: 'pro' })).rejects.toThrow(
        'User profile not found'
      );
      expect(mockInvalidateUserProfile).not.toHaveBeenCalled();
    });

    it('should throw error on database failure', async () => {
      // Arrange
      const dbError = { message: 'Update failed' };
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: dbError,
      });

      // Act & Assert
      await expect(authService.updateUserProfile(userId, { tier: 'pro' })).rejects.toThrow(
        'Failed to update user profile: Update failed'
      );
      expect(mockInvalidateUserProfile).not.toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('should handle concurrent getCurrentUser calls', async () => {
      // Arrange
      (mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Act
      const results = await Promise.all([
        authService.getCurrentUser(),
        authService.getCurrentUser(),
        authService.getCurrentUser(),
      ]);

      // Assert
      expect(results).toEqual([mockUser, mockUser, mockUser]);
      expect(mockSupabase.auth.getUser).toHaveBeenCalledTimes(3);
    });

    it('should cache user profile after first fetch', async () => {
      // Arrange
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      mockCache.get
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockUserProfile)
        .mockResolvedValueOnce(mockUserProfile);
      mockSupabase.single.mockResolvedValue({
        data: mockUserProfile,
        error: null,
      });

      // Act
      await authService.getUserProfile(userId);
      await authService.getUserProfile(userId);
      await authService.getUserProfile(userId);

      // Assert
      // Database should only be called once
      expect(mockSupabase.from).toHaveBeenCalledTimes(1);
      expect(mockCache.get).toHaveBeenCalledTimes(3);
    });
  });
});
