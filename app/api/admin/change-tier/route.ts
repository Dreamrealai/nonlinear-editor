// =============================================================================
// Admin API: Change User Tier
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase';
import type { UserTier } from '@/lib/types/subscription';
import { serverLogger } from '@/lib/serverLogger';
import { withAdminAuth, logAdminAction, type AdminAuthContext } from '@/lib/api/withAuth';
import {
  validationError,
  forbiddenResponse,
  errorResponse,
  successResponse,
} from '@/lib/api/response';
import { validateUUID, validateEnum, validateAll } from '@/lib/api/validation';
import { invalidateUserProfile } from '@/lib/cacheInvalidation';

async function handleChangeTier(
  request: NextRequest,
  context: AdminAuthContext
): Promise<NextResponse> {
  const { user } = context;
  const startTime = Date.now();

  try {
    serverLogger.info(
      {
        event: 'admin.change_tier.request_started',
        adminId: user.id,
      },
      'Admin tier change request received'
    );

    // Get request body
    const { userId, tier } = (await request.json()) as { userId: string; tier: UserTier };

    if (!userId || !tier) {
      serverLogger.warn(
        {
          event: 'admin.change_tier.invalid_request',
          adminId: user.id,
          hasUserId: !!userId,
          hasTier: !!tier,
        },
        'Missing required fields in tier change request'
      );
      return validationError('userId and tier are required');
    }

    const VALID_TIERS = ['free', 'premium', 'admin'] as const;
    const validation = validateAll([
      validateUUID(userId, 'userId'),
      validateEnum(tier, 'tier', VALID_TIERS, true),
    ]);

    if (!validation.valid) {
      serverLogger.warn(
        {
          event: 'admin.change_tier.invalid_input',
          adminId: user.id,
          targetUserId: userId,
          tier,
        },
        'Invalid input in tier change request'
      );
      const firstError = validation.errors[0];
      return validationError(firstError?.message ?? 'Invalid input', firstError?.field);
    }

    // SECURITY: Prevent admin from modifying their own tier
    if (userId === user.id) {
      serverLogger.warn(
        {
          event: 'admin.change_tier.self_modification_blocked',
          adminId: user.id,
          attemptedTier: tier,
        },
        'Admin attempted to change their own tier'
      );
      return forbiddenResponse('Cannot modify your own tier');
    }

    // Use service role client for admin operations
    const supabaseAdmin = createServiceSupabaseClient();

    // Use UserService for tier management
    const { UserService } = await import('@/lib/services/userService');
    const userService = new UserService(supabaseAdmin);

    // Get target user's current tier
    const targetProfile = await userService.getUserProfile(userId);
    const oldTier = targetProfile?.tier || 'unknown';

    serverLogger.debug(
      {
        event: 'admin.change_tier.updating',
        adminId: user.id,
        targetUserId: userId,
        oldTier,
        newTier: tier,
      },
      `Changing user tier from ${oldTier} to ${tier}`
    );

    // Update user tier using service
    try {
      await userService.updateUserTier(userId, tier);
    } catch (updateError) {
      serverLogger.error(
        {
          event: 'admin.change_tier.update_error',
          adminId: user.id,
          targetUserId: userId,
          tier,
          error: updateError instanceof Error ? updateError.message : 'Unknown error',
        },
        'Failed to update user tier'
      );
      return errorResponse('Failed to update user tier', 500);
    }

    const duration = Date.now() - startTime;
    serverLogger.info(
      {
        event: 'admin.change_tier.success',
        adminId: user.id,
        targetUserId: userId,
        oldTier,
        newTier: tier,
        duration,
      },
      `Admin ${user.id} changed user ${userId} tier from ${oldTier} to ${tier}`
    );

    // Audit log the admin action
    await logAdminAction(supabaseAdmin, 'change_tier', user.id, userId, {
      oldTier,
      newTier: tier,
      adminEmail: user.email,
      duration,
    });

    // Invalidate user profile cache after tier change
    await invalidateUserProfile(userId);

    return successResponse(null, `User tier changed to ${tier}`);
  } catch (error) {
    const duration = Date.now() - startTime;
    serverLogger.error(
      {
        event: 'admin.change_tier.error',
        error,
        duration,
      },
      'Error changing user tier'
    );
    return errorResponse('Failed to change user tier', 500);
  }
}

// Export with admin authentication middleware and rate limiting
// TIER 1: Admin operations - reduced from 30/min to 5/min for security
export const POST = withAdminAuth(handleChangeTier, {
  route: '/api/admin/change-tier',
  rateLimit: { max: 5, windowMs: 60 * 1000 }, // TIER 1: 5 tier changes per minute max
});
