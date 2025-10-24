import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as cacheInvalidation from '@/lib/cacheInvalidation';
import * as cache from '@/lib/cache';
import * as serverLogger from '@/lib/serverLogger';

vi.mock('@/lib/cache');
vi.mock('@/lib/serverLogger');

describe('cacheInvalidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(cache.cache, 'del').mockResolvedValue();
    vi.spyOn(cache.cache, 'delPattern').mockResolvedValue(0);
  });

  describe('invalidateUserCache', () => {
    it('should invalidate all user-related caches', async () => {
      const userId = 'user-123';

      await cacheInvalidation.invalidateUserCache(userId);

      expect(cache.cache.del).toHaveBeenCalledWith(cache.CacheKeys.userProfile(userId));
      expect(cache.cache.del).toHaveBeenCalledWith(cache.CacheKeys.userSettings(userId));
      expect(cache.cache.del).toHaveBeenCalledWith(cache.CacheKeys.userSubscription(userId));
      expect(cache.cache.del).toHaveBeenCalledWith(cache.CacheKeys.userProjects(userId));
    });

    it('should log the invalidation', async () => {
      const userId = 'user-123';

      await cacheInvalidation.invalidateUserCache(userId);

      expect(serverLogger.serverLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'cache.invalidate_user',
          userId,
        }),
        expect.any(String)
      );
    });

    it('should handle errors gracefully', async () => {
      const userId = 'user-123';
      const error = new Error('Cache error');
      vi.spyOn(cache.cache, 'del').mockRejectedValue(error);

      await cacheInvalidation.invalidateUserCache(userId);

      expect(serverLogger.serverLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'cache.invalidate_user_error',
          userId,
          error,
        }),
        expect.any(String)
      );
    });
  });

  describe('invalidateUserProfile', () => {
    it('should invalidate user profile cache', async () => {
      const userId = 'user-123';

      await cacheInvalidation.invalidateUserProfile(userId);

      expect(cache.cache.del).toHaveBeenCalledWith(cache.CacheKeys.userProfile(userId));
    });

    it('should log the invalidation', async () => {
      const userId = 'user-123';

      await cacheInvalidation.invalidateUserProfile(userId);

      expect(serverLogger.serverLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'cache.invalidate_user_profile',
          userId,
        }),
        expect.any(String)
      );
    });
  });

  describe('invalidateUserSubscription', () => {
    it('should invalidate user subscription cache', async () => {
      const userId = 'user-123';

      await cacheInvalidation.invalidateUserSubscription(userId);

      expect(cache.cache.del).toHaveBeenCalledWith(cache.CacheKeys.userSubscription(userId));
    });
  });

  describe('invalidateUserSettings', () => {
    it('should invalidate user settings cache', async () => {
      const userId = 'user-123';

      await cacheInvalidation.invalidateUserSettings(userId);

      expect(cache.cache.del).toHaveBeenCalledWith(cache.CacheKeys.userSettings(userId));
    });
  });

  describe('invalidateProjectCache', () => {
    it('should invalidate project metadata cache', async () => {
      const projectId = 'project-456';

      await cacheInvalidation.invalidateProjectCache(projectId);

      expect(cache.cache.del).toHaveBeenCalledWith(cache.CacheKeys.projectMetadata(projectId));
    });

    it('should also invalidate user projects list if userId provided', async () => {
      const projectId = 'project-456';
      const userId = 'user-123';

      await cacheInvalidation.invalidateProjectCache(projectId, userId);

      expect(cache.cache.del).toHaveBeenCalledWith(cache.CacheKeys.projectMetadata(projectId));
      expect(cache.cache.del).toHaveBeenCalledWith(cache.CacheKeys.userProjects(userId));
    });
  });

  describe('invalidateUserProjects', () => {
    it('should invalidate user projects list cache', async () => {
      const userId = 'user-123';

      await cacheInvalidation.invalidateUserProjects(userId);

      expect(cache.cache.del).toHaveBeenCalledWith(cache.CacheKeys.userProjects(userId));
    });
  });

  describe('invalidateAssetCache', () => {
    it('should invalidate asset cache', async () => {
      const assetId = 'asset-789';

      await cacheInvalidation.invalidateAssetCache(assetId);

      expect(cache.cache.del).toHaveBeenCalledWith(cache.CacheKeys.asset(assetId));
    });

    it('should also invalidate user assets list if userId and projectId provided', async () => {
      const assetId = 'asset-789';
      const userId = 'user-123';
      const projectId = 'project-456';

      await cacheInvalidation.invalidateAssetCache(assetId, userId, projectId);

      expect(cache.cache.del).toHaveBeenCalledWith(cache.CacheKeys.asset(assetId));
      expect(cache.cache.del).toHaveBeenCalledWith(cache.CacheKeys.userAssets(userId, projectId));
    });
  });

  describe('invalidateAllProjectCaches', () => {
    it('should invalidate all project-related caches', async () => {
      const userId = 'user-123';
      vi.spyOn(cache.cache, 'delPattern').mockResolvedValue(5);

      await cacheInvalidation.invalidateAllProjectCaches(userId);

      expect(cache.cache.del).toHaveBeenCalledWith(cache.CacheKeys.userProjects(userId));
      expect(cache.cache.delPattern).toHaveBeenCalledWith('project:metadata:*');
    });

    it('should log the number of invalidated caches', async () => {
      const userId = 'user-123';

      await cacheInvalidation.invalidateAllProjectCaches(userId);

      expect(serverLogger.serverLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'cache.invalidate_all_projects',
          userId,
        }),
        expect.any(String)
      );
    });
  });

  describe('invalidateProjectAssets', () => {
    it('should invalidate project assets cache', async () => {
      const userId = 'user-123';
      const projectId = 'project-456';

      await cacheInvalidation.invalidateProjectAssets(userId, projectId);

      expect(cache.cache.del).toHaveBeenCalledWith(cache.CacheKeys.userAssets(userId, projectId));
    });
  });

  describe('invalidateOnStripeWebhook', () => {
    it('should invalidate subscription cache for all webhook events', async () => {
      const userId = 'user-123';
      const eventType = 'invoice.paid';

      await cacheInvalidation.invalidateOnStripeWebhook(userId, eventType);

      expect(cache.cache.del).toHaveBeenCalledWith(cache.CacheKeys.userSubscription(userId));
    });

    it('should also invalidate profile for subscription lifecycle events', async () => {
      const userId = 'user-123';

      // Test created
      await cacheInvalidation.invalidateOnStripeWebhook(userId, 'customer.subscription.created');
      expect(cache.cache.del).toHaveBeenCalledWith(cache.CacheKeys.userProfile(userId));

      vi.clearAllMocks();

      // Test updated
      await cacheInvalidation.invalidateOnStripeWebhook(userId, 'customer.subscription.updated');
      expect(cache.cache.del).toHaveBeenCalledWith(cache.CacheKeys.userProfile(userId));

      vi.clearAllMocks();

      // Test deleted
      await cacheInvalidation.invalidateOnStripeWebhook(userId, 'customer.subscription.deleted');
      expect(cache.cache.del).toHaveBeenCalledWith(cache.CacheKeys.userProfile(userId));
    });

    it('should not invalidate profile for non-subscription events', async () => {
      const userId = 'user-123';

      await cacheInvalidation.invalidateOnStripeWebhook(userId, 'invoice.paid');

      expect(cache.cache.del).toHaveBeenCalledWith(cache.CacheKeys.userSubscription(userId));
      expect(cache.cache.del).not.toHaveBeenCalledWith(cache.CacheKeys.userProfile(userId));
    });
  });

  describe('invalidateMultipleUsers', () => {
    it('should invalidate cache for multiple users in parallel', async () => {
      const userIds = ['user-1', 'user-2', 'user-3'];

      await cacheInvalidation.invalidateMultipleUsers(userIds);

      // Should have been called 4 times per user (profile, settings, subscription, projects)
      expect(cache.cache.del).toHaveBeenCalledTimes(12);
    });

    it('should log the operation', async () => {
      const userIds = ['user-1', 'user-2'];

      await cacheInvalidation.invalidateMultipleUsers(userIds);

      expect(serverLogger.serverLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'cache.invalidate_multiple_users',
          count: 2,
        }),
        expect.any(String)
      );
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', () => {
      const mockStats = {
        hits: 100,
        misses: 50,
        sets: 75,
        deletes: 25,
        hitRate: 0.67,
        size: 50,
        maxSize: 1000,
      };

      vi.spyOn(cache.cache, 'getStats').mockReturnValue(mockStats);

      const stats = cacheInvalidation.getCacheStats();

      expect(stats).toEqual(mockStats);
      expect(cache.cache.getStats).toHaveBeenCalled();
    });
  });

  describe('clearAllCaches', () => {
    it('should clear all caches', async () => {
      vi.spyOn(cache.cache, 'clear').mockResolvedValue();

      await cacheInvalidation.clearAllCaches();

      expect(cache.cache.clear).toHaveBeenCalled();
    });

    it('should log warning when clearing all caches', async () => {
      vi.spyOn(cache.cache, 'clear').mockResolvedValue();

      await cacheInvalidation.clearAllCaches();

      expect(serverLogger.serverLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'cache.clear_all',
        }),
        expect.any(String)
      );
    });

    it('should handle errors when clearing', async () => {
      const error = new Error('Clear failed');
      vi.spyOn(cache.cache, 'clear').mockRejectedValue(error);

      await cacheInvalidation.clearAllCaches();

      expect(serverLogger.serverLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'cache.clear_all_error',
          error,
        }),
        expect.any(String)
      );
    });
  });
});
