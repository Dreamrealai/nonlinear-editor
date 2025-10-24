import { checkOperationStatus } from '@/lib/veo';
import { checkFalVideoStatus } from '@/lib/fal-video';
import { v4 as uuidv4 } from 'uuid';
import { GoogleAuth } from 'google-auth-library';
import { validationError, successResponse } from '@/lib/api/response';
import { serverLogger } from '@/lib/serverLogger';
import { RATE_LIMITS } from '@/lib/rateLimit';
import { withAuth } from '@/lib/api/withAuth';
import type { AuthenticatedHandler } from '@/lib/api/withAuth';
import { createAssetWithCleanup } from '@/lib/api/statusCheckHandler';
import { validateUUID, validateString, ValidationError } from '@/lib/validation';
import { HttpError } from '@/lib/errors/HttpError';

const normalizeStorageUrl = (bucket: string, path: string): string =>
  `supabase://${bucket}/${path}`;

const parseGcsUri = (uri: string): { bucket: string; objectPath: string } | null => {
  const normalized = uri.replace(/^gs:\/\//, '');
  const [bucket, ...rest] = normalized.split('/');
  if (!bucket || rest.length === 0) {
    return null;
  }
  return { bucket, objectPath: rest.join('/') };
};

/**
 * Check the status of a video generation operation.
 *
 * Polls the status of an ongoing video generation job from either Google Veo or FAL.ai.
 * When complete, downloads the video and creates an asset record in the database.
 *
 * @route GET /api/video/status
 *
 * @param {string} request.query.operationName - Operation identifier from /api/video/generate
 * @param {string} request.query.projectId - UUID of the project
 *
 * @returns {object} Operation status
 * @returns {boolean} returns.done - Whether the operation is complete
 * @returns {number} [returns.progress] - Progress percentage (0-100)
 * @returns {string} [returns.error] - Error message if failed
 * @returns {object} [returns.asset] - Created asset object if complete
 * @returns {string} [returns.storageUrl] - Public URL of the video if complete
 *
 * @throws {401} Unauthorized - User not authenticated
 * @throws {400} Bad Request - Missing or invalid operationName or projectId
 * @throws {429} Too Many Requests - Rate limit exceeded (30 requests per minute)
 * @throws {500} Internal Server Error - Download, storage, or database error
 *
 * @ratelimit 30 requests per minute (TIER 3 - Status/Read Operations)
 *
 * @authentication Required - Session cookie (supabase-auth-token)
 *
 * @polling Use this endpoint in a polling loop (recommended interval: 5-10 seconds)
 *
 * @example
 * // Check Google Veo status
 * GET /api/video/status?operationName=projects/123/locations/us-central1/operations/456&projectId=proj-uuid
 *
 * Response (processing):
 * {
 *   "done": false,
 *   "progress": 45
 * }
 *
 * Response (complete):
 * {
 *   "done": true,
 *   "asset": {
 *     "id": "asset-uuid",
 *     "type": "video",
 *     "storage_url": "supabase://assets/...",
 *     ...
 *   },
 *   "storageUrl": "https://storage.example.com/..."
 * }
 *
 * @example
 * // Check FAL.ai status
 * GET /api/video/status?operationName=fal:seedance-1.0-pro:abc123&projectId=proj-uuid
 *
 * Response (processing):
 * {
 *   "done": false,
 *   "progress": 0
 * }
 */
const handleVideoStatus: AuthenticatedHandler = async (req, { user, supabase }) => {
  const startTime = Date.now();

  serverLogger.info(
    {
      event: 'video.status.request_started',
    },
    'Video status check request received'
  );

  const { searchParams } = new URL(req.url);
  const operationName = searchParams.get('operationName');
  const projectId = searchParams.get('projectId');

  // Validate inputs using centralized validation utilities
  try {
    validateString(operationName, 'operationName', { minLength: 1, maxLength: 500 });
    validateUUID(projectId, 'projectId');
  } catch (error) {
    if (error instanceof ValidationError) {
      serverLogger.warn(
        {
          event: 'video.status.validation_error',
          userId: user.id,
          field: error.field,
          error: error.message,
        },
        `Validation error: ${error.message}`
      );
      return validationError(error.message, error.field);
    }
    throw error;
  }

  // Determine if this is a FAL operation or Veo operation
  const isFalOperation = operationName.startsWith('fal:');

  if (isFalOperation) {
    // Parse FAL operation name: fal:endpoint:requestId
    const parts = operationName.split(':');
    if (parts.length < 3) {
      return validationError('Invalid FAL operation name format', 'operationName');
    }
    const endpoint = parts.slice(1, -1).join(':'); // Reconstruct endpoint (may contain colons)
    const requestId = parts[parts.length - 1];

    if (!requestId || !endpoint) {
      return validationError('Invalid FAL operation name format', 'operationName');
    }

    // Check FAL operation status
    const falResult = await checkFalVideoStatus(requestId, endpoint);

    if (falResult.done && falResult.result) {
      // Download video from FAL URL and upload to Supabase
      const videoUrl = falResult.result.video.url;

      const videoResponse = await fetch(videoUrl);
      if (!videoResponse.ok) {
        throw new HttpError(`Failed to download FAL video: ${videoResponse.status}`, 500);
      }

      const videoBinary = Buffer.from(await videoResponse.arrayBuffer());
      const fileName = `${uuidv4()}.mp4`;
      const storagePath = `${user.id}/${projectId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(storagePath, videoBinary, {
          contentType: falResult.result.video.content_type || 'video/mp4',
          upsert: false,
        });

      if (uploadError) {
        throw new HttpError(`Storage upload failed: ${uploadError.message}`, 500);
      }

      const storageUrl = normalizeStorageUrl('assets', storagePath);

      // Use shared utility for asset creation with automatic cleanup
      const asset = await createAssetWithCleanup<{
        id: string;
        user_id: string;
        project_id: string;
        type: string;
        source: string;
        storage_url: string;
        metadata: Record<string, unknown>;
        created_at?: string;
      }>(
        supabase,
        {
          user_id: user.id,
          project_id: projectId,
          type: 'video',
          source: 'genai',
          storage_url: storageUrl,
          metadata: {
            filename: fileName,
            mimeType: falResult.result.video.content_type || 'video/mp4',
            // Note: sourceUrl removed - use storage_url with signed URLs instead
            generator: endpoint.includes('seedance') ? 'seedance-pro' : 'minimax-video-01-live',
          },
        },
        storagePath
      );

      // Log to activity history
      await supabase.from('user_activity_history').insert({
        user_id: user.id,
        project_id: projectId,
        activity_type: 'video_generation',
        title: 'Video Generated',
        model: endpoint.includes('seedance') ? 'seedance-pro' : 'minimax-video-01-live',
        asset_id: asset.id,
        metadata: {
          mimeType: falResult.result.video.content_type || 'video/mp4',
        },
      });

      const duration = Date.now() - startTime;
      serverLogger.info(
        {
          event: 'video.status.fal_completed',
          userId: user.id,
          projectId,
          assetId: asset.id,
          duration,
        },
        `FAL video generation completed successfully in ${duration}ms`
      );

      return successResponse({
        done: true,
        asset,
      });
    }

    if (falResult.error) {
      serverLogger.error(
        {
          event: 'video.status.fal_error',
          userId: user.id,
          projectId,
          operationName,
          error: falResult.error,
        },
        'FAL video generation failed'
      );

      return successResponse({
        done: true,
        error: falResult.error,
      });
    }

    // Still processing
    serverLogger.debug(
      {
        event: 'video.status.fal_processing',
        userId: user.id,
        projectId,
        operationName,
      },
      'FAL video still processing'
    );

    return successResponse({
      done: false,
      progress: 0,
    });
  }

  // Check Veo operation status
  const result = await checkOperationStatus(operationName);

  if (result.done && result.response) {
    const videoArtifact = result.response.videos?.[0];
    const mimeType = videoArtifact?.mimeType || 'video/mp4';
    let videoBinary: Buffer | null = null;

    if (videoArtifact?.bytesBase64Encoded) {
      videoBinary = Buffer.from(videoArtifact.bytesBase64Encoded, 'base64');
    }

    const gcsUri = videoArtifact?.gcsUri;

    if (!videoBinary && gcsUri) {
      const parsed = parseGcsUri(gcsUri);
      if (!parsed) {
        throw new HttpError('Invalid GCS URI returned by Veo', 500);
      }

      const serviceAccountJson = process.env['GOOGLE_SERVICE_ACCOUNT'];
      if (!serviceAccountJson) {
        throw new HttpError(
          'GOOGLE_SERVICE_ACCOUNT environment variable is required to download Veo output',
          500
        );
      }

      const serviceAccount = JSON.parse(serviceAccountJson);
      const auth = new GoogleAuth({
        credentials: serviceAccount,
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      });

      const client = await auth.getClient();
      const { token } = await client.getAccessToken();

      if (!token) {
        throw new HttpError('Failed to obtain Google access token', 500);
      }

      const downloadUrl = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(parsed.bucket)}/o/${encodeURIComponent(parsed.objectPath)}?alt=media`;
      const downloadResponse = await fetch(downloadUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!downloadResponse.ok) {
        const detail = await downloadResponse.text().catch(() => '');
        throw new HttpError(
          `Failed to download Veo video: ${downloadResponse.status} ${detail}`.trim(),
          500
        );
      }

      const arrayBuffer = await downloadResponse.arrayBuffer();
      videoBinary = Buffer.from(arrayBuffer);
    }

    if (!videoBinary) {
      throw new HttpError('No downloadable video returned by Veo operation', 500);
    }

    const fileName = `${uuidv4()}.mp4`;
    const storagePath = `${user.id}/${projectId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('assets')
      .upload(storagePath, videoBinary, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      throw new HttpError(`Storage upload failed: ${uploadError.message}`, 500);
    }

    const storageUrl = normalizeStorageUrl('assets', storagePath);

    // Use shared utility for asset creation with automatic cleanup
    const asset = await createAssetWithCleanup<{
      id: string;
      user_id: string;
      project_id: string;
      type: string;
      source: string;
      storage_url: string;
      metadata: Record<string, unknown>;
      created_at?: string;
    }>(
      supabase,
      {
        user_id: user.id,
        project_id: projectId,
        type: 'video',
        source: 'genai',
        storage_url: storageUrl,
        metadata: {
          filename: fileName,
          mimeType,
          // Note: sourceUrl removed - use storage_url with signed URLs instead
          generator: 'veo',
        },
      },
      storagePath
    );

    // Log to activity history
    await supabase.from('user_activity_history').insert({
      user_id: user.id,
      project_id: projectId,
      activity_type: 'video_generation',
      title: 'Video Generated',
      model: 'veo',
      asset_id: asset.id,
      metadata: {
        mimeType,
      },
    });

    const duration = Date.now() - startTime;
    serverLogger.info(
      {
        event: 'video.status.veo_completed',
        userId: user.id,
        projectId,
        assetId: asset.id,
        duration,
      },
      `Veo video generation completed successfully in ${duration}ms`
    );

    return successResponse({
      done: true,
      asset,
    });
  }

  // Still processing or error
  if (result.error) {
    serverLogger.error(
      {
        event: 'video.status.veo_error',
        userId: user.id,
        projectId,
        operationName,
        error: result.error.message,
      },
      'Veo video generation failed'
    );
  } else {
    serverLogger.debug(
      {
        event: 'video.status.veo_processing',
        userId: user.id,
        projectId,
        operationName,
        progress: result.metadata?.progressPercentage || 0,
      },
      'Veo video still processing'
    );
  }

  return successResponse({
    done: result.done,
    progress: result.metadata?.progressPercentage || 0,
    error: result.error?.message,
  });
};

export const GET = withAuth(handleVideoStatus, {
  route: '/api/video/status',
  rateLimit: RATE_LIMITS.tier3_status_read,
});
