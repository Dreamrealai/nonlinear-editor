/**
 * DELETE /api/user/delete-account - User Account Deletion
 *
 * CRITICAL: This route handles permanent account deletion and GDPR compliance.
 *
 * Features:
 * - Authentication via withAuth middleware
 * - Ownership verification (user can only delete their own account)
 * - Cascade deletion of all user data:
 *   - Projects (triggers cascade to assets, scenes, timelines, scene_frames, frame_edits, chat_messages)
 *   - User subscriptions
 *   - User activity history
 *   - User roles
 *   - Storage files (assets bucket, frames bucket)
 * - Proper error handling with graceful fallbacks
 * - Audit logging before deletion
 * - Service role client for privileged operations
 *
 * Security:
 * - Tier 1 rate limiting (5 requests per minute)
 * - User must be authenticated
 * - User can only delete their own account
 * - Uses service role for bypassing RLS during cleanup
 *
 * GDPR Compliance:
 * - Deletes all personal data
 * - Logs deletion event before removing user
 * - Removes storage files
 * - Irreversible operation
 */

import type { NextRequest } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/api/withAuth';
import { errorResponse, successResponse } from '@/lib/api/response';
import { serverLogger } from '@/lib/serverLogger';
import { createServiceSupabaseClient } from '@/lib/supabase';
import { RATE_LIMITS } from '@/lib/rateLimit';
import { auditLog, AuditAction } from '@/lib/auditLog';

/**
 * Deletes files from a storage bucket for a user
 */
async function deleteStorageFiles(
  adminClient: ReturnType<typeof createServiceSupabaseClient>,
  bucketName: string,
  userId: string
): Promise<void> {
  try {
    // Check if storage is available
    if (!adminClient.storage) {
      serverLogger.warn(
        {
          event: 'user.delete_account.storage_unavailable',
          userId,
          bucket: bucketName,
        },
        'Storage client not available'
      );
      return;
    }

    const { data: files, error: listError } = await adminClient.storage
      .from(bucketName)
      .list(userId);

    if (listError) {
      serverLogger.warn(
        {
          event: 'user.delete_account.storage_list_error',
          userId,
          bucket: bucketName,
          error: listError.message,
        },
        `Failed to list files in ${bucketName} bucket`
      );
      return;
    }

    if (files && files.length > 0) {
      const filePaths = files.map((file): string => `${userId}/${file.name}`);

      const { error: removeError } = await adminClient.storage.from(bucketName).remove(filePaths);

      if (removeError) {
        serverLogger.warn(
          {
            event: 'user.delete_account.storage_remove_error',
            userId,
            bucket: bucketName,
            error: removeError.message,
          },
          `Failed to remove files from ${bucketName} bucket`
        );
      } else {
        serverLogger.info(
          {
            event: 'user.delete_account.storage_removed',
            userId,
            bucket: bucketName,
            fileCount: filePaths.length,
          },
          `Removed ${filePaths.length} files from ${bucketName} bucket`
        );
      }
    }
  } catch (error) {
    serverLogger.error(
      {
        event: 'user.delete_account.storage_cleanup_error',
        userId,
        bucket: bucketName,
        error,
      },
      `Error cleaning up ${bucketName} storage`
    );
    // Continue with deletion even if storage cleanup fails
  }
}

/**
 * Main handler for account deletion
 */
async function handleDeleteAccount(request: NextRequest, context: AuthContext): Promise<Response> {
  const { user } = context;
  const userId = user.id;

  serverLogger.info(
    {
      event: 'user.delete_account.started',
      userId,
      email: user.email,
    },
    'Starting account deletion process'
  );

  try {
    // Create service role client for privileged operations (bypasses RLS)
    const adminClient = createServiceSupabaseClient();

    // Step 1: Audit log the deletion event BEFORE deleting data
    await auditLog({
      userId,
      action: AuditAction.USER_ACCOUNT_DELETE,
      resourceType: 'user',
      resourceId: userId,
      metadata: {
        email: user.email,
        deletedAt: new Date().toISOString(),
      },
      request,
      statusCode: 200,
    });

    // Step 2: Delete storage files (assets and frames buckets)
    serverLogger.info(
      {
        event: 'user.delete_account.storage_cleanup_started',
        userId,
      },
      'Starting storage cleanup'
    );

    await Promise.all([
      deleteStorageFiles(adminClient, 'assets', userId),
      deleteStorageFiles(adminClient, 'frames', userId),
    ]);

    // Step 3: Delete projects (cascade deletion will handle related data)
    // This will cascade to: assets, scenes, timelines, scene_frames, frame_edits, chat_messages
    serverLogger.info(
      {
        event: 'user.delete_account.deleting_projects',
        userId,
      },
      'Deleting user projects'
    );

    const { error: projectsError } = await adminClient
      .from('projects')
      .delete()
      .eq('user_id', userId);

    if (projectsError) {
      serverLogger.error(
        {
          event: 'user.delete_account.projects_error',
          userId,
          error: projectsError.message,
        },
        'Failed to delete user projects'
      );
      return errorResponse('Failed to delete user projects', 500);
    }

    // Step 4: Delete user subscriptions (non-critical, continue if fails)
    serverLogger.info(
      {
        event: 'user.delete_account.deleting_subscriptions',
        userId,
      },
      'Deleting user subscriptions'
    );

    const { error: subscriptionsError } = await adminClient
      .from('user_subscriptions')
      .delete()
      .eq('user_id', userId);

    if (subscriptionsError) {
      serverLogger.warn(
        {
          event: 'user.delete_account.subscriptions_error',
          userId,
          error: subscriptionsError.message,
        },
        'Failed to delete user subscriptions (continuing)'
      );
    }

    // Step 5: Delete user activity history (non-critical, continue if fails)
    serverLogger.info(
      {
        event: 'user.delete_account.deleting_activity_history',
        userId,
      },
      'Deleting user activity history'
    );

    const { error: historyError } = await adminClient
      .from('user_activity_history')
      .delete()
      .eq('user_id', userId);

    if (historyError) {
      serverLogger.warn(
        {
          event: 'user.delete_account.history_error',
          userId,
          error: historyError.message,
        },
        'Failed to delete user activity history (continuing)'
      );
    }

    // Step 6: Delete user roles (non-critical, continue if fails)
    serverLogger.info(
      {
        event: 'user.delete_account.deleting_roles',
        userId,
      },
      'Deleting user roles'
    );

    const { error: rolesError } = await adminClient
      .from('user_roles')
      .delete()
      .eq('user_id', userId);

    if (rolesError) {
      serverLogger.warn(
        {
          event: 'user.delete_account.roles_error',
          userId,
          error: rolesError.message,
        },
        'Failed to delete user roles (continuing)'
      );
    }

    // Step 7: Delete user account from auth (this is the final step)
    serverLogger.info(
      {
        event: 'user.delete_account.deleting_auth_user',
        userId,
      },
      'Deleting user from authentication system'
    );

    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteUserError) {
      serverLogger.error(
        {
          event: 'user.delete_account.auth_deletion_error',
          userId,
          error: deleteUserError.message,
        },
        'Failed to delete user account from auth'
      );
      return errorResponse('Failed to delete user account', 500);
    }

    serverLogger.info(
      {
        event: 'user.delete_account.success',
        userId,
        email: user.email,
      },
      'Account successfully deleted'
    );

    return successResponse(null, 'Account successfully deleted', 200);
  } catch (error) {
    serverLogger.error(
      {
        event: 'user.delete_account.exception',
        userId,
        error,
      },
      'Exception during account deletion'
    );
    return errorResponse('Account deletion failed', 500);
  }
}

// Export with authentication middleware and tier 1 rate limiting
// TIER 1: Critical auth/payment operations - 5 requests per minute
export const DELETE = withAuth(handleDeleteAccount, {
  route: '/api/user/delete-account',
  rateLimit: RATE_LIMITS.tier1_auth_payment,
});
