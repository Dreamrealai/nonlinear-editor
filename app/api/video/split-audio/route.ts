import { serverLogger } from '@/lib/serverLogger';
import { withAuth } from '@/lib/api/withAuth';
import type { AuthenticatedHandler } from '@/lib/api/withAuth';
import { RATE_LIMITS } from '@/lib/rateLimit';
import {
  validationError,
  forbiddenResponse,
  internalServerError,
  successResponse,
} from '@/lib/api/response';

const handleSplitAudio: AuthenticatedHandler = async (req, { user, supabase }) => {
  serverLogger.info({ event: 'split_audio.request_started' }, 'Audio split request received');

  const body = await req.json();
  const { assetId, projectId } = body;

  if (!assetId) {
    serverLogger.warn(
      { event: 'split_audio.missing_asset_id', userId: user.id },
      'Missing asset ID'
    );
    return validationError('Asset ID is required', 'assetId');
  }

  if (!projectId) {
    serverLogger.warn(
      { event: 'split_audio.missing_project_id', userId: user.id },
      'Missing project ID'
    );
    return validationError('Project ID is required', 'projectId');
  }

  serverLogger.info(
    {
      event: 'split_audio.processing',
      userId: user.id,
      assetId,
      projectId,
    },
    'Processing audio split request'
  );

  // Get the video asset
  const { data: asset, error: assetError } = await supabase
    .from('assets')
    .select('*')
    .eq('id', assetId)
    .eq('user_id', user.id)
    .single();

  if (assetError || !asset) {
    serverLogger.error(
      {
        event: 'split_audio.asset_not_found',
        userId: user.id,
        assetId,
        error: assetError,
      },
      'Asset not found or access denied'
    );
    return forbiddenResponse('Asset not found or access denied');
  }

  if (asset.type !== 'video') {
    serverLogger.warn(
      {
        event: 'split_audio.invalid_asset_type',
        userId: user.id,
        assetId,
        assetType: asset.type,
      },
      'Asset must be a video'
    );
    return validationError('Asset must be a video', 'assetId');
  }

  // Download the video file from Supabase storage
  const { data: videoBlob, error: downloadError } = await supabase.storage
    .from('assets')
    .download(asset.storage_url);

  if (downloadError || !videoBlob) {
    return internalServerError('Failed to download video');
  }

  // Note: In a production environment, you would use FFmpeg here to extract audio
  // For now, we'll use the Web Audio API approach which works for browser environments
  // but won't work server-side. You would typically use a library like fluent-ffmpeg
  // with a worker/queue system for server-side processing.

  // For browser-based extraction (client-side), we'll return instructions
  // to use the File API and Web Audio API in the client

  // This is a placeholder that would typically trigger a background job
  serverLogger.info(
    {
      event: 'split_audio.client_processing_recommended',
      userId: user.id,
      assetId,
      projectId,
    },
    'Recommending client-side audio processing'
  );

  return successResponse({
    message: 'Audio extraction requires client-side processing or a background worker',
    recommendation: 'Use Web Audio API or HTMLMediaElement in the browser',
    assetId,
    videoUrl: asset.metadata?.sourceUrl || asset.storage_url,
  });
};

export const POST = withAuth(handleSplitAudio, {
  route: '/api/video/split-audio',
  rateLimit: RATE_LIMITS.tier2_resource_creation,
});
