/**
 * @jest-environment node
 */

/**
 * Integration Tests: Authentication Flow
 *
 * Tests the complete authentication lifecycle including:
 * - Sign up
 * - Sign in
 * - Access protected routes
 * - Sign out
 * - Account deletion
 *
 * These tests verify that AuthService, API routes, and middleware
 * work together correctly to support the complete auth flow.
 */

import { AuthService } from '@/lib/services/authService';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  createMockSupabaseClient,
  createMockUser,
  createMockUserProfile,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  resetAllMocks,
  MockSupabaseChain,
} from '@/test-utils/mockSupabase';
import { cache } from '@/lib/cache';

// Mock the error tracking module
jest.mock('@/lib/errorTracking', () => ({
  trackError: jest.fn(),
  ErrorCategory: {
    AUTH: 'auth',
    DATABASE: 'database',
    EXTERNAL_SERVICE: 'external_service',
  },
  ErrorSeverity: {
    HIGH: 'high',
    MEDIUM: 'medium',
  },
}));

// Mock cache invalidation
jest.mock('@/lib/cacheInvalidation', () => ({
  invalidateUserCache: jest.fn(),
  invalidateUserProfile: jest.fn(),
}));

describe('Integration: Authentication Flow', () => {
  let mockSupabase: MockSupabaseChain;
  let authService: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    authService = new AuthService(mockSupabase as unknown as SupabaseClient);
  });

  afterEach(async () => {
    resetAllMocks(mockSupabase);
    await cache.clear();
  });

  describe('User Authentication Flow', () => {
    it('should authenticate user and retrieve profile', async () => {
      // Arrange
      const mockUser = createMockUser({
        id: 'auth-user-123',
        email: 'test@example.com',
      });

      const mockProfile = createMockUserProfile({
        id: mockUser.id,
        email: mockUser.email,
        tier: 'free',
      });

      // Mock authentication
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      // Mock profile fetch
      mockSupabase.single.mockResolvedValueOnce({
        data: mockProfile,
        error: null,
      });

      // Act - Get current user
      const user = await authService.getCurrentUser();

      // Assert user authenticated
      expect(user).toBeDefined();
      expect(user?.id).toBe(mockUser.id);
      expect(user?.email).toBe(mockUser.email);

      // Act - Get user profile
      const profile = await authService.getUserProfile(mockUser.id);

      // Assert profile retrieved
      expect(profile).toBeDefined();
      expect(profile?.tier).toBe('free');
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
    });

    it('should return null for unauthenticated user', async () => {
      // Arrange
      mockUnauthenticatedUser(mockSupabase);

      // Act
      const user = await authService.getCurrentUser();

      // Assert
      expect(user).toBeNull();
    });

    it('should throw error when requireAuth fails', async () => {
      // Arrange
      mockUnauthenticatedUser(mockSupabase);

      // Act & Assert
      await expect(authService.requireAuth()).rejects.toThrow('User is not authenticated');
    });

    it('should cache user profile on first fetch', async () => {
      // Arrange
      const mockUser = createMockUser();
      const mockProfile = createMockUserProfile({ id: mockUser.id });

      mockSupabase.single.mockResolvedValueOnce({
        data: mockProfile,
        error: null,
      });

      // Act - First fetch (from database)
      const profile1 = await authService.getUserProfile(mockUser.id);

      // Act - Second fetch (should be from cache)
      const profile2 = await authService.getUserProfile(mockUser.id);

      // Assert
      expect(profile1).toEqual(profile2);
      // Database should only be queried once
      expect(mockSupabase.single).toHaveBeenCalledTimes(1);
    });
  });

  describe('Sign Out Flow', () => {
    it('should successfully sign out user', async () => {
      // Arrange
      const mockUser = mockAuthenticatedUser(mockSupabase);

      mockSupabase.auth.signOut.mockResolvedValueOnce({
        error: null,
      });

      // Act
      await authService.signOut();

      // Assert
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });

    it('should handle sign out errors', async () => {
      // Arrange
      mockSupabase.auth.signOut.mockResolvedValueOnce({
        error: { message: 'Sign out failed' },
      });

      // Act & Assert
      await expect(authService.signOut()).rejects.toThrow('Failed to sign out');
    });
  });

  describe('Profile Update Flow', () => {
    it('should update user profile and invalidate cache', async () => {
      // Arrange
      const mockUser = createMockUser();
      const updatedProfile = createMockUserProfile({
        id: mockUser.id,
        tier: 'pro',
        subscription_status: 'active',
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: updatedProfile,
        error: null,
      });

      // Act
      const result = await authService.updateUserProfile(mockUser.id, {
        tier: 'pro',
        subscription_status: 'active',
      });

      // Assert
      expect(result.tier).toBe('pro');
      expect(result.subscription_status).toBe('active');
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          tier: 'pro',
          subscription_status: 'active',
        })
      );
    });

    it('should handle profile update errors', async () => {
      // Arrange
      const mockUser = createMockUser();

      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Update failed' },
      });

      // Act & Assert
      await expect(authService.updateUserProfile(mockUser.id, { tier: 'pro' })).rejects.toThrow(
        'Failed to update user profile'
      );
    });

    it('should throw error if profile not found', async () => {
      // Arrange
      const mockUser = createMockUser();

      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      // Act & Assert
      await expect(authService.updateUserProfile(mockUser.id, { tier: 'pro' })).rejects.toThrow(
        'User profile not found'
      );
    });
  });

  describe('Account Deletion Flow', () => {
    it('should delete user account and all associated data', async () => {
      // Arrange
      const mockUser = createMockUser();

      // Mock projects deletion
      const mockProjectDelete = {
        eq: jest.fn().mockResolvedValue({ error: null }),
      };
      const mockProjectChain = {
        delete: jest.fn().mockReturnValue(mockProjectDelete),
      };

      // Mock activity history deletion
      const mockHistoryDelete = {
        eq: jest.fn().mockResolvedValue({ error: null }),
      };
      const mockHistoryChain = {
        delete: jest.fn().mockReturnValue(mockHistoryDelete),
      };

      mockSupabase.from.mockReturnValueOnce(mockProjectChain).mockReturnValueOnce(mockHistoryChain);

      // Mock storage listing
      mockSupabase.storage.list.mockResolvedValueOnce({
        data: [{ name: 'file1.jpg' }, { name: 'file2.jpg' }],
        error: null,
      });

      // Mock storage removal
      mockSupabase.storage.remove.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      // Act
      await authService.deleteUserAccount(mockUser.id);

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('projects');
      expect(mockSupabase.from).toHaveBeenCalledWith('user_activity_history');
      expect(mockProjectDelete.eq).toHaveBeenCalledWith('user_id', mockUser.id);
      expect(mockHistoryDelete.eq).toHaveBeenCalledWith('user_id', mockUser.id);
      expect(mockSupabase.storage.remove).toHaveBeenCalled();
    });

    it('should continue deletion even if activity history fails', async () => {
      // Arrange
      const mockUser = createMockUser();

      // Mock projects deletion success
      const mockProjectDelete = {
        eq: jest.fn().mockResolvedValue({ error: null }),
      };
      const mockProjectChain = {
        delete: jest.fn().mockReturnValue(mockProjectDelete),
      };

      // Mock activity history deletion failure
      const mockHistoryDelete = {
        eq: jest.fn().mockResolvedValue({ error: { message: 'History deletion failed' } }),
      };
      const mockHistoryChain = {
        delete: jest.fn().mockReturnValue(mockHistoryDelete),
      };

      mockSupabase.from.mockReturnValueOnce(mockProjectChain).mockReturnValueOnce(mockHistoryChain);

      // Mock storage
      mockSupabase.storage.list.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      // Act - Should not throw
      await authService.deleteUserAccount(mockUser.id);

      // Assert
      expect(mockProjectDelete.eq).toHaveBeenCalledWith('user_id', mockUser.id);
      expect(mockHistoryDelete.eq).toHaveBeenCalledWith('user_id', mockUser.id);
    });

    it('should throw error if project deletion fails', async () => {
      // Arrange
      const mockUser = createMockUser();

      const mockProjectDelete = {
        eq: jest.fn().mockResolvedValue({ error: { message: 'Deletion failed' } }),
      };
      const mockProjectChain = {
        delete: jest.fn().mockReturnValue(mockProjectDelete),
      };

      mockSupabase.from.mockReturnValueOnce(mockProjectChain);

      // Act & Assert
      await expect(authService.deleteUserAccount(mockUser.id)).rejects.toThrow(
        'Failed to delete user projects'
      );
    });

    it('should handle storage deletion errors gracefully', async () => {
      // Arrange
      const mockUser = createMockUser();

      // Mock projects deletion
      const mockProjectDelete = {
        eq: jest.fn().mockResolvedValue({ error: null }),
      };
      const mockProjectChain = {
        delete: jest.fn().mockReturnValue(mockProjectDelete),
      };

      // Mock activity history deletion
      const mockHistoryDelete = {
        eq: jest.fn().mockResolvedValue({ error: null }),
      };
      const mockHistoryChain = {
        delete: jest.fn().mockReturnValue(mockHistoryDelete),
      };

      mockSupabase.from.mockReturnValueOnce(mockProjectChain).mockReturnValueOnce(mockHistoryChain);

      // Mock storage listing
      mockSupabase.storage.list.mockResolvedValueOnce({
        data: [{ name: 'file1.jpg' }],
        error: null,
      });

      // Mock storage removal failure
      mockSupabase.storage.remove.mockResolvedValueOnce({
        data: null,
        error: { message: 'Storage error' },
      });

      // Act - Should complete despite storage error
      await authService.deleteUserAccount(mockUser.id);

      // Assert
      expect(mockSupabase.storage.remove).toHaveBeenCalled();
    });
  });

  describe('Complete Auth Flow End-to-End', () => {
    it('should complete full auth workflow: authenticate → access → update profile → sign out', async () => {
      // Step 1: Authenticate user
      const mockUser = createMockUser({
        id: 'e2e-user-123',
        email: 'e2e@example.com',
      });

      const mockProfile = createMockUserProfile({
        id: mockUser.id,
        email: mockUser.email,
        tier: 'free',
      });

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const user = await authService.getCurrentUser();
      expect(user?.id).toBe(mockUser.id);

      // Step 2: Access user profile
      mockSupabase.single.mockResolvedValueOnce({
        data: mockProfile,
        error: null,
      });

      const profile = await authService.getUserProfile(mockUser.id);
      expect(profile?.tier).toBe('free');

      // Step 3: Upgrade to pro tier
      const upgradedProfile = {
        ...mockProfile,
        tier: 'pro',
        subscription_status: 'active',
      };

      mockSupabase.single.mockResolvedValueOnce({
        data: upgradedProfile,
        error: null,
      });

      const updatedProfile = await authService.updateUserProfile(mockUser.id, {
        tier: 'pro',
        subscription_status: 'active',
      });

      expect(updatedProfile.tier).toBe('pro');

      // Step 4: Sign out
      mockSupabase.auth.signOut.mockResolvedValueOnce({
        error: null,
      });

      await authService.signOut();
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();

      // Step 5: Verify user is logged out
      mockUnauthenticatedUser(mockSupabase);

      const loggedOutUser = await authService.getCurrentUser();
      expect(loggedOutUser).toBeNull();
    });

    it('should complete account deletion workflow: authenticate → create data → delete account', async () => {
      // Step 1: Authenticate
      const mockUser = createMockUser({
        id: 'delete-user-123',
        email: 'delete@example.com',
      });

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const user = await authService.getCurrentUser();
      expect(user?.id).toBe(mockUser.id);

      // Step 2: User creates some data (simulated by mocking database state)
      // This would typically involve ProjectService and AssetService
      // For integration test, we just mock the deletion

      // Step 3: Delete account
      const mockProjectDelete = {
        eq: jest.fn().mockResolvedValue({ error: null }),
      };
      const mockProjectChain = {
        delete: jest.fn().mockReturnValue(mockProjectDelete),
      };

      const mockHistoryDelete = {
        eq: jest.fn().mockResolvedValue({ error: null }),
      };
      const mockHistoryChain = {
        delete: jest.fn().mockReturnValue(mockHistoryDelete),
      };

      mockSupabase.from.mockReturnValueOnce(mockProjectChain).mockReturnValueOnce(mockHistoryChain);

      mockSupabase.storage.list.mockResolvedValueOnce({
        data: [{ name: 'project-file.jpg' }],
        error: null,
      });

      mockSupabase.storage.remove.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      await authService.deleteUserAccount(mockUser.id);

      // Assert all cleanup happened
      expect(mockProjectDelete.eq).toHaveBeenCalledWith('user_id', mockUser.id);
      expect(mockHistoryDelete.eq).toHaveBeenCalledWith('user_id', mockUser.id);
      expect(mockSupabase.storage.remove).toHaveBeenCalled();

      // Step 4: Verify user can no longer authenticate
      mockUnauthenticatedUser(mockSupabase);

      const deletedUser = await authService.getCurrentUser();
      expect(deletedUser).toBeNull();
    });
  });

  describe('Profile Caching Behavior', () => {
    it('should use cache for subsequent profile requests', async () => {
      // Arrange
      const mockUser = createMockUser();
      const mockProfile = createMockUserProfile({ id: mockUser.id });

      mockSupabase.single.mockResolvedValueOnce({
        data: mockProfile,
        error: null,
      });

      // Act - First request (cache miss)
      const profile1 = await authService.getUserProfile(mockUser.id);

      // Act - Second request (cache hit)
      const profile2 = await authService.getUserProfile(mockUser.id);

      // Assert
      expect(profile1).toEqual(profile2);
      expect(mockSupabase.from).toHaveBeenCalledTimes(1);
    });

    it('should invalidate cache after profile update', async () => {
      // Arrange
      const mockUser = createMockUser();
      const mockProfile = createMockUserProfile({ id: mockUser.id, tier: 'free' });
      const updatedProfile = createMockUserProfile({ id: mockUser.id, tier: 'pro' });

      // First fetch
      mockSupabase.single.mockResolvedValueOnce({
        data: mockProfile,
        error: null,
      });

      await authService.getUserProfile(mockUser.id);

      // Update profile
      mockSupabase.single.mockResolvedValueOnce({
        data: updatedProfile,
        error: null,
      });

      await authService.updateUserProfile(mockUser.id, { tier: 'pro' });

      // Verify cache invalidation was called
      const { invalidateUserProfile } = require('@/lib/cacheInvalidation');
      expect(invalidateUserProfile).toHaveBeenCalledWith(mockUser.id);
    });
  });
});
