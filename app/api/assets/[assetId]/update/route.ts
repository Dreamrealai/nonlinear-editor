import { ensureHttpsProtocol } from '@/lib/supabase';
import crypto from 'crypto';
import sanitize from 'sanitize-filename';
import { serverLogger } from '@/lib/serverLogger';
import { badRequestResponse, errorResponse, successResponse } from '@/lib/api/response';
import { validateUUID, ValidationError } from '@/lib/validation';
import { withAuth } from '@/lib/api/withAuth';
import type { AuthenticatedHandler } from '@/lib/api/withAuth';
import { RATE_LIMITS } from '@/lib/rateLimit';
import { AssetVersionService } from '@/lib/services/assetVersionService';

/**
 * Update an existing asset with a new file and create a version history entry.
 *
 * This endpoint:
 * 1. Creates a version of the current asset state
 * 2. Uploads the new file to storage
 * 3. Updates the asset record with the new file
 *
 * @route PUT /api/assets/[assetId]/update
 *
 * @param {string} params.assetId - UUID of the asset to update
 * @param {File} request.formData.file - The new file to upload (max 100MB)
 * @param {string} request.formData.changeReason - Optional reason for the update
 * @param {string} request.formData.versionLabel - Optional label for this version
 *
 * @returns {object} Update result with new asset details
 * @returns {string} returns.assetId - UUID of the updated asset
 * @returns {string} returns.storageUrl - New internal storage URL
 * @returns {string} returns.publicUrl - New public HTTPS URL
 * @returns {number} returns.versionNumber - Version number of the created backup
 * @returns {boolean} returns.success - Always true on success
 *
 * @throws {401} Unauthorized - User not authenticated
 * @throws {403} Forbidden - User doesn't own the asset
 * @throws {400} Bad Request - Invalid asset ID or no file provided
 * @throws {404} Not Found - Asset not found
 * @throws {413} Payload Too Large - File exceeds 100MB limit
 * @throws {429} Too Many Requests - Rate limit exceeded
 * @throws {500} Internal Server Error - Storage or database error
 *
 * @ratelimit 10 requests per minute (TIER 2 - Resource Creation)
 * @authentication Required - Session cookie (supabase-auth-token)
 */
const handleAssetUpdate: AuthenticatedHandler<{ assetId: string }> = async (request, { user, supabase }, routeContext) => {
  const startTime = Date.now();
  const { assetId } = await routeContext!.params;

  serverLogger.info(
    {
      event: 'assets.update.request_started',
      userId: user.id,
      assetId,
    },
    'Asset update request received'
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

  // Get form data
  const formData = await request.formData();
  const file = formData.get('file') as File;
  const changeReason = (formData.get('changeReason') as string) || undefined;
  const versionLabel = (formData.get('versionLabel') as string) || undefined;

  if (!file) {
    serverLogger.warn(
      {
        event: 'assets.update.no_file',
        userId: user.id,
        assetId,
      },
      'No file provided in update request'
    );
    return badRequestResponse('No file provided');
  }

  serverLogger.debug(
    {
      event: 'assets.update.file_received',
      userId: user.id,
      assetId,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      changeReason,
    },
    'Update file received'
  );

  // Get current asset to verify ownership and get metadata
  const { data: asset, error: assetError } = await supabase
    .from('assets')
    .select('*')
    .eq('id', assetId)
    .single();

  if (assetError || !asset) {
    serverLogger.warn(
      {
        event: 'assets.update.asset_not_found',
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
        event: 'assets.update.unauthorized',
        userId: user.id,
        assetId,
        projectId: asset.project_id,
      },
      'User does not have access to update this asset'
    );
    return errorResponse('Unauthorized', 403);
  }

  // File size validation (100MB max)
  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  if (file.size > MAX_FILE_SIZE) {
    serverLogger.warn(
      {
        event: 'assets.update.file_too_large',
        userId: user.id,
        assetId,
        fileSize: file.size,
        maxSize: MAX_FILE_SIZE,
      },
      `File size ${file.size} exceeds maximum ${MAX_FILE_SIZE}`
    );
    return badRequestResponse('File too large - maximum file size is 100MB');
  }

  // MIME type validation
  const ALLOWED_MIME_TYPES = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'],
    video: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'],
    audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'],
  };

  const allowedTypes = ALLOWED_MIME_TYPES[asset.type as keyof typeof ALLOWED_MIME_TYPES];
  if (!allowedTypes?.includes(file.type)) {
    serverLogger.warn(
      {
        event: 'assets.update.invalid_mime_type',
        userId: user.id,
        assetId,
        fileType: file.type,
        assetType: asset.type,
        allowedTypes,
      },
      `Invalid MIME type ${file.type} for asset type ${asset.type}`
    );
    return badRequestResponse(
      `Invalid file type. Allowed types for ${asset.type}: ${allowedTypes.join(', ')}`
    );
  }

  // Create version of current asset state BEFORE updating
  try {
    const versionService = new AssetVersionService(supabase);
    const version = await versionService.createVersion(assetId, user.id, {
      changeReason,
      versionLabel,
    });

    serverLogger.info(
      {
        event: 'assets.update.version_created',
        userId: user.id,
        assetId,
        versionId: version.id,
        versionNumber: version.version_number,
      },
      'Version created before updating asset'
    );
  } catch (versionError) {
    serverLogger.error(
      {
        event: 'assets.update.version_failed',
        userId: user.id,
        assetId,
        error: versionError instanceof Error ? versionError.message : 'Unknown error',
      },
      'Failed to create version before update'
    );
    return errorResponse('Failed to create version backup', 500);
  }

  // Generate new filename for updated asset
  const originalName = (file.name || '').trim();
  const extFromName = originalName.includes('.') ? originalName.split('.').pop() : '';
  const extFromMime = file.type?.split('/')[1];
  const resolvedExt = (extFromName || extFromMime || 'bin').replace(/[^a-zA-Z0-9]/g, '');
  const fileName = `${crypto.randomUUID()}.${resolvedExt}`;
  const folder = asset.type === 'audio' ? 'audio' : asset.type === 'video' ? 'video' : 'image';
  const filePath = `${user.id}/${asset.project_id}/${folder}/${fileName}`;

  serverLogger.debug(
    {
      event: 'assets.update.uploading_to_storage',
      userId: user.id,
      assetId,
      filePath,
      fileSize: file.size,
    },
    'Uploading new file to storage'
  );

  // Convert File to Buffer for upload
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Upload new file to storage
  const { error: uploadError } = await supabase.storage.from('assets').upload(filePath, buffer, {
    contentType: file.type,
    upsert: false,
  });

  if (uploadError) {
    serverLogger.error(
      {
        event: 'assets.update.storage_error',
        userId: user.id,
        assetId,
        filePath,
        error: uploadError.message,
      },
      'Failed to upload new file to storage'
    );
    return errorResponse(uploadError.message, 500);
  }

  // Delete old file from storage
  const oldStoragePath = asset.storage_url.replace('supabase://assets/', '');
  await supabase.storage.from('assets').remove([oldStoragePath]);

  // Get public URL for new file
  const {
    data: { publicUrl: rawPublicUrl },
  } = supabase.storage.from('assets').getPublicUrl(filePath);
  const publicUrl = ensureHttpsProtocol(rawPublicUrl);

  // Sanitize filename
  const sanitizedOriginalName = sanitize(originalName || fileName);

  // Generate thumbnail for video assets
  let thumbnailDataURL: string | undefined;
  if (asset.type === 'video') {
    try {
      const { ThumbnailService } = await import('@/lib/services/thumbnailService');
      const thumbnailService = new ThumbnailService();

      thumbnailDataURL = await thumbnailService.generateVideoThumbnailDataURL(buffer, {
        timestamp: 1.0,
        width: 320,
        quality: 80,
      });

      serverLogger.info(
        {
          event: 'assets.update.thumbnail_generated',
          userId: user.id,
          assetId,
          thumbnailSize: thumbnailDataURL.length,
        },
        'Video thumbnail generated for updated asset'
      );
    } catch (thumbnailError) {
      serverLogger.warn(
        {
          event: 'assets.update.thumbnail_failed',
          userId: user.id,
          assetId,
          error: thumbnailError instanceof Error ? thumbnailError.message : 'Unknown error',
        },
        'Failed to generate thumbnail for updated asset (non-fatal)'
      );
    }
  }

  // Update asset record
  const newStorageUrl = `supabase://assets/${filePath}`;

  const { error: updateError } = await supabase
    .from('assets')
    .update({
      storage_url: newStorageUrl,
      mime_type: file.type,
      metadata: {
        filename: sanitizedOriginalName,
        mimeType: file.type,
        sourceUrl: publicUrl,
        size: file.size,
        updated_at: new Date().toISOString(),
        ...(changeReason && { last_change_reason: changeReason }),
        ...(thumbnailDataURL && { thumbnail: thumbnailDataURL }),
      },
    })
    .eq('id', assetId);

  if (updateError) {
    serverLogger.error(
      {
        event: 'assets.update.db_error',
        userId: user.id,
        assetId,
        error: updateError.message,
      },
      'Failed to update asset record'
    );

    // Try to delete the uploaded file
    await supabase.storage.from('assets').remove([filePath]);

    return errorResponse(updateError.message, 500);
  }

  const duration = Date.now() - startTime;
  serverLogger.info(
    {
      event: 'assets.update.success',
      userId: user.id,
      assetId,
      fileSize: file.size,
      fileName: file.name,
      mimeType: file.type,
      storageUrl: newStorageUrl,
      duration,
    },
    `Asset updated successfully in ${duration}ms`
  );

  // Log to activity history
  await supabase.from('user_activity_history').insert({
    user_id: user.id,
    project_id: asset.project_id,
    activity_type: 'asset_update',
    title: sanitizedOriginalName,
    description: changeReason || `Updated ${asset.type}`,
    asset_id: assetId,
    metadata: {
      fileSize: file.size,
      mimeType: file.type,
      changeReason,
    },
  });

  // Get current version number
  const versionService = new AssetVersionService(supabase);
  const currentVersion = await versionService.getCurrentVersionNumber(assetId);

  return successResponse({
    assetId,
    storageUrl: newStorageUrl,
    publicUrl,
    versionNumber: currentVersion - 1, // Previous version that was created
    success: true,
  });
};

export const PUT = withAuth(handleAssetUpdate, {
  route: '/api/assets/[assetId]/update',
  rateLimit: RATE_LIMITS.tier2_resource_creation,
});
