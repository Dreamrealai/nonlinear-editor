import { serverLogger } from '@/lib/serverLogger';
import { errorResponse, successResponse } from '@/lib/api/response';
import { validateUUID, ValidationError } from '@/lib/validation';
import { withAuth } from '@/lib/api/withAuth';
import type { AuthenticatedHandler } from '@/lib/api/withAuth';
import { RATE_LIMITS } from '@/lib/rateLimit';
import { AssetVersionService } from '@/lib/services/assetVersionService';

/**
 * Get version history for an asset.
 *
 * Returns all previous versions of an asset, ordered by version number descending.
 * Each version includes metadata and storage information.
 *
 * @route GET /api/assets/[assetId]/versions
 *
 * @param {string} params.assetId - UUID of the asset
 *
 * @returns {object} Version history
 * @returns {array} returns.versions - Array of version objects
 * @returns {number} returns.currentVersion - Current version number of the asset
 * @returns {number} returns.totalVersions - Total number of versions
 *
 * @throws {401} Unauthorized - User not authenticated
 * @throws {403} Forbidden - User doesn't own the asset
 * @throws {400} Bad Request - Invalid asset ID
 * @throws {404} Not Found - Asset not found
 * @throws {500} Internal Server Error - Database error
 *
 * @ratelimit 60 requests per minute (TIER 1 - Data Reads)
 * @authentication Required - Session cookie (supabase-auth-token)
 */
const handleGetVersionHistory: AuthenticatedHandler<{ assetId: string }> = async (request, { params, user, supabase }) => {
  const { assetId } = await params;

  serverLogger.debug(
    {
      event: 'assets.versions.get_history.started',
      userId: user.id,
      assetId,
    },
    'Getting asset version history'
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

  // Get asset to verify ownership
  const { data: asset, error: assetError } = await supabase
    .from('assets')
    .select('project_id, current_version')
    .eq('id', assetId)
    .single();

  if (assetError || !asset) {
    serverLogger.warn(
      {
        event: 'assets.versions.get_history.asset_not_found',
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
        event: 'assets.versions.get_history.unauthorized',
        userId: user.id,
        assetId,
        projectId: asset.project_id,
      },
      'User does not have access to this asset'
    );
    return errorResponse('Unauthorized', 403);
  }

  // Get version history
  try {
    const versionService = new AssetVersionService(supabase);
    const versions = await versionService.getVersionHistory(assetId);

    serverLogger.info(
      {
        event: 'assets.versions.get_history.success',
        userId: user.id,
        assetId,
        versionCount: versions.length,
      },
      'Version history retrieved successfully'
    );

    return successResponse({
      versions,
      currentVersion: asset.current_version || 1,
      totalVersions: versions.length,
    });
  } catch (error) {
    serverLogger.error(
      {
        event: 'assets.versions.get_history.error',
        userId: user.id,
        assetId,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'Failed to get version history'
    );
    return errorResponse('Failed to get version history', 500);
  }
};

export const GET = withAuth(handleGetVersionHistory, {
  route: '/api/assets/[assetId]/versions',
  rateLimit: RATE_LIMITS.tier3_status_read,
});
