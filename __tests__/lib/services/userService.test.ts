/**
 * @jest-environment node
 */
import { UserService } from '@/lib/services/userService';
import {
  createMockSupabaseClient,
  createMockUserProfile,
  resetAllMocks,
} from '@/test-utils/mockSupabase';
import { trackError } from '@/lib/errorTracking';

// Mock dependencies
jest.mock('@/lib/errorTracking');
jest.mock('@/lib/validation', () => ({
  validateUUID: jest.fn((id: string) => {
    if (!id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      throw new Error('Invalid UUID format');
    }
  }),
}));

describe('UserService', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  let userService: UserService;
  const userId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    userService = new UserService(mockSupabase as any);
    jest.clearAllMocks();
  });

  afterEach(() => {
    resetAllMocks(mockSupabase);
  });

  describe('getUserProfile', () => {
    it('should return user profile', async () => {
      // Arrange
      const mockProfile = createMockUserProfile({ id: userId });

      mockSupabase.from.mockImplementation(() => {
        const builder = mockSupabase;
        builder.select.mockReturnValue(builder);
        builder.eq.mockReturnValue(builder);
        builder.single.mockResolvedValue({ data: mockProfile, error: null });
        return builder;
      });

      // Act
      const result = await userService.getUserProfile(userId);

      // Assert
      expect(result).toEqual(mockProfile);
      expect(mockSupabase.from).toHaveBeenCalledWith('user_profiles');
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', userId);
    });

    it('should return null when profile not found', async () => {
      // Arrange
      mockSupabase.from.mockImplementation(() => {
        const builder = mockSupabase;
        builder.select.mockReturnValue(builder);
        builder.eq.mockReturnValue(builder);
        builder.single.mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'Not found' },
        });
        return builder;
      });

      // Act
      const result = await userService.getUserProfile(userId);

      // Assert
      expect(result).toBeNull();
    });

    it('should throw error for invalid UUID', async () => {
      // Act & Assert
      await expect(userService.getUserProfile('invalid-uuid')).rejects.toThrow(
        'Invalid UUID format'
      );
    });

    it('should throw error when database query fails', async () => {
      // Arrange
      mockSupabase.from.mockImplementation(() => {
        const builder = mockSupabase;
        builder.select.mockReturnValue(builder);
        builder.eq.mockReturnValue(builder);
        builder.single.mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        });
        return builder;
      });

      // Act & Assert
      await expect(userService.getUserProfile(userId)).rejects.toThrow(
        'Failed to fetch user profile'
      );
      expect(trackError).toHaveBeenCalled();
    });
  });

  describe('getAllUserProfiles', () => {
    it('should return all user profiles', async () => {
      // Arrange
      const mockProfiles = [
        createMockUserProfile({ id: userId }),
        createMockUserProfile({ id: '550e8400-e29b-41d4-a716-446655440001' }),
      ];

      mockSupabase.from.mockImplementation(() => {
        const builder = mockSupabase;
        builder.select.mockReturnValue(builder);
        builder.order.mockResolvedValue({ data: mockProfiles, error: null });
        return builder;
      });

      // Act
      const result = await userService.getAllUserProfiles();

      // Assert
      expect(result).toEqual(mockProfiles);
      expect(mockSupabase.from).toHaveBeenCalledWith('user_profiles');
      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('should return empty array when no profiles exist', async () => {
      // Arrange
      mockSupabase.from.mockImplementation(() => {
        const builder = mockSupabase;
        builder.select.mockReturnValue(builder);
        builder.order.mockResolvedValue({ data: null, error: null });
        return builder;
      });

      // Act
      const result = await userService.getAllUserProfiles();

      // Assert
      expect(result).toEqual([]);
    });

    it('should throw error when database query fails', async () => {
      // Arrange
      mockSupabase.from.mockImplementation(() => {
        const builder = mockSupabase;
        builder.select.mockReturnValue(builder);
        builder.order.mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        });
        return builder;
      });

      // Act & Assert
      await expect(userService.getAllUserProfiles()).rejects.toThrow(
        'Failed to fetch user profiles'
      );
      expect(trackError).toHaveBeenCalled();
    });
  });

  describe('updateUserTier', () => {
    it('should update user tier successfully', async () => {
      // Arrange
      const newTier = 'pro' as const;
      const mockProfile = createMockUserProfile({ id: userId, tier: newTier });

      mockSupabase.from.mockImplementation(() => {
        const builder = mockSupabase;
        builder.update.mockReturnValue(builder);
        builder.eq.mockReturnValue(builder);
        builder.select.mockReturnValue(builder);
        builder.single.mockResolvedValue({ data: mockProfile, error: null });
        return builder;
      });

      // Act
      const result = await userService.updateUserTier(userId, newTier);

      // Assert
      expect(result).toEqual(mockProfile);
      expect(mockSupabase.update).toHaveBeenCalledWith({ tier: newTier });
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', userId);
    });

    it('should throw error when profile not found', async () => {
      // Arrange
      mockSupabase.from.mockImplementation(() => {
        const builder = mockSupabase;
        builder.update.mockReturnValue(builder);
        builder.eq.mockReturnValue(builder);
        builder.select.mockReturnValue(builder);
        builder.single.mockResolvedValue({ data: null, error: null });
        return builder;
      });

      // Act & Assert
      await expect(userService.updateUserTier(userId, 'pro' as any)).rejects.toThrow(
        'User profile not found'
      );
    });

    it('should throw error when update fails', async () => {
      // Arrange
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
      await expect(userService.updateUserTier(userId, 'pro' as any)).rejects.toThrow(
        'Failed to update user tier'
      );
      expect(trackError).toHaveBeenCalled();
    });
  });

  describe('updateUsageLimits', () => {
    it('should update usage limits successfully', async () => {
      // Arrange
      const limits = { video_minutes_limit: 120, ai_requests_limit: 100 };
      const mockProfile = createMockUserProfile({ id: userId, ...limits });

      mockSupabase.from.mockImplementation(() => {
        const builder = mockSupabase;
        builder.update.mockReturnValue(builder);
        builder.eq.mockReturnValue(builder);
        builder.select.mockReturnValue(builder);
        builder.single.mockResolvedValue({ data: mockProfile, error: null });
        return builder;
      });

      // Act
      const result = await userService.updateUsageLimits(userId, limits);

      // Assert
      expect(result).toEqual(mockProfile);
      expect(mockSupabase.update).toHaveBeenCalledWith(limits);
    });

    it('should throw error when update fails', async () => {
      // Arrange
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
      await expect(
        userService.updateUsageLimits(userId, { video_minutes_limit: 120 })
      ).rejects.toThrow('Failed to update usage limits');
      expect(trackError).toHaveBeenCalled();
    });
  });

  describe('incrementUsage', () => {
    it('should increment video minutes usage', async () => {
      // Arrange
      const currentProfile = createMockUserProfile({
        id: userId,
        video_minutes_used: 10,
        ai_requests_used: 5,
      });
      const updatedProfile = createMockUserProfile({
        id: userId,
        video_minutes_used: 15,
        ai_requests_used: 5,
      });

      // Mock getUserProfile call
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        const builder = mockSupabase;
        builder.select.mockReturnValue(builder);
        builder.eq.mockReturnValue(builder);

        callCount++;
        if (callCount === 1) {
          // First call - getUserProfile
          builder.single.mockResolvedValue({ data: currentProfile, error: null });
        } else {
          // Second call - update
          builder.update.mockReturnValue(builder);
          builder.single.mockResolvedValue({ data: updatedProfile, error: null });
        }
        return builder;
      });

      // Act
      const result = await userService.incrementUsage(userId, { video_minutes: 5 });

      // Assert
      expect(result.video_minutes_used).toBe(15);
      expect(result.ai_requests_used).toBe(5);
    });

    it('should increment AI requests usage', async () => {
      // Arrange
      const currentProfile = createMockUserProfile({
        id: userId,
        video_minutes_used: 10,
        ai_requests_used: 5,
      });
      const updatedProfile = createMockUserProfile({
        id: userId,
        video_minutes_used: 10,
        ai_requests_used: 8,
      });

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        const builder = mockSupabase;
        builder.select.mockReturnValue(builder);
        builder.eq.mockReturnValue(builder);

        callCount++;
        if (callCount === 1) {
          builder.single.mockResolvedValue({ data: currentProfile, error: null });
        } else {
          builder.update.mockReturnValue(builder);
          builder.single.mockResolvedValue({ data: updatedProfile, error: null });
        }
        return builder;
      });

      // Act
      const result = await userService.incrementUsage(userId, { ai_requests: 3 });

      // Assert
      expect(result.video_minutes_used).toBe(10);
      expect(result.ai_requests_used).toBe(8);
    });

    it('should throw error when profile not found', async () => {
      // Arrange
      mockSupabase.from.mockImplementation(() => {
        const builder = mockSupabase;
        builder.select.mockReturnValue(builder);
        builder.eq.mockReturnValue(builder);
        builder.single.mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'Not found' },
        });
        return builder;
      });

      // Act & Assert
      await expect(userService.incrementUsage(userId, { video_minutes: 5 })).rejects.toThrow(
        'User profile not found'
      );
    });
  });

  describe('isAdmin', () => {
    it('should return true for admin user', async () => {
      // Arrange
      const mockProfile = createMockUserProfile({ id: userId, tier: 'admin' });

      mockSupabase.from.mockImplementation(() => {
        const builder = mockSupabase;
        builder.select.mockReturnValue(builder);
        builder.eq.mockReturnValue(builder);
        builder.single.mockResolvedValue({ data: mockProfile, error: null });
        return builder;
      });

      // Act
      const result = await userService.isAdmin(userId);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for non-admin user', async () => {
      // Arrange
      const mockProfile = createMockUserProfile({ id: userId, tier: 'pro' });

      mockSupabase.from.mockImplementation(() => {
        const builder = mockSupabase;
        builder.select.mockReturnValue(builder);
        builder.eq.mockReturnValue(builder);
        builder.single.mockResolvedValue({ data: mockProfile, error: null });
        return builder;
      });

      // Act
      const result = await userService.isAdmin(userId);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when profile not found', async () => {
      // Arrange
      mockSupabase.from.mockImplementation(() => {
        const builder = mockSupabase;
        builder.select.mockReturnValue(builder);
        builder.eq.mockReturnValue(builder);
        builder.single.mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'Not found' },
        });
        return builder;
      });

      // Act
      const result = await userService.isAdmin(userId);

      // Assert
      expect(result).toBe(false);
      expect(trackError).toHaveBeenCalled();
    });

    it('should return false on database error', async () => {
      // Arrange
      mockSupabase.from.mockImplementation(() => {
        const builder = mockSupabase;
        builder.select.mockReturnValue(builder);
        builder.eq.mockReturnValue(builder);
        builder.single.mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        });
        return builder;
      });

      // Act
      const result = await userService.isAdmin(userId);

      // Assert
      expect(result).toBe(false);
      expect(trackError).toHaveBeenCalled();
    });
  });
});
