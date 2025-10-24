import { serverLogger } from '@/lib/serverLogger';
import { errorResponse, successResponse } from '@/lib/api/response';
import { validateUUID, ValidationError } from '@/lib/validation';
import { withAuth } from '@/lib/api/withAuth';
import type { AuthenticatedHandler } from '@/lib/api/withAuth';
import { RATE_LIMITS } from '@/lib/rateLimit';
import { AssetVersionService } from '@/lib/services/assetVersionService';

/**
 * Revert an asset to a previous version.
 *
 * This endpoint:
 * 1. Creates a backup of the current asset state
 * 2. Copies the specified version's file to become the current asset
 * 3. Updates the asset record with the version's metadata
 *
 * @route POST /api/assets/[assetId]/versions/[versionId]/revert
 *
 * @param {string} params.assetId - UUID of the asset to revert
 * @param {string} params.versionId - UUID of the version to revert to
 *
 * @returns {object} Revert result
 * @returns {boolean} returns.success - Always true on success
 * @returns {string} returns.assetId - UUID of the reverted asset
 * @returns {string} returns.newStorageUrl - New storage URL after revert
 * @returns {number} returns.revertedToVersion - Version number that was reverted to
 * @returns {number} returns.backupVersion - Version number of the pre-revert backup
 *
 * @throws {401} Unauthorized - User not authenticated
 * @throws {403} Forbidden - User doesn't own the asset
 * @throws {400} Bad Request - Invalid asset ID or version ID
 * @throws {404} Not Found - Asset or version not found
 * @throws {429} Too Many Requests - Rate limit exceeded
 * @throws {500} Internal Server Error - Storage or database error
 *
 * @ratelimit 10 requests per minute (TIER 2 - Resource Creation)
 * @authentication Required - Session cookie (supabase-auth-token)
 */
const handleRevertToVersion: AuthenticatedHandler<{ assetId: string; versionId: string }> = async (
  _request,
  { user, supabase },
  routeContext
) => {
  const startTime = Date.now();
  const { assetId, versionId } = await routeContext!.params;

  serverLogger.info(
    {
      event: 'assets.versions.revert.started',
      userId: user.id,
      assetId,
      versionId,
    },
    'Asset revert to version request received'
  );

  // Validate IDs
  try {
    validateUUID(assetId, 'assetId');
    validateUUID(versionId, 'versionId');
  } catch (error) {
    if (error instanceof ValidationError) {
      return errorResponse(error.message, 400, error.field);
    }
    throw error;
  }

  // Get asset to verify ownership
  const { data: asset, error: assetError } = await supabase
    .from('assets')
    .select('project_id, current_version')
    .eq('id', assetId)
    .single();

  if (assetError || !asset) {
    serverLogger.warn(
      {
        event: 'assets.versions.revert.asset_not_found',
        userId: user.id,
        assetId,
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
        event: 'assets.versions.revert.unauthorized',
        userId: user.id,
        assetId,
        projectId: asset.project_id,
      },
      'User does not have access to this asset'
    );
    return errorResponse('Unauthorized', 403);
  }

  // Verify version exists and belongs to this asset
  const { data: version, error: versionError } = await supabase
    .from('asset_versions')
    .select('version_number')
    .eq('id', versionId)
    .eq('asset_id', assetId)
    .single();

  if (versionError || !version) {
    serverLogger.warn(
      {
        event: 'assets.versions.revert.version_not_found',
        userId: user.id,
        assetId,
        versionId,
      },
      'Version not found or does not belong to this asset'
    );
    return errorResponse('Version not found', 404);
  }

  // Revert to version
  try {
    const versionService = new AssetVersionService(supabase);
    const result = await versionService.revertToVersion(assetId, versionId, user.id);

    const duration = Date.now() - startTime;
    serverLogger.info(
      {
        event: 'assets.versions.revert.success',
        userId: user.id,
        assetId,
        versionId,
        revertedToVersion: result.versionNumber,
        duration,
      },
      `Asset reverted to version ${result.versionNumber} in ${duration}ms`
    );

    // Log to activity history
    await supabase.from('user_activity_history').insert({
      user_id: user.id,
      project_id: asset.project_id,
      activity_type: 'asset_revert',
      title: 'Asset Reverted',
      description: `Reverted to version ${result.versionNumber}`,
      asset_id: assetId,
      metadata: {
        versionId,
        versionNumber: result.versionNumber,
      },
    });

    // Get current version number (which was incremented by the revert)
    const currentVersion = await versionService.getCurrentVersionNumber(assetId);

    return successResponse({
      success: true,
      assetId,
      newStorageUrl: result.newStorageUrl,
      revertedToVersion: result.versionNumber,
      backupVersion: currentVersion - 1, // The backup created before reverting
    });
  } catch (error) {
    serverLogger.error(
      {
        event: 'assets.versions.revert.error',
        userId: user.id,
        assetId,
        versionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'Failed to revert asset to version'
    );
    return errorResponse(error instanceof Error ? error.message : 'Failed to revert asset', 500);
  }
};

export const POST = withAuth(handleRevertToVersion, {
  route: '/api/assets/[assetId]/versions/[versionId]/revert',
  rateLimit: RATE_LIMITS.tier2_resource_creation,
});
