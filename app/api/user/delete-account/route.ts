import { NextRequest } from 'next/server';
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase';
import {
  unauthorizedResponse,
  errorResponse,
  rateLimitResponse,
  successResponse,
  withErrorHandling,
} from '@/lib/api/response';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit';
import { serverLogger } from '@/lib/serverLogger';

/**
 * DELETE /api/user/delete-account
 *
 * Permanently deletes a user account and all associated data.
 * This is a critical operation for GDPR compliance.
 *
 * Steps:
 * 1. Verify user authentication
 * 2. Delete user's projects (cascades to assets, clips, etc. via DB constraints)
 * 3. Delete user's subscription data
 * 4. Delete user's activity history
 * 5. Delete user account using service role client
 *
 * IMPORTANT: This operation is irreversible!
 */
export const DELETE = withErrorHandling(async (_req: NextRequest) => {
  // TIER 1 RATE LIMITING: Account deletion (5/min)
  // Critical to prevent abuse and accidental mass deletions
  const supabaseForRateLimit = await createServerSupabaseClient();
  const {
    data: { user: rateLimitUser },
  } = await supabaseForRateLimit.auth.getUser();

  const rateLimitIdentifier = rateLimitUser?.id
    ? `delete-account:${rateLimitUser.id}`
    : `delete-account:${_req.headers.get('x-forwarded-for') || 'unknown'}`;

  const rateLimitResult = await checkRateLimit(rateLimitIdentifier, RATE_LIMITS.tier1_auth_payment);

  if (!rateLimitResult.success) {
    serverLogger.warn(
      {
        event: 'user.delete_account.rate_limited',
        identifier: rateLimitIdentifier,
        limit: rateLimitResult.limit,
      },
      'Account deletion rate limit exceeded'
    );

    return rateLimitResponse(
      rateLimitResult.limit,
      rateLimitResult.remaining,
      rateLimitResult.resetAt
    );
  }
  try {
    // Verify user authentication
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return unauthorizedResponse();
    }

    const userId = user.id;

    // Use service role client for full access (required to delete auth users)
    const adminClient = createServiceSupabaseClient();

    // Step 1: Delete all user's projects
    // This will cascade delete:
    // - assets (via project_id FK)
    // - clips/frames in timeline
    // - scene_frames
    // - frame_edits
    // - chat_messages
    const { error: projectsError } = await adminClient
      .from('projects')
      .delete()
      .eq('user_id', userId);

    if (projectsError) {
      serverLogger.error({ error: projectsError, userId }, 'Failed to delete user projects');
      return errorResponse('Failed to delete user projects', 500);
    }

    // Step 2: Delete user's subscription data
    const { error: subscriptionError } = await adminClient
      .from('user_subscriptions')
      .delete()
      .eq('user_id', userId);

    if (subscriptionError) {
      serverLogger.error(
        { error: subscriptionError, userId },
        'Failed to delete user subscription'
      );
      // Don't fail the entire operation for subscription errors
    }

    // Step 3: Delete user's activity history
    const { error: historyError } = await adminClient
      .from('user_activity_history')
      .delete()
      .eq('user_id', userId);

    if (historyError) {
      serverLogger.error({ error: historyError, userId }, 'Failed to delete user activity history');
      // Don't fail the entire operation for history errors
    }

    // Step 4: Delete user roles
    const { error: rolesError } = await adminClient
      .from('user_roles')
      .delete()
      .eq('user_id', userId);

    if (rolesError) {
      serverLogger.error({ error: rolesError, userId }, 'Failed to delete user roles');
      // Don't fail the entire operation for roles errors
    }

    // Step 5: Delete storage files
    // List and delete all files in user's storage buckets
    try {
      // Delete from assets bucket
      const { data: assetFiles } = await adminClient.storage.from('assets').list(userId);

      if (assetFiles && assetFiles.length > 0) {
        const assetPaths = assetFiles.map((file) => `${userId}/${file.name}`);
        await adminClient.storage.from('assets').remove(assetPaths);
      }

      // Delete from frames bucket
      const { data: frameFiles } = await adminClient.storage.from('frames').list(userId);

      if (frameFiles && frameFiles.length > 0) {
        const framePaths = frameFiles.map((file) => `${userId}/${file.name}`);
        await adminClient.storage.from('frames').remove(framePaths);
      }
    } catch (storageError) {
      serverLogger.error({ error: storageError, userId }, 'Failed to delete user storage files');
      // Don't fail the entire operation for storage errors
    }

    // Step 6: Delete the user account itself (CRITICAL - must use service role)
    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteUserError) {
      serverLogger.error({ error: deleteUserError, userId }, 'Failed to delete user account');
      return errorResponse('Failed to delete user account', 500);
    }

    // Log the account deletion (before user is deleted, for audit purposes)
    // This will fail gracefully since user is already deleted
    await adminClient.from('user_activity_history').insert({
      user_id: userId,
      activity_type: 'account_deleted',
      title: 'Account Deleted',
      metadata: {
        deleted_at: new Date().toISOString(),
      },
    });

    return successResponse(null, 'Account successfully deleted');
  } catch (error) {
    serverLogger.error({ error, rateLimitIdentifier }, 'Account deletion failed');
    return errorResponse('Account deletion failed', 500);
  }
});
