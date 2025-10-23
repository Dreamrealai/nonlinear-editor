/**
 * User Service Layer
 *
 * Handles all business logic related to users and user profiles:
 * - Fetching user profiles
 * - Updating user profiles
 * - Admin operations (tier changes, user management)
 *
 * This service layer separates business logic from API route handlers,
 * making code more testable and maintainable.
 *
 * Usage:
 * ```typescript
 * import { UserService } from '@/lib/services/userService';
 *
 * const service = new UserService(supabase);
 * const profile = await service.getUserProfile(userId);
 * ```
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { trackError, ErrorCategory, ErrorSeverity } from '../errorTracking';
import { validateUUID } from '../validation';
import { isPostgresNotFound } from '../errors/errorCodes';
import type { UserTier } from '../types/subscription';

export interface UserProfile {
  id: string;
  email: string;
  tier: UserTier;
  video_minutes_used: number;
  video_minutes_limit: number;
  ai_requests_used: number;
  ai_requests_limit: number;
  created_at: string;
  updated_at: string;
}

export class UserService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get a user profile by ID
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      validateUUID(userId, 'User ID');

      const { data: profile, error: dbError } = await this.supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (dbError) {
        if (isPostgresNotFound(dbError)) {
          return null;
        }
        trackError(dbError, {
          category: ErrorCategory.DATABASE,
          severity: ErrorSeverity.MEDIUM,
          context: { userId },
        });
        throw new Error(`Failed to fetch user profile: ${dbError.message}`);
      }

      return profile as UserProfile;
    } catch (error) {
      trackError(error, {
        category: ErrorCategory.DATABASE,
        severity: ErrorSeverity.MEDIUM,
        context: { userId },
      });
      throw error;
    }
  }

  /**
   * Get all user profiles (admin only)
   */
  async getAllUserProfiles(): Promise<UserProfile[]> {
    try {
      const { data: profiles, error: dbError } = await this.supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (dbError) {
        trackError(dbError, {
          category: ErrorCategory.DATABASE,
          severity: ErrorSeverity.MEDIUM,
          context: {},
        });
        throw new Error(`Failed to fetch user profiles: ${dbError.message}`);
      }

      return (profiles || []) as UserProfile[];
    } catch (error) {
      trackError(error, {
        category: ErrorCategory.DATABASE,
        severity: ErrorSeverity.MEDIUM,
        context: {},
      });
      throw error;
    }
  }

  /**
   * Update user tier (admin only)
   */
  async updateUserTier(userId: string, tier: UserTier): Promise<UserProfile> {
    try {
      validateUUID(userId, 'User ID');

      const { data: profile, error: dbError } = await this.supabase
        .from('user_profiles')
        .update({ tier })
        .eq('id', userId)
        .select()
        .single();

      if (dbError) {
        trackError(dbError, {
          category: ErrorCategory.DATABASE,
          severity: ErrorSeverity.HIGH,
          context: { userId, tier },
        });
        throw new Error(`Failed to update user tier: ${dbError.message}`);
      }

      if (!profile) {
        throw new Error('User profile not found');
      }

      return profile as UserProfile;
    } catch (error) {
      trackError(error, {
        category: ErrorCategory.DATABASE,
        severity: ErrorSeverity.HIGH,
        context: { userId, tier },
      });
      throw error;
    }
  }

  /**
   * Update user usage limits
   */
  async updateUsageLimits(
    userId: string,
    limits: {
      video_minutes_limit?: number;
      ai_requests_limit?: number;
    }
  ): Promise<UserProfile> {
    try {
      validateUUID(userId, 'User ID');

      const { data: profile, error: dbError } = await this.supabase
        .from('user_profiles')
        .update(limits)
        .eq('id', userId)
        .select()
        .single();

      if (dbError) {
        trackError(dbError, {
          category: ErrorCategory.DATABASE,
          severity: ErrorSeverity.MEDIUM,
          context: { userId, limits },
        });
        throw new Error(`Failed to update usage limits: ${dbError.message}`);
      }

      if (!profile) {
        throw new Error('User profile not found');
      }

      return profile as UserProfile;
    } catch (error) {
      trackError(error, {
        category: ErrorCategory.DATABASE,
        severity: ErrorSeverity.MEDIUM,
        context: { userId, limits },
      });
      throw error;
    }
  }

  /**
   * Increment usage counters
   */
  async incrementUsage(
    userId: string,
    usage: {
      video_minutes?: number;
      ai_requests?: number;
    }
  ): Promise<UserProfile> {
    try {
      validateUUID(userId, 'User ID');

      // First, get current values
      const currentProfile = await this.getUserProfile(userId);
      if (!currentProfile) {
        throw new Error('User profile not found');
      }

      const updates: Partial<UserProfile> = {};

      if (usage.video_minutes !== undefined) {
        updates.video_minutes_used = currentProfile.video_minutes_used + usage.video_minutes;
      }

      if (usage.ai_requests !== undefined) {
        updates.ai_requests_used = currentProfile.ai_requests_used + usage.ai_requests;
      }

      const { data: profile, error: dbError } = await this.supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (dbError) {
        trackError(dbError, {
          category: ErrorCategory.DATABASE,
          severity: ErrorSeverity.MEDIUM,
          context: { userId, usage },
        });
        throw new Error(`Failed to increment usage: ${dbError.message}`);
      }

      if (!profile) {
        throw new Error('User profile not found');
      }

      return profile as UserProfile;
    } catch (error) {
      trackError(error, {
        category: ErrorCategory.DATABASE,
        severity: ErrorSeverity.MEDIUM,
        context: { userId, usage },
      });
      throw error;
    }
  }

  /**
   * Check if user has admin privileges
   */
  async isAdmin(userId: string): Promise<boolean> {
    try {
      const profile = await this.getUserProfile(userId);
      return profile?.tier === 'admin';
    } catch (error) {
      trackError(error, {
        category: ErrorCategory.DATABASE,
        severity: ErrorSeverity.LOW,
        context: { userId },
      });
      return false;
    }
  }
}
