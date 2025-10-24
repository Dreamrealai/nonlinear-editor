// =============================================================================
// Admin API: Delete User Account
// =============================================================================

import { NextRequest } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase';
import { serverLogger } from '@/lib/serverLogger';
import { withAdminAuth, logAdminAction, type AdminAuthContext } from '@/lib/api/withAuth';
import { validationError, errorResponse, successResponse } from '@/lib/api/response';
import { validateUUID, ValidationError } from '@/lib/validation';
import { RATE_LIMITS } from '@/lib/rateLimit';

async function handleDeleteUser(request: NextRequest, context: AdminAuthContext) {
  const { user } = context;
  try {
    // Get request body
    const { userId } = (await request.json()) as { userId: string };

    if (!userId) {
      serverLogger.warn(
        {
          event: 'admin.delete_user.invalid_request',
          adminId: user.id,
        },
        'Missing userId in delete request'
      );
      return validationError('userId is required', 'userId');
    }

    // Validate userId format
    try {
      validateUUID(userId, 'userId');
    } catch (error) {
      if (error instanceof ValidationError) {
        return validationError(error.message, error.field);
      }
      throw error;
    }

    // SECURITY: Prevent admin from deleting themselves
    if (userId === user.id) {
      serverLogger.warn(
        {
          event: 'admin.delete_user.self_deletion_blocked',
          adminId: user.id,
        },
        'Admin attempted to delete their own account'
      );
      return validationError('Cannot delete your own account', 'userId');
    }

    // Use service role client for admin operations
    const supabaseAdmin = createServiceSupabaseClient();

    // Get user info before deletion for audit log
    const { data: targetUser } = await supabaseAdmin.auth.admin.getUserById(userId);

    serverLogger.info(
      {
        event: 'admin.delete_user.deleting',
        adminId: user.id,
        targetUserId: userId,
        targetEmail: targetUser?.user?.email,
      },
      'Admin deleting user account'
    );

    // Delete user from auth (this will cascade to user_profiles and all related data)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      serverLogger.error(
        {
          event: 'admin.delete_user.error',
          adminId: user.id,
          targetUserId: userId,
          error: deleteError.message,
        },
        'Failed to delete user account'
      );
      return errorResponse('Failed to delete user account', 500);
    }

    serverLogger.info(
      {
        event: 'admin.delete_user.success',
        adminId: user.id,
        targetUserId: userId,
      },
      'User account deleted successfully'
    );

    // Audit log the admin action
    await logAdminAction(supabaseAdmin, 'delete_user', user.id, userId, {
      adminEmail: user.email,
      targetEmail: targetUser?.user?.email,
      timestamp: new Date().toISOString(),
    });

    return successResponse(null, 'User account deleted successfully');
  } catch (error) {
    serverLogger.error(
      {
        event: 'admin.delete_user.exception',
        adminId: user.id,
        error,
      },
      'Exception deleting user account'
    );
    return errorResponse('Failed to delete user account', 500);
  }
}

// Export with admin authentication middleware and rate limiting
export const POST = withAdminAuth(handleDeleteUser, {
  route: '/api/admin/delete-user',
  rateLimit: RATE_LIMITS.tier1_auth_payment, // TIER 1: Admin operations (5 req/min)
});
