/**
 * Tests for UserService
 */

import { UserService } from '@/lib/services/userService';
import { SupabaseClient } from '@supabase/supabase-js';

// Mock external modules
jest.mock('@/lib/errorTracking', (): Record<string, unknown> => ({
  trackError: jest.fn(),
  ErrorCategory: {
    DATABASE: 'database',
  },
  ErrorSeverity: {
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low',
  },
}));

describe('UserService', () => {
  let mockSupabase: jest.Mocked<SupabaseClient>;
  let userService: UserService;

  beforeEach((): void => {
    // Create mock Supabase client
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
    } as unknown as jest.Mocked<SupabaseClient>;

    userService = new UserService(mockSupabase);

    jest.clearAllMocks();
  });

  describe('getUserProfile', () => {
    const userId = '550e8400-e29b-41d4-a716-446655440000';

    it('should fetch user profile successfully', async () => {
      const mockProfile = {
        id: userId,
        email: 'test@example.com',
        tier: 'free',
        stripe_customer_id: null,
        stripe_subscription_id: null,
        stripe_price_id: null,
        subscription_status: null,
        subscription_current_period_start: null,
        subscription_current_period_end: null,
        subscription_cancel_at_period_end: false,
        video_minutes_used: 5,
        video_minutes_limit: 60,
        ai_requests_used: 10,
        ai_requests_limit: 100,
        storage_gb_used: 0.5,
        storage_gb_limit: 5,
        usage_reset_at: '2025-02-01T00:00:00Z',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-15T00:00:00Z',
      };

      mockSupabase.single.mockResolvedValue({
        data: mockProfile,
        error: null,
      });

      const result = await userService.getUserProfile(userId);

      expect(result).toEqual(mockProfile);
      expect(mockSupabase.from).toHaveBeenCalledWith('user_profiles');
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', userId);
    });

    it('should return null if profile not found', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      const result = await userService.getUserProfile(userId);

      expect(result).toBeNull();
    });

    it('should throw error for invalid user ID', async () => {
      await expect(userService.getUserProfile('invalid-uuid')).rejects.toThrow();
    });

    it('should throw error on database failure', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'OTHER_ERROR', message: 'Database error' },
      });

      await expect(userService.getUserProfile(userId)).rejects.toThrow(
        'Failed to fetch user profile'
      );
    });
  });

  describe('getAllUserProfiles', () => {
    it('should fetch all user profiles', async () => {
      const mockProfiles = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          tier: 'free',
          created_at: '2025-01-01T00:00:00Z',
        },
        {
          id: 'user-2',
          email: 'user2@example.com',
          tier: 'pro',
          created_at: '2025-01-02T00:00:00Z',
        },
      ];

      mockSupabase.order.mockResolvedValue({
        data: mockProfiles,
        error: null,
      });

      const result = await userService.getAllUserProfiles();

      expect(result).toEqual(mockProfiles);
      expect(mockSupabase.from).toHaveBeenCalledWith('user_profiles');
      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('should return empty array if no profiles found', async () => {
      mockSupabase.order.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await userService.getAllUserProfiles();

      expect(result).toEqual([]);
    });

    it('should throw error on database failure', async () => {
      mockSupabase.order.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      await expect(userService.getAllUserProfiles()).rejects.toThrow(
        'Failed to fetch user profiles'
      );
    });
  });

  describe('updateUserTier', () => {
    const userId = '550e8400-e29b-41d4-a716-446655440000';

    it('should update user tier successfully', async () => {
      const mockProfile = {
        id: userId,
        email: 'test@example.com',
        tier: 'pro',
      };

      mockSupabase.single.mockResolvedValue({
        data: mockProfile,
        error: null,
      });

      const result = await userService.updateUserTier(userId, 'pro');

      expect(result).toEqual(mockProfile);
      expect(mockSupabase.update).toHaveBeenCalledWith({ tier: 'pro' });
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', userId);
    });

    it('should throw error for invalid user ID', async () => {
      await expect(userService.updateUserTier('invalid-uuid', 'pro')).rejects.toThrow();
    });

    it('should throw error if profile not found', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: null,
      });

      await expect(userService.updateUserTier(userId, 'pro')).rejects.toThrow(
        'User profile not found'
      );
    });

    it('should throw error on database failure', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      await expect(userService.updateUserTier(userId, 'pro')).rejects.toThrow(
        'Failed to update user tier'
      );
    });

    it('should handle all tier types', async () => {
      const tiers = ['free', 'pro', 'enterprise', 'admin'] as const;

      for (const tier of tiers) {
        mockSupabase.single.mockResolvedValue({
          data: { id: userId, tier },
          error: null,
        });

        const result = await userService.updateUserTier(userId, tier);
        expect(result.tier).toBe(tier);
      }
    });
  });

  describe('updateUsageLimits', () => {
    const userId = '550e8400-e29b-41d4-a716-446655440000';

    it('should update video minutes limit', async () => {
      const limits = {
        video_minutes_limit: 120,
      };

      mockSupabase.single.mockResolvedValue({
        data: { id: userId, ...limits },
        error: null,
      });

      const result = await userService.updateUsageLimits(userId, limits);

      expect(result).toEqual(expect.objectContaining(limits));
      expect(mockSupabase.update).toHaveBeenCalledWith(limits);
    });

    it('should update AI requests limit', async () => {
      const limits = {
        ai_requests_limit: 500,
      };

      mockSupabase.single.mockResolvedValue({
        data: { id: userId, ...limits },
        error: null,
      });

      await userService.updateUsageLimits(userId, limits);

      expect(mockSupabase.update).toHaveBeenCalledWith(limits);
    });

    it('should update both limits simultaneously', async () => {
      const limits = {
        video_minutes_limit: 120,
        ai_requests_limit: 500,
      };

      mockSupabase.single.mockResolvedValue({
        data: { id: userId, ...limits },
        error: null,
      });

      await userService.updateUsageLimits(userId, limits);

      expect(mockSupabase.update).toHaveBeenCalledWith(limits);
    });

    it('should throw error for invalid user ID', async () => {
      await expect(
        userService.updateUsageLimits('invalid-uuid', { video_minutes_limit: 120 })
      ).rejects.toThrow();
    });

    it('should throw error if profile not found', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: null,
      });

      await expect(
        userService.updateUsageLimits(userId, { video_minutes_limit: 120 })
      ).rejects.toThrow('User profile not found');
    });

    it('should throw error on database failure', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      await expect(
        userService.updateUsageLimits(userId, { video_minutes_limit: 120 })
      ).rejects.toThrow('Failed to update usage limits');
    });
  });

  describe('incrementUsage', () => {
    const userId = '550e8400-e29b-41d4-a716-446655440000';

    it('should increment video minutes used', async () => {
      const currentProfile = {
        id: userId,
        video_minutes_used: 10,
        ai_requests_used: 20,
      };

      // Mock getUserProfile call
      mockSupabase.single
        .mockResolvedValueOnce({
          data: currentProfile,
          error: null,
        })
        .mockResolvedValueOnce({
          data: { ...currentProfile, video_minutes_used: 15 },
          error: null,
        });

      const result = await userService.incrementUsage(userId, { video_minutes: 5 });

      expect(result.video_minutes_used).toBe(15);
      expect(mockSupabase.update).toHaveBeenCalledWith({
        video_minutes_used: 15,
      });
    });

    it('should increment AI requests used', async () => {
      const currentProfile = {
        id: userId,
        video_minutes_used: 10,
        ai_requests_used: 20,
      };

      mockSupabase.single
        .mockResolvedValueOnce({
          data: currentProfile,
          error: null,
        })
        .mockResolvedValueOnce({
          data: { ...currentProfile, ai_requests_used: 23 },
          error: null,
        });

      const result = await userService.incrementUsage(userId, { ai_requests: 3 });

      expect(result.ai_requests_used).toBe(23);
      expect(mockSupabase.update).toHaveBeenCalledWith({
        ai_requests_used: 23,
      });
    });

    it('should increment both usage counters', async () => {
      const currentProfile = {
        id: userId,
        video_minutes_used: 10,
        ai_requests_used: 20,
      };

      mockSupabase.single
        .mockResolvedValueOnce({
          data: currentProfile,
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            ...currentProfile,
            video_minutes_used: 15,
            ai_requests_used: 25,
          },
          error: null,
        });

      await userService.incrementUsage(userId, { video_minutes: 5, ai_requests: 5 });

      expect(mockSupabase.update).toHaveBeenCalledWith({
        video_minutes_used: 15,
        ai_requests_used: 25,
      });
    });

    it('should handle zero increments', async () => {
      const currentProfile = {
        id: userId,
        video_minutes_used: 10,
        ai_requests_used: 20,
      };

      mockSupabase.single
        .mockResolvedValueOnce({
          data: currentProfile,
          error: null,
        })
        .mockResolvedValueOnce({
          data: currentProfile,
          error: null,
        });

      await userService.incrementUsage(userId, { video_minutes: 0 });

      expect(mockSupabase.update).toHaveBeenCalledWith({
        video_minutes_used: 10,
      });
    });

    it('should throw error for invalid user ID', async () => {
      await expect(
        userService.incrementUsage('invalid-uuid', { video_minutes: 5 })
      ).rejects.toThrow();
    });

    it('should throw error if profile not found during fetch', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: null,
      });

      await expect(userService.incrementUsage(userId, { video_minutes: 5 })).rejects.toThrow(
        'User profile not found'
      );
    });

    it('should throw error if profile not found during update', async () => {
      mockSupabase.single
        .mockResolvedValueOnce({
          data: { id: userId, video_minutes_used: 10, ai_requests_used: 20 },
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: null,
        });

      await expect(userService.incrementUsage(userId, { video_minutes: 5 })).rejects.toThrow(
        'User profile not found'
      );
    });

    it('should throw error on database failure during fetch', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      await expect(userService.incrementUsage(userId, { video_minutes: 5 })).rejects.toThrow(
        'Failed to fetch user profile'
      );
    });

    it('should throw error on database failure during update', async () => {
      mockSupabase.single
        .mockResolvedValueOnce({
          data: { id: userId, video_minutes_used: 10, ai_requests_used: 20 },
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Database error' },
        });

      await expect(userService.incrementUsage(userId, { video_minutes: 5 })).rejects.toThrow(
        'Failed to increment usage'
      );
    });
  });

  describe('isAdmin', () => {
    const userId = '550e8400-e29b-41d4-a716-446655440000';

    it('should return true for admin user', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { id: userId, tier: 'admin' },
        error: null,
      });

      const result = await userService.isAdmin(userId);

      expect(result).toBe(true);
    });

    it('should return false for non-admin user', async () => {
      const tiers = ['free', 'pro', 'enterprise'] as const;

      for (const tier of tiers) {
        mockSupabase.single.mockResolvedValue({
          data: { id: userId, tier },
          error: null,
        });

        const result = await userService.isAdmin(userId);
        expect(result).toBe(false);
      }
    });

    it('should return false if profile not found', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      const result = await userService.isAdmin(userId);

      expect(result).toBe(false);
    });

    it('should return false on database error', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await userService.isAdmin(userId);

      expect(result).toBe(false);
    });

    it('should return false for null profile', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await userService.isAdmin(userId);

      expect(result).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle concurrent operations correctly', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      mockSupabase.single.mockResolvedValue({
        data: { id: userId, tier: 'free' },
        error: null,
      });

      // Call multiple operations concurrently
      const results = await Promise.all([
        userService.getUserProfile(userId),
        userService.isAdmin(userId),
        userService.getUserProfile(userId),
      ]);

      expect(results[0]).toBeDefined();
      expect(results[1]).toBe(false);
      expect(results[2]).toBeDefined();
    });

    it('should handle empty usage increments', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      mockSupabase.single
        .mockResolvedValueOnce({
          data: { id: userId, video_minutes_used: 10, ai_requests_used: 20 },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: userId, video_minutes_used: 10, ai_requests_used: 20 },
          error: null,
        });

      const result = await userService.incrementUsage(userId, {});

      // Should not update anything, but should still succeed
      expect(mockSupabase.update).toHaveBeenCalledWith({});
    });

    it('should handle negative increments (decrement)', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      mockSupabase.single
        .mockResolvedValueOnce({
          data: { id: userId, video_minutes_used: 10, ai_requests_used: 20 },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: userId, video_minutes_used: 5, ai_requests_used: 20 },
          error: null,
        });

      const result = await userService.incrementUsage(userId, { video_minutes: -5 });

      expect(result.video_minutes_used).toBe(5);
    });
  });
});
