/**
 * Asset Thumbnail Generation API
 *
 * Generates thumbnails for video and image assets server-side using FFmpeg and Sharp.
 * Can be called manually or automatically via webhook after upload.
 *
 * @route POST /api/assets/[assetId]/thumbnail
 */

import { serverLogger } from '@/lib/serverLogger';
import {
  badRequestResponse,
  errorResponse,
  successResponse,
  notFoundResponse,
} from '@/lib/api/response';
import { validateUUID, ValidationError } from '@/lib/validation';
import { withAuth } from '@/lib/api/withAuth';
import type { AuthenticatedHandler } from '@/lib/api/withAuth';
import { RATE_LIMITS } from '@/lib/rateLimit';
import { ThumbnailService } from '@/lib/services/thumbnailService';

interface ThumbnailRequestBody {
  /** Force regeneration even if thumbnail exists */
  force?: boolean;
  /** Timestamp in seconds for video thumbnail (default: 1.0) */
  timestamp?: number;
  /** Width in pixels (default: 320) */
  width?: number;
  /** JPEG quality 1-100 (default: 80) */
  quality?: number;
}

/**
 * Generate thumbnail for an asset (video or image)
 *
 * @route POST /api/assets/[assetId]/thumbnail
 *
 * @param {string} assetId - UUID of the asset (from URL path)
 * @param {ThumbnailRequestBody} request.body - Thumbnail generation options
 *
 * @returns {object} Success response with thumbnail data URL
 * @returns {string} returns.thumbnail - Base64 data URL of the thumbnail
 * @returns {object} returns.metadata - Thumbnail metadata (width, height, size)
 * @returns {boolean} returns.success - Always true on success
 *
 * @throws {400} Bad Request - Invalid asset ID or options
 * @throws {401} Unauthorized - User not authenticated
 * @throws {403} Forbidden - User doesn't own the asset
 * @throws {404} Not Found - Asset doesn't exist
 * @throws {429} Too Many Requests - Rate limit exceeded
 * @throws {500} Internal Server Error - Thumbnail generation failed
 *
 * @ratelimit 5 requests per minute (TIER 2 - Resource Creation)
 *
 * @authentication Required - Session cookie (supabase-auth-token)
 *
 * @example
 * POST /api/assets/123e4567-e89b-12d3-a456-426614174000/thumbnail
 * Content-Type: application/json
 *
 * {
 *   "timestamp": 2.5,
 *   "width": 480,
 *   "quality": 85
 * }
 *
 * Response:
 * {
 *   "thumbnail": "data:image/jpeg;base64,...",
 *   "metadata": {
 *     "width": 480,
 *     "height": 270,
 *     "format": "jpeg",
 *     "size": 45678,
 *     "timestamp": 2.5
 *   },
 *   "success": true
 * }
 */
const handleThumbnailGeneration: AuthenticatedHandler<{ assetId: string }> = async (
  request,
  { user, supabase },
  routeContext
) => {
  const startTime = Date.now();
  const params = routeContext?.params ? await routeContext.params : { assetId: '' };
  const assetId = params.assetId;

  serverLogger.info(
    {
      event: 'assets.thumbnail.request_started',
      userId: user.id,
      assetId,
    },
    'Thumbnail generation request received'
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

  // Parse request body
  let body: ThumbnailRequestBody = {};
  try {
    const text = await request.text();
    if (text.trim()) {
      body = JSON.parse(text);
    }
  } catch {
    return badRequestResponse('Invalid JSON in request body');
  }

  const { force = false, timestamp, width, quality } = body;

  // Get asset from database
  const { data: asset, error: assetError } = await supabase
    .from('assets')
    .select('*')
    .eq('id', assetId)
    .eq('user_id', user.id)
    .single();

  if (assetError || !asset) {
    serverLogger.warn(
      {
        event: 'assets.thumbnail.asset_not_found',
        userId: user.id,
        assetId,
        error: assetError?.message,
      },
      'Asset not found or unauthorized'
    );
    return notFoundResponse('Asset not found or access denied');
  }

  // Check if thumbnail already exists
  const existingThumbnail = asset.metadata?.thumbnail;
  if (existingThumbnail && !force) {
    serverLogger.info(
      {
        event: 'assets.thumbnail.already_exists',
        userId: user.id,
        assetId,
      },
      'Thumbnail already exists, returning existing'
    );
    return successResponse({
      thumbnail: existingThumbnail,
      metadata: {
        cached: true,
      },
      success: true,
    });
  }

  // Only generate thumbnails for images and videos
  if (asset.type !== 'video' && asset.type !== 'image') {
    return badRequestResponse(`Cannot generate thumbnail for asset type: ${asset.type}`);
  }

  serverLogger.debug(
    {
      event: 'assets.thumbnail.fetching_asset',
      userId: user.id,
      assetId,
      assetType: asset.type,
      storageUrl: asset.storage_url,
    },
    'Fetching asset file for thumbnail generation'
  );

  // Get asset file from storage
  const storageUrl = asset.storage_url as string;
  const urlParts = storageUrl.replace('supabase://', '').split('/');
  const bucket = urlParts[0];
  const filePath = urlParts.slice(1).join('/');

  if (!bucket || !filePath) {
    return badRequestResponse('Invalid storage URL format');
  }

  // Get signed URL
  const { data: signedData, error: signError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(filePath, 600);

  if (signError || !signedData?.signedUrl) {
    serverLogger.error(
      {
        event: 'assets.thumbnail.signed_url_error',
        userId: user.id,
        assetId,
        error: signError?.message,
      },
      'Failed to create signed URL'
    );
    return errorResponse('Failed to access asset file', 500);
  }

  // Download asset file
  let assetBuffer: Buffer;
  try {
    const response = await fetch(signedData.signedUrl);
    if (!response.ok) {
      throw new Error(`Failed to download asset: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    assetBuffer = Buffer.from(arrayBuffer);

    serverLogger.debug(
      {
        event: 'assets.thumbnail.asset_downloaded',
        userId: user.id,
        assetId,
        sizeBytes: assetBuffer.length,
      },
      'Asset file downloaded successfully'
    );
  } catch (downloadError) {
    serverLogger.error(
      {
        event: 'assets.thumbnail.download_error',
        userId: user.id,
        assetId,
        error: downloadError instanceof Error ? downloadError.message : 'Unknown error',
      },
      'Failed to download asset file'
    );
    return errorResponse('Failed to download asset file', 500);
  }

  // Generate thumbnail
  const thumbnailService = new ThumbnailService();
  let thumbnailDataURL: string;
  let thumbnailMetadata: unknown;

  try {
    if (asset.type === 'video') {
      serverLogger.debug(
        {
          event: 'assets.thumbnail.generating_video',
          userId: user.id,
          assetId,
          timestamp,
          width,
          quality,
        },
        'Generating video thumbnail'
      );

      const result = await thumbnailService.generateVideoThumbnail(assetBuffer, {
        timestamp,
        width,
        quality,
      });

      thumbnailDataURL = `data:image/jpeg;base64,${result.buffer.toString('base64')}`;
      thumbnailMetadata = result.metadata;
    } else {
      // image
      serverLogger.debug(
        {
          event: 'assets.thumbnail.generating_image',
          userId: user.id,
          assetId,
          width,
          quality,
        },
        'Generating image thumbnail'
      );

      const result = await thumbnailService.generateImageThumbnail(assetBuffer, {
        width,
        quality,
      });

      thumbnailDataURL = `data:image/jpeg;base64,${result.buffer.toString('base64')}`;
      thumbnailMetadata = result.metadata;
    }

    serverLogger.info(
      {
        event: 'assets.thumbnail.generated',
        userId: user.id,
        assetId,
        assetType: asset.type,
        thumbnailSize: thumbnailDataURL.length,
        metadata: thumbnailMetadata,
      },
      'Thumbnail generated successfully'
    );
  } catch (thumbnailError) {
    serverLogger.error(
      {
        event: 'assets.thumbnail.generation_error',
        userId: user.id,
        assetId,
        error: thumbnailError instanceof Error ? thumbnailError.message : 'Unknown error',
      },
      'Failed to generate thumbnail'
    );
    return errorResponse(
      `Thumbnail generation failed: ${thumbnailError instanceof Error ? thumbnailError.message : 'Unknown error'}`,
      500
    );
  }

  // Update asset metadata with thumbnail
  const { error: updateError } = await supabase
    .from('assets')
    .update({
      metadata: {
        ...asset.metadata,
        thumbnail: thumbnailDataURL,
        thumbnailMetadata,
      },
    })
    .eq('id', assetId);

  if (updateError) {
    serverLogger.error(
      {
        event: 'assets.thumbnail.update_error',
        userId: user.id,
        assetId,
        error: updateError.message,
      },
      'Failed to update asset metadata with thumbnail'
    );
    // Don't fail the request - return thumbnail anyway
  } else {
    serverLogger.debug(
      {
        event: 'assets.thumbnail.metadata_updated',
        userId: user.id,
        assetId,
      },
      'Asset metadata updated with thumbnail'
    );
  }

  const duration = Date.now() - startTime;
  serverLogger.info(
    {
      event: 'assets.thumbnail.success',
      userId: user.id,
      assetId,
      assetType: asset.type,
      duration,
    },
    `Thumbnail generated successfully in ${duration}ms`
  );

  return successResponse({
    thumbnail: thumbnailDataURL,
    metadata: thumbnailMetadata,
    success: true,
  });
};

export const POST = withAuth(handleThumbnailGeneration, {
  route: '/api/assets/[assetId]/thumbnail',
  rateLimit: RATE_LIMITS.tier2_resource_creation,
});
