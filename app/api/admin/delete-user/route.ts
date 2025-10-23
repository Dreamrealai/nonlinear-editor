// =============================================================================
// Admin API: Delete User Account
// =============================================================================

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { serverLogger } from '@/lib/serverLogger';
import { withAdminAuth, logAdminAction, type AdminAuthContext } from '@/lib/api/withAuth';
import { validationError, errorResponse, successResponse } from '@/lib/api/response';
import { validateUUID, validateAll } from '@/lib/api/validation';

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
    const validation = validateAll([validateUUID(userId, 'userId')]);
    if (!validation.valid) {
      const firstError = validation.errors[0];
      return validationError(firstError?.message ?? 'Invalid input', firstError?.field);
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
    const supabaseAdmin = createClient(
      process.env['NEXT_PUBLIC_SUPABASE_URL']!,
      process.env['SUPABASE_SERVICE_ROLE_KEY']!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

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
// TIER 1: Admin operations - reduced from 10/min to 5/min for security
export const POST = withAdminAuth(handleDeleteUser, {
  route: '/api/admin/delete-user',
  rateLimit: { max: 5, windowMs: 60 * 1000 }, // TIER 1: 5 deletions per minute max
});
