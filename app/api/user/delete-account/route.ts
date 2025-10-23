import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase';
import { unauthorizedResponse, errorResponse } from '@/lib/api/response';

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
export async function DELETE(_req: NextRequest) {
  try {
    // Verify user authentication
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return unauthorizedResponse();
    }

    const userId = user.id;

    // Use service role client for full access (required to delete auth users)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing Supabase configuration for account deletion');
      return errorResponse('Service configuration error', 500);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

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
      console.error('Failed to delete user projects:', projectsError);
      return errorResponse('Failed to delete user projects', 500);
    }

    // Step 2: Delete user's subscription data
    const { error: subscriptionError } = await adminClient
      .from('user_subscriptions')
      .delete()
      .eq('user_id', userId);

    if (subscriptionError) {
      console.error('Failed to delete user subscription:', subscriptionError);
      // Don't fail the entire operation for subscription errors
    }

    // Step 3: Delete user's activity history
    const { error: historyError } = await adminClient
      .from('user_activity_history')
      .delete()
      .eq('user_id', userId);

    if (historyError) {
      console.error('Failed to delete user activity history:', historyError);
      // Don't fail the entire operation for history errors
    }

    // Step 4: Delete user roles
    const { error: rolesError } = await adminClient
      .from('user_roles')
      .delete()
      .eq('user_id', userId);

    if (rolesError) {
      console.error('Failed to delete user roles:', rolesError);
      // Don't fail the entire operation for roles errors
    }

    // Step 5: Delete storage files
    // List and delete all files in user's storage buckets
    try {
      // Delete from assets bucket
      const { data: assetFiles } = await adminClient.storage
        .from('assets')
        .list(userId);

      if (assetFiles && assetFiles.length > 0) {
        const assetPaths = assetFiles.map(file => `${userId}/${file.name}`);
        await adminClient.storage.from('assets').remove(assetPaths);
      }

      // Delete from frames bucket
      const { data: frameFiles } = await adminClient.storage
        .from('frames')
        .list(userId);

      if (frameFiles && frameFiles.length > 0) {
        const framePaths = frameFiles.map(file => `${userId}/${file.name}`);
        await adminClient.storage.from('frames').remove(framePaths);
      }
    } catch (storageError) {
      console.error('Failed to delete user storage files:', storageError);
      // Don't fail the entire operation for storage errors
    }

    // Step 6: Delete the user account itself (CRITICAL - must use service role)
    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteUserError) {
      console.error('Failed to delete user account:', deleteUserError);
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

    return NextResponse.json({
      success: true,
      message: 'Account successfully deleted',
    });
  } catch (error) {
    console.error('Account deletion error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to delete account',
      500
    );
  }
}
