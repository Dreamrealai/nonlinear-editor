import { NextResponse } from 'next/server';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';
import { validateUUID, validateAll } from '@/lib/api/validation';
import {
  errorResponse,
  validationError,
  internalServerError,
} from '@/lib/api/response';
import { verifyAssetOwnership } from '@/lib/api/project-verification';
import { serverLogger } from '@/lib/serverLogger';
import { RATE_LIMITS } from '@/lib/rateLimit';
import { withAuth } from '@/lib/api/withAuth';
import type { AuthenticatedHandler } from '@/lib/api/withAuth';

/**
 * POST /api/video/upscale
 *
 * Upscales a video using fal.ai Topaz Video Upscale API.
 *
 * Request body:
 * - assetId: string - ID of the video asset to upscale
 * - projectId: string - ID of the project
 * - upscaleFactor?: number - Upscale factor (default: 2)
 * - targetFps?: number - Target FPS for frame interpolation (optional)
 * - h264Output?: boolean - Use H264 codec instead of H265 (default: false)
 */
const handleVideoUpscale: AuthenticatedHandler = async (request, { user, supabase }) => {
  const body = await request.json();
  const { assetId, projectId, upscaleFactor = 2, targetFps, h264Output = false } = body;

  // Validate inputs using centralized validation
  const validation = validateAll([
    validateUUID(assetId, 'assetId'),
    validateUUID(projectId, 'projectId'),
  ]);

  if (!validation.valid) {
    const firstError = validation.errors[0];
    return validationError(firstError?.message ?? 'Invalid input', firstError?.field);
  }

  // Verify asset ownership using centralized verification
  const assetVerification = await verifyAssetOwnership(supabase, assetId, user.id, '*');
  if (!assetVerification.hasAccess) {
    return errorResponse(assetVerification.error!, assetVerification.status!);
  }

  const asset = assetVerification.asset!;

  // Verify FAL_API_KEY is configured
  const falKey = process.env['FAL_API_KEY'];
  if (!falKey) {
    return internalServerError('FAL_API_KEY not configured on server');
  }

  // Get public URL for the video
  const storageUrl = asset.storage_url as string;
  const [, bucketPath] = storageUrl.split('://');

  if (!bucketPath) {
    return internalServerError('Invalid storage URL format');
  }

  const [bucket, ...pathParts] = bucketPath.split('/');
  const path = pathParts.join('/');

  if (!bucket) {
    return internalServerError('Invalid storage URL: missing bucket');
  }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);

  if (!urlData?.publicUrl) {
    return internalServerError('Failed to generate public URL for video');
  }

  // Submit upscale request to fal.ai with timeout
  let falResponse;
  try {
    falResponse = await fetchWithTimeout('https://queue.fal.run/fal-ai/topaz/upscale/video', {
      method: 'POST',
      headers: {
        Authorization: `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_url: urlData.publicUrl,
        upscale_factor: upscaleFactor,
        ...(targetFps && { target_fps: targetFps }),
        ...(h264Output && { H264_output: h264Output }),
      }),
      timeout: 60000,
    });

    if (!falResponse.ok) {
      const errorText = await falResponse.text();
      serverLogger.error(
        {
          status: falResponse.status,
          errorText,
          assetId,
          projectId,
          event: 'video.upscale.fal_error',
        },
        'fal.ai upscale request failed'
      );
      return internalServerError('Failed to submit upscale request to fal.ai');
    }
  } catch (error) {
    if (error instanceof Error && /timeout/i.test(error.message)) {
      serverLogger.error(
        {
          assetId,
          projectId,
          event: 'video.upscale.timeout',
        },
        'FAL.ai upscale submission timeout'
      );
      return errorResponse('Upscale submission timeout after 60s', 504);
    }
    throw error;
  }

  const falData = await falResponse.json();
  const requestId = falData.request_id;

  if (!requestId) {
    return internalServerError('No request ID returned from fal.ai');
  }

  // Log successful submission
  serverLogger.info(
    {
      requestId,
      assetId,
      projectId,
      upscaleFactor,
      event: 'video.upscale.submitted',
    },
    'Video upscale request submitted successfully'
  );

  // Return the request ID for polling
  return NextResponse.json({
    requestId,
    message: 'Video upscale request submitted successfully',
  });
};

export const POST = withAuth(handleVideoUpscale, {
  route: '/api/video/upscale',
  rateLimit: RATE_LIMITS.tier2_resource_creation,
});
