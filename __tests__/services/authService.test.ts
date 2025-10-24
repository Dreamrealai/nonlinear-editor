import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from '@/lib/services/authService';
import type { SupabaseClient } from '@supabase/supabase-js';
import * as errorTracking from '@/lib/errorTracking';
import * as cache from '@/lib/cache';
import * as cacheInvalidation from '@/lib/cacheInvalidation';

// Mock dependencies
vi.mock('@/lib/errorTracking');
vi.mock('@/lib/cache');
vi.mock('@/lib/cacheInvalidation');

describe('AuthService', () => {
  let authService: AuthService;
  let mockSupabase: Partial<SupabaseClient>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock Supabase client
    mockSupabase = {
      auth: {
        getUser: vi.fn(),
        signOut: vi.fn(),
      } as unknown as SupabaseClient['auth'],
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
      })) as unknown as SupabaseClient['from'],
      storage: {
        from: vi.fn(() => ({
          list: vi.fn(),
          remove: vi.fn(),
        })),
      } as unknown as SupabaseClient['storage'],
    };

    authService = new AuthService(mockSupabase as SupabaseClient);
  });

  describe('getCurrentUser', () => {
    it('should return user when authenticated', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      (mockSupabase.auth!.getUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await authService.getCurrentUser();

      expect(result).toEqual(mockUser);
      expect(mockSupabase.auth!.getUser).toHaveBeenCalled();
    });

    it('should return null when not authenticated', async () => {
      (mockSupabase.auth!.getUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await authService.getCurrentUser();

      expect(result).toBeNull();
    });

    it('should return null and track error on auth error', async () => {
      const authError = new Error('Auth failed');
      (mockSupabase.auth!.getUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: null },
        error: authError,
      });

      const result = await authService.getCurrentUser();

      expect(result).toBeNull();
      expect(errorTracking.trackError).toHaveBeenCalledWith(
        authError,
        expect.objectContaining({
          category: errorTracking.ErrorCategory.AUTH,
          severity: errorTracking.ErrorSeverity.MEDIUM,
        })
      );
    });

    it('should throw and track error on unexpected exception', async () => {
      const error = new Error('Unexpected error');
      (mockSupabase.auth!.getUser as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(error);

      await expect(authService.getCurrentUser()).rejects.toThrow('Unexpected error');
      expect(errorTracking.trackError).toHaveBeenCalled();
    });
  });

  describe('getUserProfile', () => {
    const userId = 'user-123';
    const mockProfile = {
      id: userId,
      email: 'test@example.com',
      tier: 'free',
    };

    it('should return cached profile if available', async () => {
      vi.spyOn(cache.cache, 'get').mockResolvedValue(mockProfile);

      const result = await authService.getUserProfile(userId);

      expect(result).toEqual(mockProfile);
      expect(cache.cache.get).toHaveBeenCalledWith(cache.CacheKeys.userProfile(userId));
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should fetch from database and cache if not cached', async () => {
      vi.spyOn(cache.cache, 'get').mockResolvedValue(null);
      vi.spyOn(cache.cache, 'set').mockResolvedValue();

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
      };

      (mockSupabase.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await authService.getUserProfile(userId);

      expect(result).toEqual(mockProfile);
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(cache.cache.set).toHaveBeenCalledWith(
        cache.CacheKeys.userProfile(userId),
        mockProfile,
        cache.CacheTTL.userProfile
      );
    });

    it('should return null if profile not found', async () => {
      vi.spyOn(cache.cache, 'get').mockResolvedValue(null);

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      (mockSupabase.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await authService.getUserProfile(userId);

      expect(result).toBeNull();
    });

    it('should throw error on database error', async () => {
      vi.spyOn(cache.cache, 'get').mockResolvedValue(null);

      const dbError = { message: 'Database error' };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: dbError }),
      };

      (mockSupabase.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      await expect(authService.getUserProfile(userId)).rejects.toThrow(
        'Failed to fetch user profile'
      );
      expect(errorTracking.trackError).toHaveBeenCalled();
    });
  });

  describe('requireAuth', () => {
    it('should return user when authenticated', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      (mockSupabase.auth!.getUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await authService.requireAuth();

      expect(result).toEqual(mockUser);
    });

    it('should throw error when not authenticated', async () => {
      (mockSupabase.auth!.getUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(authService.requireAuth()).rejects.toThrow('User is not authenticated');
      expect(errorTracking.trackError).toHaveBeenCalled();
    });
  });

  describe('signOut', () => {
    it('should sign out successfully', async () => {
      (mockSupabase.auth!.signOut as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        error: null,
      });

      await authService.signOut();

      expect(mockSupabase.auth!.signOut).toHaveBeenCalled();
    });

    it('should throw error on sign out failure', async () => {
      const signOutError = { message: 'Sign out failed' };
      (mockSupabase.auth!.signOut as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        error: signOutError,
      });

      await expect(authService.signOut()).rejects.toThrow('Failed to sign out');
      expect(errorTracking.trackError).toHaveBeenCalled();
    });
  });

  describe('deleteUserAccount', () => {
    const userId = 'user-123';

    it('should delete user account and all associated data', async () => {
      const mockProjectsQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      const mockHistoryQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      (mockSupabase.from as unknown as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockProjectsQuery)
        .mockReturnValueOnce(mockHistoryQuery);

      const mockStorage = {
        list: vi.fn().mockResolvedValue({
          data: [{ name: 'file1.mp4' }, { name: 'file2.mp4' }],
          error: null,
        }),
        remove: vi.fn().mockResolvedValue({ error: null }),
      };

      (mockSupabase.storage!.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        mockStorage
      );

      vi.spyOn(cacheInvalidation, 'invalidateUserCache').mockResolvedValue();

      await authService.deleteUserAccount(userId);

      expect(mockSupabase.from).toHaveBeenCalledWith('projects');
      expect(mockSupabase.from).toHaveBeenCalledWith('user_activity_history');
      expect(mockSupabase.storage!.from).toHaveBeenCalledWith('assets');
      expect(cacheInvalidation.invalidateUserCache).toHaveBeenCalledWith(userId);
    });

    it('should throw error if project deletion fails', async () => {
      const dbError = { message: 'Delete failed' };
      const mockQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: dbError }),
      };

      (mockSupabase.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      await expect(authService.deleteUserAccount(userId)).rejects.toThrow(
        'Failed to delete user projects'
      );
      expect(errorTracking.trackError).toHaveBeenCalled();
    });
  });

  describe('updateUserProfile', () => {
    const userId = 'user-123';
    const updates = { tier: 'pro' };
    const updatedProfile = { id: userId, email: 'test@example.com', tier: 'pro' };

    it('should update user profile and invalidate cache', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: updatedProfile, error: null }),
      };

      (mockSupabase.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);
      vi.spyOn(cacheInvalidation, 'invalidateUserProfile').mockResolvedValue();

      const result = await authService.updateUserProfile(userId, updates);

      expect(result).toEqual(updatedProfile);
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(cacheInvalidation.invalidateUserProfile).toHaveBeenCalledWith(userId);
    });

    it('should throw error if profile not found', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      (mockSupabase.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      await expect(authService.updateUserProfile(userId, updates)).rejects.toThrow(
        'User profile not found'
      );
    });

    it('should throw error on database error', async () => {
      const dbError = { message: 'Update failed' };
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: dbError }),
      };

      (mockSupabase.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      await expect(authService.updateUserProfile(userId, updates)).rejects.toThrow(
        'Failed to update user profile'
      );
      expect(errorTracking.trackError).toHaveBeenCalled();
    });
  });
});
