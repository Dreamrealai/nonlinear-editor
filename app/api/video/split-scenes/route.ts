import { VideoIntelligenceServiceClient, protos } from '@google-cloud/video-intelligence';
import { Storage } from '@google-cloud/storage';
import { serverLogger } from '@/lib/serverLogger';
import {
  validationError,
  forbiddenResponse,
  successResponse,
  errorResponse,
  serviceUnavailableResponse,
} from '@/lib/api/response';
import { withAuth } from '@/lib/api/withAuth';
import type { AuthenticatedHandler } from '@/lib/api/withAuth';
import { RATE_LIMITS } from '@/lib/rateLimit';
import { validateUUID, ValidationError } from '@/lib/validation';

const parseStorageUrl = (storageUrl: string): { bucket: string; path: string } | null => {
  // SECURITY: Validate input format
  if (!storageUrl || typeof storageUrl !== 'string') {
    return null;
  }

  const normalized = storageUrl.replace(/^supabase:\/\//, '').replace(/^\/+/, '');
  const [bucket, ...parts] = normalized.split('/');

  if (!bucket || parts.length === 0) {
    return null;
  }

  // SECURITY: Prevent path traversal attacks
  const path = parts.join('/');
  if (path.includes('..') || path.includes('//')) {
    serverLogger.error({ storageUrl }, 'Path traversal attempt detected');
    return null;
  }

  return { bucket, path };
};

// Set max duration for Vercel serverless function (10 seconds on hobby, 60 on pro)
export const maxDuration = 60;

const handleSplitScenes: AuthenticatedHandler = async (req, { user, supabase }) => {
  serverLogger.info('Scene detection request received');
  serverLogger.info({ userId: user.id }, 'User authenticated for scene detection');

  const body = await req.json();
  const { assetId, projectId } = body;

  // Validate inputs using centralized validation utilities
  try {
    validateUUID(assetId, 'assetId');
    validateUUID(projectId, 'projectId');
  } catch (error) {
    if (error instanceof ValidationError) {
      serverLogger.warn(
        {
          event: 'split_scenes.validation_error',
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

  // Get the video asset
  const { data: asset, error: assetError } = await supabase
    .from('assets')
    .select('*')
    .eq('id', assetId)
    .eq('user_id', user.id)
    .single();

  if (assetError || !asset) {
    return forbiddenResponse('Asset not found or access denied');
  }

  if (asset.type !== 'video') {
    return validationError('Asset must be a video', 'assetId');
  }

  // Check if scenes already exist for this asset
  const { data: existingScenes } = await supabase
    .from('scenes')
    .select('*')
    .eq('asset_id', assetId);

  if (existingScenes && existingScenes.length > 0) {
    return successResponse({
      message: 'Scenes already detected',
      scenes: existingScenes,
      count: existingScenes.length,
    });
  }

  // Get the video URL
  let videoUrl = (asset.metadata as { sourceUrl?: string })?.sourceUrl;
  if (!videoUrl) {
    const location =
      typeof asset.storage_url === 'string' ? parseStorageUrl(asset.storage_url) : null;
    if (!location) {
      return validationError('Video storage location invalid', 'storage_url');
    }

    const { data: signed, error: signError } = await supabase.storage
      .from(location.bucket)
      .createSignedUrl(location.path, 3600);

    if (signError || !signed?.signedUrl) {
      serverLogger.error(
        { signError, assetId, location },
        'Failed to create signed URL for scene detection'
      );
      return errorResponse('Unable to access video for scene detection', 502);
    }

    videoUrl = signed.signedUrl;
  }

  // Check for Google Cloud credentials
  const credentialsJson = process.env['GOOGLE_SERVICE_ACCOUNT'];
  if (!credentialsJson) {
    serverLogger.error({ assetId, projectId }, 'GOOGLE_SERVICE_ACCOUNT not configured');
    serverLogger.warn(
      { assetId, projectId },
      'Scene detection unavailable: GOOGLE_SERVICE_ACCOUNT not configured'
    );
    return serviceUnavailableResponse('Scene detection unavailable', {
      message:
        'Google Cloud Video Intelligence is not configured on this deployment. Please configure the GOOGLE_SERVICE_ACCOUNT environment variable.',
      details: 'Contact your administrator to enable scene detection features.',
    });
  }

  serverLogger.info({ assetId, projectId }, 'Google Cloud credentials found');

  // Initialize Video Intelligence client
  let credentials;
  try {
    credentials = JSON.parse(credentialsJson);
    serverLogger.info({ projectId: credentials.project_id }, 'Parsed GCP credentials successfully');
  } catch (parseError) {
    serverLogger.error(
      { parseError, assetId, projectId },
      'Failed to parse GOOGLE_SERVICE_ACCOUNT'
    );
    return serviceUnavailableResponse('Invalid Google Cloud credentials', {
      message: 'GOOGLE_SERVICE_ACCOUNT is not valid JSON',
    });
  }

  // Initialize clients
  const videoClient = new VideoIntelligenceServiceClient({ credentials });
  const storageClient = new Storage({ credentials });

  // Get GCS bucket for temporary video processing (MUST be created via Terraform)
  const bucketName = process.env['GCS_BUCKET_NAME'];

  // SECURITY: Require explicit bucket configuration (no auto-creation)
  if (!bucketName) {
    serverLogger.error({ assetId, projectId }, 'GCS_BUCKET_NAME environment variable not set');
    return serviceUnavailableResponse('GCS bucket not configured', {
      message:
        'GCS_BUCKET_NAME environment variable is not set. Configure infrastructure with Terraform.',
      details: 'See /docs/INFRASTRUCTURE.md for setup instructions.',
    });
  }

  const bucket = storageClient.bucket(bucketName);

  // Check if bucket exists (NO AUTO-CREATION for security)
  try {
    const [exists] = await bucket.exists();
    if (!exists) {
      serverLogger.error(
        { bucketName, assetId, projectId },
        'GCS bucket does not exist - must be created via Terraform'
      );
      return serviceUnavailableResponse('GCS bucket not found', {
        message: `Bucket "${bucketName}" does not exist. Create it using Terraform first.`,
        details: 'See /docs/INFRASTRUCTURE.md for setup instructions.',
      });
    }
    serverLogger.info({ bucketName, assetId, projectId }, 'GCS bucket verified');
  } catch (bucketError) {
    serverLogger.error(
      { bucketError, bucketName, assetId, projectId },
      'Error checking bucket existence'
    );
    return errorResponse('GCS bucket check failed', 502, undefined, {
      message: 'Unable to verify GCS bucket existence. Check service account permissions.',
      details: bucketError instanceof Error ? bucketError.message : 'Unknown error',
    });
  }

  // Upload video to GCS
  serverLogger.info(
    { videoUrl: videoUrl.substring(0, 50) + '...', assetId, projectId },
    'Downloading video from Supabase'
  );
  let gcsFilePath: string;
  let gcsFile;

  try {
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      serverLogger.error(
        { status: videoResponse.status, statusText: videoResponse.statusText, assetId },
        'Failed to download video from Supabase'
      );
      throw new Error(`Failed to download video: ${videoResponse.statusText}`);
    }

    const arrayBuffer = await videoResponse.arrayBuffer();
    const videoBuffer = Buffer.from(arrayBuffer);
    const videoSizeMB = (videoBuffer.length / 1024 / 1024).toFixed(2);
    serverLogger.info({ videoSizeMB, assetId, projectId }, 'Downloaded video from Supabase');

    // Generate unique filename for GCS
    const timestamp = Date.now();
    gcsFilePath = `video-analysis/${assetId}-${timestamp}.mp4`;
    gcsFile = bucket.file(gcsFilePath);

    serverLogger.info(
      { gcsUri: `gs://${bucketName}/${gcsFilePath}`, assetId, projectId },
      'Uploading video to GCS'
    );
    await gcsFile.save(videoBuffer, {
      metadata: {
        contentType: 'video/mp4',
        metadata: {
          assetId,
          projectId,
          uploadedAt: new Date().toISOString(),
        },
      },
    });

    serverLogger.info({ gcsFilePath, bucketName, assetId }, 'Video uploaded to GCS successfully');
  } catch (uploadError) {
    serverLogger.error(
      { uploadError, assetId, projectId, bucketName },
      'Failed to upload video to GCS'
    );
    return errorResponse('Video upload to GCS failed', 502, undefined, {
      message:
        uploadError instanceof Error
          ? uploadError.message
          : 'Could not upload video to Google Cloud Storage',
      details: 'Unable to prepare video for analysis. Check GCS bucket permissions.',
    });
  }

  // Perform shot detection using GCS URI (gs://)
  const gcsUri = `gs://${bucketName}/${gcsFilePath}`;
  const request = {
    inputUri: gcsUri,
    features: [protos.google.cloud.videointelligence.v1.Feature.SHOT_CHANGE_DETECTION],
  };

  serverLogger.info({ gcsUri, assetId, projectId }, 'Starting video annotation for shot detection');
  let results;
  try {
    // Add timeout to prevent function from hanging (45 seconds)
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Video analysis timed out after 45 seconds')), 45000)
    );

    results = await Promise.race([videoClient.annotateVideo(request), timeoutPromise]);
  } catch (apiError) {
    serverLogger.error({ apiError, gcsUri, assetId, projectId }, 'Video Intelligence API error');

    // Clean up GCS file on error
    try {
      await gcsFile.delete();
      serverLogger.info({ gcsFilePath, assetId, projectId }, 'Cleaned up GCS file after error');
    } catch (deleteError) {
      serverLogger.error(
        { deleteError, gcsFilePath, assetId, projectId },
        'Failed to clean up GCS file'
      );
    }

    return errorResponse('Video analysis failed', 502, undefined, {
      message:
        apiError instanceof Error ? apiError.message : 'Google Cloud Video Intelligence API error',
      details: 'The video format may not be supported or the API credentials may be invalid',
    });
  }

  serverLogger.info({ assetId, projectId }, 'Processing video for shot detection');

  // Safely get the first operation
  if (!results || !results[0]) {
    throw new Error('No operation results returned from Video Intelligence API');
  }

  const operation = results[0];
  const operationResult = await operation.promise();

  // Safely navigate the nested result structure
  const firstResult = operationResult?.[0];
  const firstAnnotation = firstResult?.annotationResults?.[0];
  const shots = firstAnnotation?.shotAnnotations || [];

  if (shots.length === 0) {
    // Clean up GCS file
    try {
      await gcsFile.delete();
      serverLogger.info(
        { gcsFilePath, assetId, projectId },
        'Cleaned up GCS file (no scenes detected)'
      );
    } catch (deleteError) {
      serverLogger.error(
        { deleteError, gcsFilePath, assetId, projectId },
        'Failed to clean up GCS file'
      );
    }

    return successResponse({
      message: 'No scenes detected in video',
      count: 0,
    });
  }

  serverLogger.info({ shotCount: shots.length, assetId, projectId }, 'Detected shots in video');

  // Create scenes in database
  const scenes = [];
  for (const shot of shots) {
    const startMs =
      Number(shot.startTimeOffset?.seconds || 0) * 1000 + (shot.startTimeOffset?.nanos || 0) / 1e6;
    const endMs =
      Number(shot.endTimeOffset?.seconds || 0) * 1000 + (shot.endTimeOffset?.nanos || 0) / 1e6;

    const { data: scene, error: sceneError } = await supabase
      .from('scenes')
      .insert({
        project_id: projectId,
        asset_id: assetId,
        start_ms: Math.round(startMs),
        end_ms: Math.round(endMs),
      })
      .select()
      .single();

    if (sceneError) {
      serverLogger.error(
        { sceneError, assetId, projectId, startMs, endMs },
        'Failed to create scene'
      );
      continue;
    }

    scenes.push(scene);
  }

  // Clean up GCS file after successful processing
  try {
    await gcsFile.delete();
    serverLogger.info(
      { gcsFilePath, assetId, projectId, sceneCount: scenes.length },
      'Cleaned up GCS file after successful processing'
    );
  } catch (deleteError) {
    serverLogger.error(
      { deleteError, gcsFilePath, assetId, projectId },
      'Failed to clean up GCS file'
    );
    // Don't fail the request if cleanup fails
  }

  return successResponse({
    message: `Successfully detected ${scenes.length} scenes`,
    scenes,
    count: scenes.length,
    note: 'Scene frames can be extracted in the Keyframe Editor',
  });
};

export const POST = withAuth(handleSplitScenes, {
  route: '/api/video/split-scenes',
  rateLimit: RATE_LIMITS.tier2_resource_creation,
});
