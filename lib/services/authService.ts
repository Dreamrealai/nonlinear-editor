/**
 * Authentication Service Layer
 *
 * Handles all business logic related to authentication and user operations:
 * - User authentication checks
 * - User profile retrieval with caching
 * - User settings management
 * - User deletion and cleanup
 * - Session management
 *
 * This service layer separates business logic from API route handlers,
 * making code more testable and maintainable.
 *
 * Usage:
 * ```typescript
 * import { AuthService } from '@/lib/services/authService';
 *
 * const service = new AuthService(supabase);
 * const user = await service.getCurrentUser();
 * ```
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { trackError, ErrorCategory, ErrorSeverity } from '../errorTracking';
import { cache, CacheKeys, CacheTTL } from '../cache';
import { invalidateUserCache, invalidateUserProfile } from '../cacheInvalidation';

export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface UserProfile {
  id: string;
  email: string;
  tier?: string;
  subscription_status?: string;
  [key: string]: unknown;
}

export class AuthService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get the currently authenticated user
   *
   * @returns User object or null if not authenticated
   * @throws Error if authentication check fails
   *
   * @example
   * const user = await authService.getCurrentUser();
   * if (!user) {
   *   return unauthorizedResponse();
   * }
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const {
        data: { user },
        error: authError,
      } = await this.supabase.auth.getUser();

      if (authError) {
        trackError(authError, {
          category: ErrorCategory.AUTH,
          severity: ErrorSeverity.MEDIUM,
          context: { operation: 'getCurrentUser' },
        });
        return null;
      }

      return user as User | null;
    } catch (error) {
      trackError(error, {
        category: ErrorCategory.AUTH,
        severity: ErrorSeverity.HIGH,
        context: { operation: 'getCurrentUser' },
      });
      throw error;
    }
  }

  /**
   * Get user profile with caching
   *
   * Retrieves user profile data from cache if available,
   * otherwise fetches from database and caches the result.
   *
   * @param userId - User ID to fetch profile for
   * @returns UserProfile object or null if not found
   * @throws Error if database query fails
   *
   * @example
   * const profile = await authService.getUserProfile(userId);
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      // Try cache first
      const cacheKey = CacheKeys.userProfile(userId);
      const cached = await cache.get<UserProfile>(cacheKey);

      if (cached) {
        return cached;
      }

      // Fetch from database
      const { data: profile, error: dbError } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (dbError) {
        trackError(dbError, {
          category: ErrorCategory.DATABASE,
          severity: ErrorSeverity.MEDIUM,
          context: { userId, operation: 'getUserProfile' },
        });
        throw new Error(`Failed to fetch user profile: ${dbError.message}`);
      }

      if (!profile) {
        return null;
      }

      // Cache the result
      await cache.set(cacheKey, profile as UserProfile, CacheTTL.userProfile);

      return profile as UserProfile;
    } catch (error) {
      trackError(error, {
        category: ErrorCategory.DATABASE,
        severity: ErrorSeverity.MEDIUM,
        context: { userId, operation: 'getUserProfile' },
      });
      throw error;
    }
  }

  /**
   * Verify user is authenticated and return user object
   *
   * Convenience method that throws an error if user is not authenticated.
   *
   * @returns User object
   * @throws Error if user is not authenticated
   *
   * @example
   * const user = await authService.requireAuth();
   */
  async requireAuth(): Promise<User> {
    const user = await this.getCurrentUser();

    if (!user) {
      const error = new Error('User is not authenticated');
      trackError(error, {
        category: ErrorCategory.AUTH,
        severity: ErrorSeverity.MEDIUM,
        context: { operation: 'requireAuth' },
      });
      throw error;
    }

    return user;
  }

  /**
   * Sign out the current user
   *
   * @throws Error if sign out fails
   *
   * @example
   * await authService.signOut();
   */
  async signOut(): Promise<void> {
    try {
      const { error: signOutError } = await this.supabase.auth.signOut();

      if (signOutError) {
        trackError(signOutError, {
          category: ErrorCategory.AUTH,
          severity: ErrorSeverity.MEDIUM,
          context: { operation: 'signOut' },
        });
        throw new Error(`Failed to sign out: ${signOutError.message}`);
      }
    } catch (error) {
      trackError(error, {
        category: ErrorCategory.AUTH,
        severity: ErrorSeverity.MEDIUM,
        context: { operation: 'signOut' },
      });
      throw error;
    }
  }

  /**
   * Delete user account and all associated data
   *
   * Performs cascading deletion of:
   * - User projects
   * - User assets (from storage and database)
   * - User activity history
   * - User cache
   *
   * @param userId - User ID to delete
   * @throws Error if deletion fails
   *
   * @example
   * await authService.deleteUserAccount(userId);
   */
  async deleteUserAccount(userId: string): Promise<void> {
    try {
      // Delete user's projects (cascades to assets via database constraints)
      const { error: projectsError } = await this.supabase
        .from('projects')
        .delete()
        .eq('user_id', userId);

      if (projectsError) {
        trackError(projectsError, {
          category: ErrorCategory.DATABASE,
          severity: ErrorSeverity.HIGH,
          context: { userId, operation: 'deleteUserAccount', step: 'projects' },
        });
        throw new Error(`Failed to delete user projects: ${projectsError.message}`);
      }

      // Delete user's activity history
      const { error: historyError } = await this.supabase
        .from('user_activity_history')
        .delete()
        .eq('user_id', userId);

      if (historyError) {
        trackError(historyError, {
          category: ErrorCategory.DATABASE,
          severity: ErrorSeverity.MEDIUM,
          context: { userId, operation: 'deleteUserAccount', step: 'history' },
        });
        // Continue even if history deletion fails
      }

      // Delete from storage (assets bucket)
      const { data: files, error: listError } = await this.supabase.storage
        .from('assets')
        .list(userId);

      if (!listError && files && files.length > 0) {
        const filePaths = files.map((file) => `${userId}/${file.name}`);
        const { error: storageError } = await this.supabase.storage
          .from('assets')
          .remove(filePaths);

        if (storageError) {
          trackError(storageError, {
            category: ErrorCategory.EXTERNAL_SERVICE,
            severity: ErrorSeverity.MEDIUM,
            context: { userId, operation: 'deleteUserAccount', step: 'storage' },
          });
          // Continue even if storage deletion fails
        }
      }

      // Invalidate all user caches
      await invalidateUserCache(userId);
    } catch (error) {
      trackError(error, {
        category: ErrorCategory.DATABASE,
        severity: ErrorSeverity.HIGH,
        context: { userId, operation: 'deleteUserAccount' },
      });
      throw error;
    }
  }

  /**
   * Update user profile and invalidate cache
   *
   * @param userId - User ID to update
   * @param updates - Profile fields to update
   * @returns Updated user profile
   * @throws Error if update fails
   *
   * @example
   * const profile = await authService.updateUserProfile(userId, { tier: 'pro' });
   */
  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const { data: profile, error: dbError } = await this.supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (dbError) {
        trackError(dbError, {
          category: ErrorCategory.DATABASE,
          severity: ErrorSeverity.MEDIUM,
          context: { userId, operation: 'updateUserProfile' },
        });
        throw new Error(`Failed to update user profile: ${dbError.message}`);
      }

      if (!profile) {
        throw new Error('User profile not found');
      }

      // Invalidate cache
      await invalidateUserProfile(userId);

      return profile as UserProfile;
    } catch (error) {
      trackError(error, {
        category: ErrorCategory.DATABASE,
        severity: ErrorSeverity.MEDIUM,
        context: { userId, operation: 'updateUserProfile' },
      });
      throw error;
    }
  }
}
