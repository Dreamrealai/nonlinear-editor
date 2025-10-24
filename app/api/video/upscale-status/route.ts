import {
  createStatusCheckHandler,
  fetchWithFalTimeout,
  downloadWithTimeout,
  uploadToStorage,
  createAssetWithCleanup,
} from '@/lib/api/statusCheckHandler';
import { v4 as uuid } from 'uuid';
import { serverLogger } from '@/lib/serverLogger';

/**
 * GET /api/video/upscale-status?requestId=xxx&projectId=xxx
 *
 * Checks the status of a video upscale request and saves the result when complete.
 */
export const GET = createStatusCheckHandler(
  async (_request, { user, supabase, params }) => {
    const { requestId, projectId } = params;

    // Verify FAL_API_KEY is configured
    const falKey = process.env['FAL_API_KEY'];
    if (!falKey) {
      throw new Error('FAL_API_KEY not configured on server');
    }

    // Check status with fal.ai
    const statusResponse = await fetchWithFalTimeout(
      `https://queue.fal.run/fal-ai/topaz/upscale/video/requests/${requestId}/status`,
      falKey
    );

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      serverLogger.error(
        {
          errorText,
          requestId,
          status: statusResponse.status,
          event: 'video.upscale_status.check_failed',
        },
        'fal.ai status check failed'
      );
      throw new Error('Failed to check upscale status');
    }

    const statusData = await statusResponse.json();

    // If still processing, return status
    if (statusData.status === 'IN_PROGRESS' || statusData.status === 'IN_QUEUE') {
      return {
        done: false,
        status: statusData.status,
      };
    }

    // If failed, return error
    if (statusData.status === 'FAILED') {
      return {
        done: true,
        error: statusData.error || 'Video upscale failed',
      };
    }

    // If completed, fetch the result
    if (statusData.status === 'COMPLETED') {
      const resultResponse = await fetchWithFalTimeout(
        `https://queue.fal.run/fal-ai/topaz/upscale/video/requests/${requestId}`,
        falKey
      );

      if (!resultResponse.ok) {
        throw new Error('Failed to fetch upscale result');
      }

      const resultData = await resultResponse.json();
      const videoUrl = resultData.video?.url;

      if (!videoUrl) {
        throw new Error('No video URL in result');
      }

      // Download the upscaled video
      const videoBlob = await downloadWithTimeout(videoUrl);

      // Upload to Supabase storage
      const fileName = `upscaled_${Date.now()}.mp4`;
      const storagePath = `${user.id}/${projectId}/${fileName}`;

      await uploadToStorage(supabase, 'assets', storagePath, videoBlob, 'video/mp4');

      const {
        data: { publicUrl },
      } = supabase.storage.from('assets').getPublicUrl(storagePath);

      // Create asset record with automatic cleanup on failure
      const newAsset = await createAssetWithCleanup<{
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
          id: uuid(),
          user_id: user.id,
          project_id: projectId,
          type: 'video',
          source: 'genai',
          storage_url: `supabase://assets/${storagePath}`,
          metadata: {
            filename: fileName,
            mimeType: 'video/mp4',
            sourceUrl: publicUrl,
            provider: 'fal-topaz',
            upscaled: true,
          },
        },
        storagePath
      );

      serverLogger.info(
        {
          requestId,
          projectId,
          assetId: newAsset.id,
          event: 'video.upscale_status.success',
        },
        'Video upscale completed successfully'
      );

      return {
        done: true,
        asset: newAsset,
      };
    }

    // Unknown status
    return {
      done: false,
      status: statusData.status || 'UNKNOWN',
    };
  },
  {
    route: '/api/video/upscale-status',
    requiredParams: ['requestId', 'projectId'],
  }
);
