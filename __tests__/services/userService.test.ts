import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserService } from '@/lib/services/userService';
import type { SupabaseClient } from '@supabase/supabase-js';
import * as errorTracking from '@/lib/errorTracking';
import * as validation from '@/lib/validation';

vi.mock('@/lib/errorTracking');
vi.mock('@/lib/validation');

describe('UserService', () => {
  let userService: UserService;
  let mockSupabase: Partial<SupabaseClient>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        single: vi.fn(),
      })) as unknown as SupabaseClient['from'],
    };

    userService = new UserService(mockSupabase as SupabaseClient);

    // Mock validateUUID to not throw by default
    vi.spyOn(validation, 'validateUUID').mockImplementation(() => {});
  });

  describe('getUserProfile', () => {
    const userId = 'user-123';
    const mockProfile = {
      id: userId,
      email: 'test@example.com',
      tier: 'free',
      video_minutes_used: 0,
      video_minutes_limit: 10,
      ai_requests_used: 0,
      ai_requests_limit: 100,
      storage_gb_used: 0,
      storage_gb_limit: 5,
    };

    it('should return user profile when found', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
      };

      (mockSupabase.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await userService.getUserProfile(userId);

      expect(result).toEqual(mockProfile);
      expect(validation.validateUUID).toHaveBeenCalledWith(userId, 'User ID');
      expect(mockSupabase.from).toHaveBeenCalledWith('user_profiles');
    });

    it('should return null when profile not found (PGRST116)', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'Not found' },
        }),
      };

      (mockSupabase.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await userService.getUserProfile(userId);

      expect(result).toBeNull();
    });

    it('should throw error on database error', async () => {
      const dbError = { code: 'PGRST000', message: 'Database error' };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: dbError }),
      };

      (mockSupabase.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      await expect(userService.getUserProfile(userId)).rejects.toThrow(
        'Failed to fetch user profile'
      );
      expect(errorTracking.trackError).toHaveBeenCalled();
    });

    it('should validate UUID format', async () => {
      const invalidUserId = 'invalid-id';
      const error = new Error('Invalid UUID');
      vi.spyOn(validation, 'validateUUID').mockImplementation(() => {
        throw error;
      });

      await expect(userService.getUserProfile(invalidUserId)).rejects.toThrow('Invalid UUID');
    });
  });

  describe('getAllUserProfiles', () => {
    it('should return all user profiles ordered by creation date', async () => {
      const mockProfiles = [
        { id: 'user-1', email: 'user1@example.com', tier: 'free' },
        { id: 'user-2', email: 'user2@example.com', tier: 'pro' },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockProfiles, error: null }),
      };

      (mockSupabase.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await userService.getAllUserProfiles();

      expect(result).toEqual(mockProfiles);
      expect(mockSupabase.from).toHaveBeenCalledWith('user_profiles');
      expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('should return empty array when no profiles found', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      (mockSupabase.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await userService.getAllUserProfiles();

      expect(result).toEqual([]);
    });

    it('should throw error on database error', async () => {
      const dbError = { message: 'Database error' };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: dbError }),
      };

      (mockSupabase.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      await expect(userService.getAllUserProfiles()).rejects.toThrow(
        'Failed to fetch user profiles'
      );
      expect(errorTracking.trackError).toHaveBeenCalled();
    });
  });

  describe('updateUserTier', () => {
    const userId = 'user-123';
    const tier = 'pro';
    const updatedProfile = { id: userId, tier: 'pro' };

    it('should update user tier successfully', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: updatedProfile, error: null }),
      };

      (mockSupabase.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await userService.updateUserTier(userId, tier);

      expect(result).toEqual(updatedProfile);
      expect(validation.validateUUID).toHaveBeenCalledWith(userId, 'User ID');
      expect(mockSupabase.from).toHaveBeenCalledWith('user_profiles');
    });

    it('should throw error if profile not found', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      (mockSupabase.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      await expect(userService.updateUserTier(userId, tier)).rejects.toThrow(
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

      await expect(userService.updateUserTier(userId, tier)).rejects.toThrow(
        'Failed to update user tier'
      );
      expect(errorTracking.trackError).toHaveBeenCalled();
    });
  });

  describe('updateUsageLimits', () => {
    const userId = 'user-123';
    const limits = { video_minutes_limit: 100, ai_requests_limit: 1000 };

    it('should update usage limits successfully', async () => {
      const updatedProfile = { id: userId, ...limits };
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: updatedProfile, error: null }),
      };

      (mockSupabase.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await userService.updateUsageLimits(userId, limits);

      expect(result).toEqual(updatedProfile);
      expect(validation.validateUUID).toHaveBeenCalledWith(userId, 'User ID');
    });
  });

  describe('incrementUsage', () => {
    const userId = 'user-123';
    const currentProfile = {
      id: userId,
      video_minutes_used: 10,
      ai_requests_used: 50,
    };

    it('should increment video minutes usage', async () => {
      // Mock getUserProfile
      const mockGetQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: currentProfile, error: null }),
      };

      const updatedProfile = { ...currentProfile, video_minutes_used: 15 };
      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: updatedProfile, error: null }),
      };

      (mockSupabase.from as unknown as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockGetQuery)
        .mockReturnValueOnce(mockUpdateQuery);

      const result = await userService.incrementUsage(userId, { video_minutes: 5 });

      expect(result).toEqual(updatedProfile);
    });

    it('should increment AI requests usage', async () => {
      const mockGetQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: currentProfile, error: null }),
      };

      const updatedProfile = { ...currentProfile, ai_requests_used: 55 };
      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: updatedProfile, error: null }),
      };

      (mockSupabase.from as unknown as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockGetQuery)
        .mockReturnValueOnce(mockUpdateQuery);

      const result = await userService.incrementUsage(userId, { ai_requests: 5 });

      expect(result).toEqual(updatedProfile);
    });

    it('should throw error if user profile not found', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      (mockSupabase.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      await expect(userService.incrementUsage(userId, { video_minutes: 5 })).rejects.toThrow(
        'User profile not found'
      );
    });
  });

  describe('isAdmin', () => {
    const userId = 'user-123';

    it('should return true for admin users', async () => {
      const adminProfile = { id: userId, tier: 'admin' };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: adminProfile, error: null }),
      };

      (mockSupabase.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await userService.isAdmin(userId);

      expect(result).toBe(true);
    });

    it('should return false for non-admin users', async () => {
      const userProfile = { id: userId, tier: 'pro' };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: userProfile, error: null }),
      };

      (mockSupabase.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await userService.isAdmin(userId);

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Error' } }),
      };

      (mockSupabase.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await userService.isAdmin(userId);

      expect(result).toBe(false);
      expect(errorTracking.trackError).toHaveBeenCalled();
    });
  });
});
