import { withAuth } from '@/lib/api/withAuth';
import { errorResponse, successResponse } from '@/lib/api/response';
import { validateUUID, ValidationError } from '@/lib/validation';
import { serverLogger } from '@/lib/serverLogger';
import { RATE_LIMITS } from '@/lib/rateLimit';
import type { AuthenticatedHandler } from '@/lib/api/withAuth';
import type { Timeline } from '@/types/timeline';

/**
 * DELETE /api/assets/[assetId]
 *
 * Deletes an asset from the database and storage.
 * IMPORTANT: Checks if the asset is referenced in any timeline before deletion.
 * If the asset is in use, returns a 400 error with timeline information.
 *
 * @route DELETE /api/assets/[assetId]
 * @param {string} params.assetId - UUID of the asset to delete
 *
 * @returns {object} Success response
 * @returns {boolean} returns.success - Always true on success
 * @returns {string} returns.message - Confirmation message
 *
 * @throws {400} Bad Request - Invalid asset ID or asset is in use
 * @throws {401} Unauthorized - User not authenticated
 * @throws {403} Forbidden - User doesn't own the asset
 * @throws {404} Not Found - Asset not found
 * @throws {429} Too Many Requests - Rate limit exceeded
 * @throws {500} Internal Server Error - Database or storage error
 *
 * @ratelimit 10 requests per minute (TIER 2 - Resource Deletion)
 * @authentication Required - Session cookie (supabase-auth-token)
 */
const handleAssetDelete: AuthenticatedHandler<{ assetId: string }> = async (
  _request,
  { user, supabase },
  routeContext
) => {
  const startTime = Date.now();
  const { assetId } = await routeContext!.params;

  serverLogger.info(
    {
      event: 'assets.delete.request_started',
      userId: user.id,
      assetId,
    },
    'Asset deletion request received'
  );

  // Validate asset ID
  try {
    validateUUID(assetId, 'assetId');
  } catch (error) {
    if (error instanceof ValidationError) {
      return errorResponse(error.message, 400, error.field);
    }
    throw error;
  }

  // Fetch the asset to verify ownership and get metadata
  const { data: asset, error: assetError } = await supabase
    .from('assets')
    .select('id, user_id, project_id, storage_url, metadata, type')
    .eq('id', assetId)
    .single();

  if (assetError || !asset) {
    serverLogger.warn(
      {
        event: 'assets.delete.asset_not_found',
        userId: user.id,
        assetId,
        error: assetError?.message,
      },
      'Asset not found'
    );
    return errorResponse('Asset not found', 404);
  }

  // Verify ownership through project
  const { verifyProjectOwnership } = await import('@/lib/api/project-verification');
  const projectVerification = await verifyProjectOwnership(
    supabase,
    asset.project_id,
    user.id,
    'id'
  );

  if (!projectVerification.hasAccess) {
    serverLogger.warn(
      {
        event: 'assets.delete.unauthorized',
        userId: user.id,
        assetId,
        projectId: asset.project_id,
      },
      'User does not have access to delete this asset'
    );
    return errorResponse('Unauthorized', 403);
  }

  // CRITICAL: Check if asset is used in any timelines
  serverLogger.debug(
    {
      event: 'assets.delete.checking_timeline_usage',
      userId: user.id,
      assetId,
      projectId: asset.project_id,
    },
    'Checking if asset is used in timelines'
  );

  const { data: timelines, error: timelineError } = await supabase
    .from('timelines')
    .select('id, project_id, timeline_data')
    .eq('project_id', asset.project_id);

  if (timelineError) {
    serverLogger.error(
      {
        event: 'assets.delete.timeline_check_failed',
        userId: user.id,
        assetId,
        error: timelineError.message,
      },
      'Failed to check timeline usage'
    );
    return errorResponse('Failed to check asset usage', 500);
  }

  // Check if any timeline contains this asset
  const timelinesUsingAsset: Array<{ id: string; project_id: string }> = [];
  if (timelines) {
    for (const timeline of timelines) {
      const timelineData = timeline.timeline_data as Timeline | null;
      if (timelineData?.clips) {
        const hasAsset = timelineData.clips.some((clip) => clip.assetId === assetId);
        if (hasAsset) {
          timelinesUsingAsset.push({
            id: timeline.id,
            project_id: timeline.project_id,
          });
        }
      }
    }
  }

  // If asset is in use, prevent deletion
  if (timelinesUsingAsset.length > 0) {
    serverLogger.warn(
      {
        event: 'assets.delete.asset_in_use',
        userId: user.id,
        assetId,
        timelinesCount: timelinesUsingAsset.length,
        timelineIds: timelinesUsingAsset.map((t) => t.id),
      },
      'Cannot delete asset: currently used in timeline'
    );

    return errorResponse('Cannot delete asset: currently used in timeline', 400, 'assetId', {
      assetId,
      usedInTimelines: timelinesUsingAsset.map((t) => t.id),
      message: 'Remove this asset from the timeline before deleting it',
      userMessage:
        'This asset is used in your timeline. Please remove it from the timeline before deleting.',
    });
  }

  // Asset is safe to delete - proceed with deletion
  serverLogger.info(
    {
      event: 'assets.delete.proceeding',
      userId: user.id,
      assetId,
    },
    'Asset not in use, proceeding with deletion'
  );

  // Extract storage path from URL (format: supabase://assets/path/to/file)
  const storageUrl = asset.storage_url;
  const storagePath = storageUrl.replace('supabase://assets/', '');

  // Delete from storage
  const { error: storageError } = await supabase.storage.from('assets').remove([storagePath]);

  if (storageError) {
    serverLogger.error(
      {
        event: 'assets.delete.storage_error',
        userId: user.id,
        assetId,
        storagePath,
        error: storageError.message,
      },
      'Failed to delete asset from storage (continuing with DB deletion)'
    );
    // Continue to delete database record even if storage deletion fails
  }

  // Delete from database
  const { error: dbError } = await supabase.from('assets').delete().eq('id', assetId);

  if (dbError) {
    serverLogger.error(
      {
        event: 'assets.delete.db_error',
        userId: user.id,
        assetId,
        error: dbError.message,
      },
      'Failed to delete asset from database'
    );
    return errorResponse(dbError.message, 500);
  }

  const duration = Date.now() - startTime;
  serverLogger.info(
    {
      event: 'assets.delete.success',
      userId: user.id,
      assetId,
      projectId: asset.project_id,
      assetType: asset.type,
      duration,
    },
    `Asset deleted successfully in ${duration}ms`
  );

  // Log to activity history
  await supabase.from('user_activity_history').insert({
    user_id: user.id,
    project_id: asset.project_id,
    activity_type: 'asset_delete',
    title: asset.metadata?.filename || 'Asset',
    description: `Deleted ${asset.type} asset`,
    asset_id: assetId,
    metadata: {
      assetType: asset.type,
      filename: asset.metadata?.filename,
    },
  });

  return successResponse(
    {
      success: true,
      assetId,
    },
    'Asset deleted successfully'
  );
};

export const DELETE = withAuth(handleAssetDelete, {
  route: '/api/assets/[assetId]',
  rateLimit: RATE_LIMITS.tier2_resource_creation, // 10 requests/minute for deletion operations
});
