// =============================================================================
// Admin API: Change User Tier
// =============================================================================

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { UserTier } from '@/lib/types/subscription';
import { serverLogger } from '@/lib/serverLogger';
import { withAdminAuth, logAdminAction, type AdminAuthContext } from '@/lib/api/withAuth';
import { validationError, forbiddenResponse, errorResponse, successResponse } from '@/lib/api/response';
import { validateUUID, validateEnum, validateAll } from '@/lib/api/validation';

async function handleChangeTier(
  request: NextRequest,
  context: AdminAuthContext
) {
  const { user } = context;
  const startTime = Date.now();

  try {
    serverLogger.info({
      event: 'admin.change_tier.request_started',
      adminId: user.id,
    }, 'Admin tier change request received');

    // Get request body
    const { userId, tier } = await request.json() as { userId: string; tier: UserTier };

    if (!userId || !tier) {
      serverLogger.warn({
        event: 'admin.change_tier.invalid_request',
        adminId: user.id,
        hasUserId: !!userId,
        hasTier: !!tier,
      }, 'Missing required fields in tier change request');
      return validationError('userId and tier are required');
    }

    const VALID_TIERS = ['free', 'premium', 'admin'] as const;
    const validation = validateAll([
      validateUUID(userId, 'userId'),
      validateEnum(tier, 'tier', VALID_TIERS, true),
    ]);

    if (!validation.valid) {
      serverLogger.warn({
        event: 'admin.change_tier.invalid_input',
        adminId: user.id,
        targetUserId: userId,
        tier,
      }, 'Invalid input in tier change request');
      return validationError(validation.errors[0].message, validation.errors[0].field);
    }

    // SECURITY: Prevent admin from modifying their own tier
    if (userId === user.id) {
      serverLogger.warn({
        event: 'admin.change_tier.self_modification_blocked',
        adminId: user.id,
        attemptedTier: tier,
      }, 'Admin attempted to change their own tier');
      return forbiddenResponse('Cannot modify your own tier');
    }

    // Use service role client for admin operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get target user's current tier
    const { data: targetProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('tier')
      .eq('id', userId)
      .single();

    const oldTier = targetProfile?.tier || 'unknown';

    serverLogger.debug({
      event: 'admin.change_tier.updating',
      adminId: user.id,
      targetUserId: userId,
      oldTier,
      newTier: tier,
    }, `Changing user tier from ${oldTier} to ${tier}`);

    // Update user tier
    const { error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .update({ tier })
      .eq('id', userId);

    if (updateError) {
      serverLogger.error({
        event: 'admin.change_tier.update_error',
        adminId: user.id,
        targetUserId: userId,
        tier,
        error: updateError.message,
        code: updateError.code,
      }, 'Failed to update user tier');
      return errorResponse('Failed to update user tier', 500);
    }

    const duration = Date.now() - startTime;
    serverLogger.info({
      event: 'admin.change_tier.success',
      adminId: user.id,
      targetUserId: userId,
      oldTier,
      newTier: tier,
      duration,
    }, `Admin ${user.id} changed user ${userId} tier from ${oldTier} to ${tier}`);

    // Audit log the admin action
    await logAdminAction(
      supabaseAdmin,
      'change_tier',
      user.id,
      userId,
      {
        oldTier,
        newTier: tier,
        adminEmail: user.email,
        duration,
      }
    );

    return successResponse(null, `User tier changed to ${tier}`);
  } catch (error) {
    const duration = Date.now() - startTime;
    serverLogger.error({
      event: 'admin.change_tier.error',
      error,
      duration,
    }, 'Error changing user tier');
    return errorResponse('Failed to change user tier', 500);
  }
}

// Export with admin authentication middleware and rate limiting
// TIER 1: Admin operations - reduced from 30/min to 5/min for security
export const POST = withAdminAuth(handleChangeTier, {
  route: '/api/admin/change-tier',
  rateLimit: { max: 5, windowMs: 60 * 1000 }, // TIER 1: 5 tier changes per minute max
});
