/**
 * Tests for Cache Invalidation Layer
 *
 * Tests all cache invalidation utilities including:
 * - Individual cache invalidation functions
 * - Bulk invalidation operations
 * - Error handling and logging
 * - Webhook-based invalidation
 * - Pattern-based cache clearing
 *
 * Follows AAA pattern (Arrange-Act-Assert)
 */

import {
  invalidateUserCache,
  invalidateUserProfile,
  invalidateUserSubscription,
  invalidateUserSettings,
  invalidateProjectCache,
  invalidateUserProjects,
  invalidateAssetCache,
  invalidateAllProjectCaches,
  invalidateProjectAssets,
  invalidateOnStripeWebhook,
  invalidateMultipleUsers,
  getCacheStats,
  clearAllCaches,
} from '@/lib/cacheInvalidation';
import { cache, CacheKeys } from '@/lib/cache';
import { serverLogger } from '@/lib/serverLogger';

// Mock dependencies
jest.mock(
  '@/lib/cache',
  (): Record<string, unknown> => ({
    cache: {
      del: jest.fn(),
      delPattern: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
      clear: jest.fn(),
      getStats: jest.fn(),
    },
    CacheKeys: {
      userProfile: (userId: string) => `user:profile:${userId}`,
      userSettings: (userId: string) => `user:settings:${userId}`,
      userSubscription: (userId: string) => `user:subscription:${userId}`,
      userProjects: (userId: string) => `user:projects:${userId}`,
      projectMetadata: (projectId: string) => `project:metadata:${projectId}`,
      asset: (assetId: string) => `asset:${assetId}`,
      userAssets: (userId: string, projectId: string) =>
        `user:${userId}:project:${projectId}:assets`,
    },
  })
);

jest.mock(
  '@/lib/serverLogger',
  (): Record<string, unknown> => ({
    serverLogger: {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
  })
);

describe('CacheInvalidation', () => {
  let mockCache: jest.Mocked<typeof cache>;
  let mockLogger: jest.Mocked<typeof serverLogger>;

  beforeEach((): void => {
    mockCache = cache as jest.Mocked<typeof cache>;
    mockLogger = serverLogger as jest.Mocked<typeof serverLogger>;
    jest.clearAllMocks();
  });

  describe('invalidateUserCache', () => {
    it('should invalidate all user-related cache keys', async () => {
      // Arrange
      const userId = 'user-123';
      mockCache.del.mockResolvedValue(undefined);

      // Act
      await invalidateUserCache(userId);

      // Assert
      expect(mockCache.del).toHaveBeenCalledTimes(4);
      expect(mockCache.del).toHaveBeenCalledWith(CacheKeys.userProfile(userId));
      expect(mockCache.del).toHaveBeenCalledWith(CacheKeys.userSettings(userId));
      expect(mockCache.del).toHaveBeenCalledWith(CacheKeys.userSubscription(userId));
      expect(mockCache.del).toHaveBeenCalledWith(CacheKeys.userProjects(userId));
    });

    it('should log successful invalidation', async () => {
      // Arrange
      const userId = 'user-123';
      mockCache.del.mockResolvedValue(undefined);

      // Act
      await invalidateUserCache(userId);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'cache.invalidate_user',
          userId,
          duration: expect.any(Number),
        }),
        expect.stringContaining(`Invalidated cache for user ${userId}`)
      );
    });

    it('should handle errors and log them', async () => {
      // Arrange
      const userId = 'user-123';
      const error = new Error('Cache deletion failed');
      mockCache.del.mockRejectedValue(error);

      // Act
      await invalidateUserCache(userId);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'cache.invalidate_user_error',
          userId,
          error,
        }),
        'Error invalidating user cache'
      );
    });
  });

  describe('invalidateUserProfile', () => {
    it('should invalidate only user profile cache', async () => {
      // Arrange
      const userId = 'user-123';
      mockCache.del.mockResolvedValue(undefined);

      // Act
      await invalidateUserProfile(userId);

      // Assert
      expect(mockCache.del).toHaveBeenCalledTimes(1);
      expect(mockCache.del).toHaveBeenCalledWith(CacheKeys.userProfile(userId));
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'cache.invalidate_user_profile',
          userId,
        }),
        expect.any(String)
      );
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const userId = 'user-123';
      const error = new Error('Delete failed');
      mockCache.del.mockRejectedValue(error);

      // Act
      await invalidateUserProfile(userId);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'cache.invalidate_user_profile_error',
          userId,
          error,
        }),
        'Error invalidating user profile cache'
      );
    });
  });

  describe('invalidateUserSubscription', () => {
    it('should invalidate user subscription cache', async () => {
      // Arrange
      const userId = 'user-123';
      mockCache.del.mockResolvedValue(undefined);

      // Act
      await invalidateUserSubscription(userId);

      // Assert
      expect(mockCache.del).toHaveBeenCalledWith(CacheKeys.userSubscription(userId));
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'cache.invalidate_user_subscription',
          userId,
        }),
        expect.any(String)
      );
    });

    it('should handle errors', async () => {
      // Arrange
      const userId = 'user-123';
      const error = new Error('Cache error');
      mockCache.del.mockRejectedValue(error);

      // Act
      await invalidateUserSubscription(userId);

      // Assert
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('invalidateUserSettings', () => {
    it('should invalidate user settings cache', async () => {
      // Arrange
      const userId = 'user-123';
      mockCache.del.mockResolvedValue(undefined);

      // Act
      await invalidateUserSettings(userId);

      // Assert
      expect(mockCache.del).toHaveBeenCalledWith(CacheKeys.userSettings(userId));
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'cache.invalidate_user_settings',
          userId,
        }),
        expect.any(String)
      );
    });
  });

  describe('invalidateProjectCache', () => {
    it('should invalidate project metadata cache', async () => {
      // Arrange
      const projectId = 'project-123';
      mockCache.del.mockResolvedValue(undefined);

      // Act
      await invalidateProjectCache(projectId);

      // Assert
      expect(mockCache.del).toHaveBeenCalledWith(CacheKeys.projectMetadata(projectId));
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'cache.invalidate_project',
          projectId,
          userId: undefined,
        }),
        expect.any(String)
      );
    });

    it('should also invalidate user projects list when userId provided', async () => {
      // Arrange
      const projectId = 'project-123';
      const userId = 'user-123';
      mockCache.del.mockResolvedValue(undefined);

      // Act
      await invalidateProjectCache(projectId, userId);

      // Assert
      expect(mockCache.del).toHaveBeenCalledTimes(2);
      expect(mockCache.del).toHaveBeenCalledWith(CacheKeys.projectMetadata(projectId));
      expect(mockCache.del).toHaveBeenCalledWith(CacheKeys.userProjects(userId));
    });

    it('should handle errors', async () => {
      // Arrange
      const projectId = 'project-123';
      const error = new Error('Delete failed');
      mockCache.del.mockRejectedValue(error);

      // Act
      await invalidateProjectCache(projectId);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'cache.invalidate_project_error',
          projectId,
          error,
        }),
        'Error invalidating project cache'
      );
    });
  });

  describe('invalidateUserProjects', () => {
    it('should invalidate user projects list cache', async () => {
      // Arrange
      const userId = 'user-123';
      mockCache.del.mockResolvedValue(undefined);

      // Act
      await invalidateUserProjects(userId);

      // Assert
      expect(mockCache.del).toHaveBeenCalledWith(CacheKeys.userProjects(userId));
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'cache.invalidate_user_projects',
          userId,
        }),
        expect.any(String)
      );
    });

    it('should handle errors', async () => {
      // Arrange
      const userId = 'user-123';
      const error = new Error('Delete failed');
      mockCache.del.mockRejectedValue(error);

      // Act
      await invalidateUserProjects(userId);

      // Assert
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('invalidateAssetCache', () => {
    it('should invalidate asset cache', async () => {
      // Arrange
      const assetId = 'asset-123';
      mockCache.del.mockResolvedValue(undefined);

      // Act
      await invalidateAssetCache(assetId);

      // Assert
      expect(mockCache.del).toHaveBeenCalledWith(CacheKeys.asset(assetId));
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'cache.invalidate_asset',
          assetId,
        }),
        expect.any(String)
      );
    });

    it('should also invalidate user assets when userId and projectId provided', async () => {
      // Arrange
      const assetId = 'asset-123';
      const userId = 'user-123';
      const projectId = 'project-123';
      mockCache.del.mockResolvedValue(undefined);

      // Act
      await invalidateAssetCache(assetId, userId, projectId);

      // Assert
      expect(mockCache.del).toHaveBeenCalledTimes(2);
      expect(mockCache.del).toHaveBeenCalledWith(CacheKeys.asset(assetId));
      expect(mockCache.del).toHaveBeenCalledWith(CacheKeys.userAssets(userId, projectId));
    });

    it('should handle errors', async () => {
      // Arrange
      const assetId = 'asset-123';
      const error = new Error('Delete failed');
      mockCache.del.mockRejectedValue(error);

      // Act
      await invalidateAssetCache(assetId);

      // Assert
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('invalidateAllProjectCaches', () => {
    it('should invalidate all project-related caches', async () => {
      // Arrange
      const userId = 'user-123';
      mockCache.del.mockResolvedValue(undefined);
      mockCache.delPattern.mockResolvedValue(undefined);

      // Act
      await invalidateAllProjectCaches(userId);

      // Assert
      expect(mockCache.del).toHaveBeenCalledWith(CacheKeys.userProjects(userId));
      expect(mockCache.delPattern).toHaveBeenCalledWith('project:metadata:*');
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'cache.invalidate_all_projects',
          userId,
        }),
        expect.any(String)
      );
    });

    it('should handle errors', async () => {
      // Arrange
      const userId = 'user-123';
      const error = new Error('Delete failed');
      mockCache.del.mockRejectedValue(error);

      // Act
      await invalidateAllProjectCaches(userId);

      // Assert
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('invalidateProjectAssets', () => {
    it('should invalidate project assets cache', async () => {
      // Arrange
      const userId = 'user-123';
      const projectId = 'project-123';
      mockCache.del.mockResolvedValue(undefined);

      // Act
      await invalidateProjectAssets(userId, projectId);

      // Assert
      expect(mockCache.del).toHaveBeenCalledWith(CacheKeys.userAssets(userId, projectId));
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'cache.invalidate_project_assets',
          userId,
          projectId,
        }),
        expect.any(String)
      );
    });

    it('should handle errors', async () => {
      // Arrange
      const userId = 'user-123';
      const projectId = 'project-123';
      const error = new Error('Delete failed');
      mockCache.del.mockRejectedValue(error);

      // Act
      await invalidateProjectAssets(userId, projectId);

      // Assert
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('invalidateOnStripeWebhook', () => {
    it('should always invalidate subscription cache', async () => {
      // Arrange
      const userId = 'user-123';
      const eventType = 'invoice.paid';
      mockCache.del.mockResolvedValue(undefined);

      // Act
      await invalidateOnStripeWebhook(userId, eventType);

      // Assert
      expect(mockCache.del).toHaveBeenCalledWith(CacheKeys.userSubscription(userId));
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'cache.invalidate_stripe_webhook',
          userId,
          eventType,
        }),
        expect.any(String)
      );
    });

    it('should invalidate profile on subscription created event', async () => {
      // Arrange
      const userId = 'user-123';
      const eventType = 'customer.subscription.created';
      mockCache.del.mockResolvedValue(undefined);

      // Act
      await invalidateOnStripeWebhook(userId, eventType);

      // Assert
      expect(mockCache.del).toHaveBeenCalledWith(CacheKeys.userSubscription(userId));
      expect(mockCache.del).toHaveBeenCalledWith(CacheKeys.userProfile(userId));
    });

    it('should invalidate profile on subscription updated event', async () => {
      // Arrange
      const userId = 'user-123';
      const eventType = 'customer.subscription.updated';
      mockCache.del.mockResolvedValue(undefined);

      // Act
      await invalidateOnStripeWebhook(userId, eventType);

      // Assert
      expect(mockCache.del).toHaveBeenCalledWith(CacheKeys.userSubscription(userId));
      expect(mockCache.del).toHaveBeenCalledWith(CacheKeys.userProfile(userId));
    });

    it('should invalidate profile on subscription deleted event', async () => {
      // Arrange
      const userId = 'user-123';
      const eventType = 'customer.subscription.deleted';
      mockCache.del.mockResolvedValue(undefined);

      // Act
      await invalidateOnStripeWebhook(userId, eventType);

      // Assert
      expect(mockCache.del).toHaveBeenCalledWith(CacheKeys.userSubscription(userId));
      expect(mockCache.del).toHaveBeenCalledWith(CacheKeys.userProfile(userId));
    });

    it('should handle errors', async () => {
      // Arrange
      const userId = 'user-123';
      const eventType = 'invoice.paid';
      const error = new Error('Delete failed');
      mockCache.del.mockRejectedValue(error);

      // Act
      await invalidateOnStripeWebhook(userId, eventType);

      // Assert
      // Error will be logged from invalidateUserSubscription function
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'cache.invalidate_user_subscription_error',
          userId,
          error,
        }),
        'Error invalidating user subscription cache'
      );
    });
  });

  describe('invalidateMultipleUsers', () => {
    it('should invalidate cache for multiple users in parallel', async () => {
      // Arrange
      const userIds = ['user-1', 'user-2', 'user-3'];
      mockCache.del.mockResolvedValue(undefined);

      // Act
      await invalidateMultipleUsers(userIds);

      // Assert
      // Each user should have 4 cache deletes (profile, settings, subscription, projects)
      expect(mockCache.del).toHaveBeenCalledTimes(12);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'cache.invalidate_multiple_users',
          count: 3,
        }),
        expect.stringContaining('Invalidated cache for 3 users')
      );
    });

    it('should handle empty array', async () => {
      // Arrange
      const userIds: string[] = [];
      mockCache.del.mockResolvedValue(undefined);

      // Act
      await invalidateMultipleUsers(userIds);

      // Assert
      expect(mockCache.del).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'cache.invalidate_multiple_users',
          count: 0,
        }),
        expect.stringContaining('Invalidated cache for 0 users')
      );
    });

    it('should handle errors', async () => {
      // Arrange
      const userIds = ['user-1', 'user-2'];
      const error = new Error('Bulk delete failed');
      mockCache.del.mockRejectedValue(error);

      // Act
      await invalidateMultipleUsers(userIds);

      // Assert
      // Errors will be logged from individual invalidateUserCache calls
      expect(mockLogger.error).toHaveBeenCalledTimes(2);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'cache.invalidate_user_error',
          userId: 'user-1',
          error,
        }),
        'Error invalidating user cache'
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'cache.invalidate_user_error',
          userId: 'user-2',
          error,
        }),
        'Error invalidating user cache'
      );
    });

    it('should handle partial failures gracefully', async () => {
      // Arrange
      const userIds = ['user-1', 'user-2', 'user-3'];
      mockCache.del
        .mockResolvedValueOnce(undefined) // user-1 profile
        .mockResolvedValueOnce(undefined) // user-1 settings
        .mockResolvedValueOnce(undefined) // user-1 subscription
        .mockResolvedValueOnce(undefined) // user-1 projects
        .mockRejectedValueOnce(new Error('Failed')) // user-2 profile fails
        .mockResolvedValueOnce(undefined); // subsequent calls succeed

      // Act
      await invalidateMultipleUsers(userIds);

      // Assert - should attempt to invalidate all users despite partial failure
      expect(mockCache.del).toHaveBeenCalled();
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', () => {
      // Arrange
      const mockStats = {
        hits: 100,
        misses: 20,
        size: 500,
        keys: 50,
      };
      mockCache.getStats.mockReturnValue(mockStats);

      // Act
      const stats = getCacheStats();

      // Assert
      expect(stats).toEqual(mockStats);
      expect(mockCache.getStats).toHaveBeenCalled();
    });
  });

  describe('clearAllCaches', () => {
    it('should clear all caches', async () => {
      // Arrange
      mockCache.clear.mockResolvedValue(undefined);

      // Act
      await clearAllCaches();

      // Assert
      expect(mockCache.clear).toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'cache.clear_all',
        }),
        'All caches cleared'
      );
    });

    it('should handle errors', async () => {
      // Arrange
      const error = new Error('Clear failed');
      mockCache.clear.mockRejectedValue(error);

      // Act
      await clearAllCaches();

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'cache.clear_all_error',
          error,
        }),
        'Error clearing all caches'
      );
    });
  });

  describe('Performance and concurrency', () => {
    it('should handle concurrent invalidations for same user', async () => {
      // Arrange
      const userId = 'user-123';
      mockCache.del.mockResolvedValue(undefined);

      // Act
      await Promise.all([
        invalidateUserCache(userId),
        invalidateUserProfile(userId),
        invalidateUserSubscription(userId),
      ]);

      // Assert
      // Should handle concurrent calls without errors
      expect(mockCache.del).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalled();
    });

    it('should handle concurrent invalidations for different users', async () => {
      // Arrange
      const userIds = ['user-1', 'user-2', 'user-3'];
      mockCache.del.mockResolvedValue(undefined);

      // Act
      await Promise.all(userIds.map((userId) => invalidateUserCache(userId)));

      // Assert
      expect(mockCache.del).toHaveBeenCalledTimes(12); // 4 deletes per user * 3 users
    });

    it('should measure invalidation duration', async () => {
      // Arrange
      const userId = 'user-123';
      mockCache.del.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve(undefined), 10);
        });
      });

      // Act
      await invalidateUserCache(userId);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'cache.invalidate_user',
          userId,
          duration: expect.any(Number),
        }),
        expect.any(String)
      );

      const logCall = mockLogger.info.mock.calls[0][0] as { duration: number };
      expect(logCall.duration).toBeGreaterThan(0);
    });
  });
});
