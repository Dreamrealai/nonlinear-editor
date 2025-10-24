/**
 * Cache Invalidation Layer
 *
 * Provides utilities to invalidate cache entries when data changes.
 * Critical for maintaining cache consistency with database state.
 *
 * Features:
 * - Automatic invalidation on data mutations
 * - Pattern-based cache clearing
 * - Bulk invalidation support
 * - Granular control over what gets invalidated
 *
 * Usage:
 * ```typescript
 * import { invalidateUserCache } from '@/lib/cacheInvalidation';
 *
 * // After updating user profile
 * await invalidateUserCache(userId);
 * ```
 */

import { cache, CacheKeys } from './cache';
import { serverLogger } from './serverLogger';

/**
 * Invalidate all cache entries for a specific user
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  try {
    const startTime = Date.now();

    // Delete all user-related cache keys
    await Promise.all([
      cache.del(CacheKeys.userProfile(userId)),
      cache.del(CacheKeys.userSettings(userId)),
      cache.del(CacheKeys.userSubscription(userId)),
      cache.del(CacheKeys.userProjects(userId)),
    ]);

    const duration = Date.now() - startTime;
    serverLogger.info({
      event: 'cache.invalidate_user',
      userId,
      duration,
    }, `Invalidated cache for user ${userId} (${duration}ms)`);
  } catch (error) {
    serverLogger.error({
      event: 'cache.invalidate_user_error',
      userId,
      error,
    }, 'Error invalidating user cache');
  }
}

/**
 * Invalidate user profile cache only
 */
export async function invalidateUserProfile(userId: string): Promise<void> {
  try {
    await cache.del(CacheKeys.userProfile(userId));

    serverLogger.debug({
      event: 'cache.invalidate_user_profile',
      userId,
    }, `Invalidated user profile cache for ${userId}`);
  } catch (error) {
    serverLogger.error({
      event: 'cache.invalidate_user_profile_error',
      userId,
      error,
    }, 'Error invalidating user profile cache');
  }
}

/**
 * Invalidate user subscription cache
 */
export async function invalidateUserSubscription(userId: string): Promise<void> {
  try {
    await cache.del(CacheKeys.userSubscription(userId));

    serverLogger.debug({
      event: 'cache.invalidate_user_subscription',
      userId,
    }, `Invalidated user subscription cache for ${userId}`);
  } catch (error) {
    serverLogger.error({
      event: 'cache.invalidate_user_subscription_error',
      userId,
      error,
    }, 'Error invalidating user subscription cache');
  }
}

/**
 * Invalidate user settings cache
 */
export async function invalidateUserSettings(userId: string): Promise<void> {
  try {
    await cache.del(CacheKeys.userSettings(userId));

    serverLogger.debug({
      event: 'cache.invalidate_user_settings',
      userId,
    }, `Invalidated user settings cache for ${userId}`);
  } catch (error) {
    serverLogger.error({
      event: 'cache.invalidate_user_settings_error',
      userId,
      error,
    }, 'Error invalidating user settings cache');
  }
}

/**
 * Invalidate project cache
 */
export async function invalidateProjectCache(
  projectId: string,
  userId?: string
): Promise<void> {
  try {
    const startTime = Date.now();

    // Delete project metadata cache
    await cache.del(CacheKeys.projectMetadata(projectId));

    // If userId provided, also invalidate user's projects list
    if (userId) {
      await cache.del(CacheKeys.userProjects(userId));
    }

    const duration = Date.now() - startTime;
    serverLogger.debug({
      event: 'cache.invalidate_project',
      projectId,
      userId,
      duration,
    }, `Invalidated project cache for ${projectId} (${duration}ms)`);
  } catch (error) {
    serverLogger.error({
      event: 'cache.invalidate_project_error',
      projectId,
      userId,
      error,
    }, 'Error invalidating project cache');
  }
}

/**
 * Invalidate user's projects list cache
 */
export async function invalidateUserProjects(userId: string): Promise<void> {
  try {
    await cache.del(CacheKeys.userProjects(userId));

    serverLogger.debug({
      event: 'cache.invalidate_user_projects',
      userId,
    }, `Invalidated user projects list cache for ${userId}`);
  } catch (error) {
    serverLogger.error({
      event: 'cache.invalidate_user_projects_error',
      userId,
      error,
    }, 'Error invalidating user projects cache');
  }
}

/**
 * Invalidate asset cache
 */
export async function invalidateAssetCache(
  assetId: string,
  userId?: string,
  projectId?: string
): Promise<void> {
  try {
    const startTime = Date.now();

    // Delete asset cache
    await cache.del(CacheKeys.asset(assetId));

    // If userId and projectId provided, also invalidate user's assets list
    if (userId && projectId) {
      await cache.del(CacheKeys.userAssets(userId, projectId));
    }

    const duration = Date.now() - startTime;
    serverLogger.debug({
      event: 'cache.invalidate_asset',
      assetId,
      userId,
      projectId,
      duration,
    }, `Invalidated asset cache for ${assetId} (${duration}ms)`);
  } catch (error) {
    serverLogger.error({
      event: 'cache.invalidate_asset_error',
      assetId,
      error,
    }, 'Error invalidating asset cache');
  }
}

/**
 * Invalidate all project-related caches for a user
 * Useful when a project is created, deleted, or when bulk operations occur
 */
export async function invalidateAllProjectCaches(userId: string): Promise<void> {
  try {
    const startTime = Date.now();

    // Delete user's projects list and pattern-match all project metadata
    await Promise.all([
      cache.del(CacheKeys.userProjects(userId)),
      cache.delPattern('project:metadata:*'),
    ]);

    const duration = Date.now() - startTime;
    serverLogger.info({
      event: 'cache.invalidate_all_projects',
      userId,
      duration,
    }, `Invalidated all project caches for user ${userId} (${duration}ms)`);
  } catch (error) {
    serverLogger.error({
      event: 'cache.invalidate_all_projects_error',
      userId,
      error,
    }, 'Error invalidating all project caches');
  }
}

/**
 * Invalidate all user assets for a project
 */
export async function invalidateProjectAssets(
  userId: string,
  projectId: string
): Promise<void> {
  try {
    await cache.del(CacheKeys.userAssets(userId, projectId));

    serverLogger.debug({
      event: 'cache.invalidate_project_assets',
      userId,
      projectId,
    }, `Invalidated project assets cache for ${projectId}`);
  } catch (error) {
    serverLogger.error({
      event: 'cache.invalidate_project_assets_error',
      userId,
      projectId,
      error,
    }, 'Error invalidating project assets cache');
  }
}

/**
 * Webhook handler: Invalidate cache after Stripe events
 */
export async function invalidateOnStripeWebhook(
  userId: string,
  eventType: string
): Promise<void> {
  try {
    const startTime = Date.now();

    // Always invalidate subscription cache
    await invalidateUserSubscription(userId);

    // For certain events, also invalidate profile (tier changes)
    if (
      eventType === 'customer.subscription.created' ||
      eventType === 'customer.subscription.updated' ||
      eventType === 'customer.subscription.deleted'
    ) {
      await invalidateUserProfile(userId);
    }

    const duration = Date.now() - startTime;
    serverLogger.info({
      event: 'cache.invalidate_stripe_webhook',
      userId,
      eventType,
      duration,
    }, `Cache invalidated for Stripe webhook ${eventType} (${duration}ms)`);
  } catch (error) {
    serverLogger.error({
      event: 'cache.invalidate_stripe_webhook_error',
      userId,
      eventType,
      error,
    }, 'Error invalidating cache for Stripe webhook');
  }
}

/**
 * Bulk invalidation: Clear all caches for multiple users
 * Useful for admin operations or system maintenance
 */
export async function invalidateMultipleUsers(
  userIds: string[]
): Promise<void> {
  try {
    const startTime = Date.now();

    // Invalidate each user's cache in parallel
    await Promise.all(userIds.map((userId): Promise<void> => invalidateUserCache(userId)));

    const duration = Date.now() - startTime;
    serverLogger.info({
      event: 'cache.invalidate_multiple_users',
      count: userIds.length,
      duration,
    }, `Invalidated cache for ${userIds.length} users (${duration}ms)`);
  } catch (error) {
    serverLogger.error({
      event: 'cache.invalidate_multiple_users_error',
      count: userIds.length,
      error,
    }, 'Error invalidating cache for multiple users');
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): CacheStats {
  return cache.getStats();
}

/**
 * Clear all caches (admin only - use with caution!)
 */
export async function clearAllCaches(): Promise<void> {
  try {
    await cache.clear();
    serverLogger.warn({
      event: 'cache.clear_all',
    }, 'All caches cleared');
  } catch (error) {
    serverLogger.error({
      event: 'cache.clear_all_error',
      error,
    }, 'Error clearing all caches');
  }
}
