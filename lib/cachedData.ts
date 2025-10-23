/**
 * Cached Data Access Layer
 *
 * Provides cached versions of frequently accessed database queries.
 * Automatically handles cache warming, invalidation, and fallback to database.
 *
 * Features:
 * - Automatic cache miss fallback to database
 * - Type-safe cached queries
 * - Consistent cache key management
 * - Performance monitoring
 *
 * Usage:
 * ```typescript
 * import { getCachedUserProfile } from '@/lib/cachedData';
 *
 * const profile = await getCachedUserProfile(supabase, userId);
 * ```
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { cache, CacheKeys, CacheTTL } from './cache';
import { serverLogger } from './serverLogger';

/**
 * User Profile Interface
 */
export interface UserProfile {
  id: string;
  tier: 'free' | 'premium' | 'admin';
  email?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * User Subscription Interface
 */
export interface UserSubscription {
  id: string;
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  status: string;
  price_id: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Project Metadata Interface
 */
export interface ProjectMetadata {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get user profile with caching
 */
export async function getCachedUserProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<UserProfile | null> {
  const cacheKey = CacheKeys.userProfile(userId);
  const startTime = Date.now();

  try {
    // Try cache first
    const cached = await cache.get<UserProfile>(cacheKey);
    if (cached) {
      const duration = Date.now() - startTime;
      serverLogger.debug({
        event: 'cache.hit',
        key: cacheKey,
        duration,
      }, `Cache hit: user profile ${userId} (${duration}ms)`);
      return cached;
    }

    // Cache miss - fetch from database
    serverLogger.debug({
      event: 'cache.miss',
      key: cacheKey,
    }, `Cache miss: fetching user profile ${userId} from database`);

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('id, tier, email, created_at, updated_at')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      const duration = Date.now() - startTime;
      serverLogger.warn({
        event: 'cachedData.user_profile.not_found',
        userId,
        error: error?.message,
        duration,
      }, `User profile not found: ${userId}`);
      return null;
    }

    // Store in cache
    await cache.set(cacheKey, profile, CacheTTL.userProfile);

    const duration = Date.now() - startTime;
    serverLogger.debug({
      event: 'cachedData.user_profile.fetched',
      userId,
      duration,
    }, `User profile fetched and cached (${duration}ms)`);

    return profile as UserProfile;
  } catch (error) {
    const duration = Date.now() - startTime;
    serverLogger.error({
      event: 'cachedData.user_profile.error',
      userId,
      error,
      duration,
    }, 'Error fetching user profile');
    return null;
  }
}

/**
 * Get user subscription with caching
 */
export async function getCachedUserSubscription(
  supabase: SupabaseClient,
  userId: string
): Promise<UserSubscription | null> {
  const cacheKey = CacheKeys.userSubscription(userId);
  const startTime = Date.now();

  try {
    // Try cache first
    const cached = await cache.get<UserSubscription>(cacheKey);
    if (cached) {
      const duration = Date.now() - startTime;
      serverLogger.debug({
        event: 'cache.hit',
        key: cacheKey,
        duration,
      }, `Cache hit: user subscription ${userId} (${duration}ms)`);
      return cached;
    }

    // Cache miss - fetch from database
    serverLogger.debug({
      event: 'cache.miss',
      key: cacheKey,
    }, `Cache miss: fetching user subscription ${userId} from database`);

    const { data: subscription, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !subscription) {
      // No subscription is normal for free users
      const duration = Date.now() - startTime;
      serverLogger.debug({
        event: 'cachedData.user_subscription.not_found',
        userId,
        duration,
      }, `No subscription found for user ${userId}`);
      return null;
    }

    // Store in cache
    await cache.set(cacheKey, subscription, CacheTTL.userSubscription);

    const duration = Date.now() - startTime;
    serverLogger.debug({
      event: 'cachedData.user_subscription.fetched',
      userId,
      duration,
    }, `User subscription fetched and cached (${duration}ms)`);

    return subscription as UserSubscription;
  } catch (error) {
    const duration = Date.now() - startTime;
    serverLogger.error({
      event: 'cachedData.user_subscription.error',
      userId,
      error,
      duration,
    }, 'Error fetching user subscription');
    return null;
  }
}

/**
 * Get project metadata with caching
 */
export async function getCachedProjectMetadata(
  supabase: SupabaseClient,
  projectId: string,
  userId?: string
): Promise<ProjectMetadata | null> {
  const cacheKey = CacheKeys.projectMetadata(projectId);
  const startTime = Date.now();

  try {
    // Try cache first
    const cached = await cache.get<ProjectMetadata>(cacheKey);
    if (cached) {
      // Verify ownership if userId provided
      if (userId && cached.user_id !== userId) {
        serverLogger.warn({
          event: 'cachedData.project_metadata.access_denied',
          projectId,
          userId,
          ownerId: cached.user_id,
        }, `User ${userId} attempted to access project ${projectId} owned by ${cached.user_id}`);
        return null;
      }

      const duration = Date.now() - startTime;
      serverLogger.debug({
        event: 'cache.hit',
        key: cacheKey,
        duration,
      }, `Cache hit: project metadata ${projectId} (${duration}ms)`);
      return cached;
    }

    // Cache miss - fetch from database
    serverLogger.debug({
      event: 'cache.miss',
      key: cacheKey,
    }, `Cache miss: fetching project metadata ${projectId} from database`);

    let query = supabase
      .from('projects')
      .select('id, user_id, title, created_at, updated_at')
      .eq('id', projectId);

    // Add user filter if provided
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: project, error } = await query.single();

    if (error || !project) {
      const duration = Date.now() - startTime;
      serverLogger.warn({
        event: 'cachedData.project_metadata.not_found',
        projectId,
        userId,
        error: error?.message,
        duration,
      }, `Project metadata not found: ${projectId}`);
      return null;
    }

    // Store in cache
    await cache.set(cacheKey, project, CacheTTL.projectMetadata);

    const duration = Date.now() - startTime;
    serverLogger.debug({
      event: 'cachedData.project_metadata.fetched',
      projectId,
      duration,
    }, `Project metadata fetched and cached (${duration}ms)`);

    return project as ProjectMetadata;
  } catch (error) {
    const duration = Date.now() - startTime;
    serverLogger.error({
      event: 'cachedData.project_metadata.error',
      projectId,
      error,
      duration,
    }, 'Error fetching project metadata');
    return null;
  }
}

/**
 * Get user's projects list with caching
 */
export async function getCachedUserProjects(
  supabase: SupabaseClient,
  userId: string
): Promise<ProjectMetadata[]> {
  const cacheKey = CacheKeys.userProjects(userId);
  const startTime = Date.now();

  try {
    // Try cache first
    const cached = await cache.get<ProjectMetadata[]>(cacheKey);
    if (cached) {
      const duration = Date.now() - startTime;
      serverLogger.debug({
        event: 'cache.hit',
        key: cacheKey,
        duration,
      }, `Cache hit: user projects ${userId} (${duration}ms)`);
      return cached;
    }

    // Cache miss - fetch from database
    serverLogger.debug({
      event: 'cache.miss',
      key: cacheKey,
    }, `Cache miss: fetching user projects ${userId} from database`);

    const { data: projects, error } = await supabase
      .from('projects')
      .select('id, user_id, title, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      const duration = Date.now() - startTime;
      serverLogger.error({
        event: 'cachedData.user_projects.error',
        userId,
        error: error.message,
        duration,
      }, `Error fetching user projects: ${userId}`);
      return [];
    }

    const projectList = (projects || []) as ProjectMetadata[];

    // Store in cache
    await cache.set(cacheKey, projectList, CacheTTL.userProjects);

    const duration = Date.now() - startTime;
    serverLogger.debug({
      event: 'cachedData.user_projects.fetched',
      userId,
      count: projectList.length,
      duration,
    }, `User projects fetched and cached (${projectList.length} projects, ${duration}ms)`);

    return projectList;
  } catch (error) {
    const duration = Date.now() - startTime;
    serverLogger.error({
      event: 'cachedData.user_projects.error',
      userId,
      error,
      duration,
    }, 'Error fetching user projects');
    return [];
  }
}

/**
 * Get user settings with caching
 * Note: This is for future use if you add a user_settings table
 */
export async function getCachedUserSettings(
  supabase: SupabaseClient,
  userId: string
): Promise<Record<string, unknown> | null> {
  const cacheKey = CacheKeys.userSettings(userId);
  const startTime = Date.now();

  try {
    // Try cache first
    const cached = await cache.get<Record<string, unknown>>(cacheKey);
    if (cached) {
      const duration = Date.now() - startTime;
      serverLogger.debug({
        event: 'cache.hit',
        key: cacheKey,
        duration,
      }, `Cache hit: user settings ${userId} (${duration}ms)`);
      return cached;
    }

    // Cache miss - fetch from database
    // This assumes you might add a user_settings table in the future
    serverLogger.debug({
      event: 'cache.miss',
      key: cacheKey,
    }, `Cache miss: fetching user settings ${userId} from database`);

    const { data: settings, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !settings) {
      // No settings is normal - return default
      return null;
    }

    // Store in cache
    await cache.set(cacheKey, settings, CacheTTL.userSettings);

    const duration = Date.now() - startTime;
    serverLogger.debug({
      event: 'cachedData.user_settings.fetched',
      userId,
      duration,
    }, `User settings fetched and cached (${duration}ms)`);

    return settings as Record<string, unknown>;
  } catch (error) {
    const duration = Date.now() - startTime;
    serverLogger.error({
      event: 'cachedData.user_settings.error',
      userId,
      error,
      duration,
    }, 'Error fetching user settings');
    return null;
  }
}

/**
 * Warm cache for a user (preload commonly accessed data)
 */
export async function warmUserCache(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const startTime = Date.now();

  try {
    // Load user profile, subscription, and projects in parallel
    await Promise.all([
      getCachedUserProfile(supabase, userId),
      getCachedUserSubscription(supabase, userId),
      getCachedUserProjects(supabase, userId),
    ]);

    const duration = Date.now() - startTime;
    serverLogger.info({
      event: 'cache.warmed',
      userId,
      duration,
    }, `Cache warmed for user ${userId} (${duration}ms)`);
  } catch (error) {
    serverLogger.error({
      event: 'cache.warm_error',
      userId,
      error,
    }, 'Error warming cache for user');
  }
}
