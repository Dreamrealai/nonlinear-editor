import {
  createStatusCheckHandler,
  fetchWithFalTimeout,
  downloadWithTimeout,
  uploadToStorage,
} from '@/lib/api/statusCheckHandler';
import { serverLogger } from '@/lib/serverLogger';

/**
 * GET /api/video/generate-audio-status?requestId=...&projectId=...&assetId=...
 *
 * Checks the status of a video-to-audio generation job.
 */
export const GET = createStatusCheckHandler(
  async (_request, { user, supabase, params }) => {
    const { requestId, projectId, assetId } = params;

    // Verify FAL_API_KEY is configured
    const falKey = process.env['FAL_API_KEY'];
    if (!falKey) {
      throw new Error('FAL_API_KEY not configured on server');
    }

    // Check status with fal.ai
    const statusResponse = await fetchWithFalTimeout(
      `https://queue.fal.run/requests/${requestId}/status`,
      falKey
    );

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      serverLogger.error(
        { errorText, status: statusResponse.status, requestId, userId: user.id },
        'fal.ai status check failed'
      );
      throw new Error('Failed to check generation status');
    }

    const statusData = await statusResponse.json();

    // If completed, fetch the result
    if (statusData.status === 'COMPLETED') {
      const resultResponse = await fetchWithFalTimeout(
        `https://queue.fal.run/requests/${requestId}`,
        falKey
      );

      if (!resultResponse.ok) {
        throw new Error('Failed to fetch generation result');
      }

      const result = await resultResponse.json();
      const audioUrl = result.audio?.url || result.audio_url || result.output?.url;

      if (!audioUrl) {
        throw new Error('No audio URL in result');
      }

      // Download and upload audio to Supabase Storage
      const audioBuffer = await downloadWithTimeout(audioUrl);

      // Upload to Supabase Storage
      const fileName = `video-audio-${Date.now()}.mp3`;
      const filePath = `${user.id}/${projectId}/${fileName}`;

      await uploadToStorage(supabase, 'assets', filePath, audioBuffer, 'audio/mpeg');

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('assets').getPublicUrl(filePath);

      // Get original asset name for reference
      let originalAssetName = 'Video';
      if (assetId) {
        const { data: originalAsset } = await supabase
          .from('assets')
          .select('name')
          .eq('id', assetId)
          .single();

        if (originalAsset) {
          originalAssetName = originalAsset.name;
        }
      }

      // Save asset metadata to database
      const { data: audioAsset, error: assetError } = await supabase
        .from('assets')
        .insert({
          project_id: projectId,
          user_id: user.id,
          type: 'audio',
          name: `Audio from ${originalAssetName}`,
          url: publicUrl,
          storage_path: filePath,
          storage_url: `supabase://assets/${filePath}`,
          metadata: {
            source: 'video-to-audio',
            model: result.model || 'unknown',
            originalAssetId: assetId,
            generatedAt: new Date().toISOString(),
          },
        })
        .select()
        .single();

      if (assetError) {
        serverLogger.error(
          { error: assetError, userId: user.id, projectId, requestId },
          'Database insert error'
        );
        throw new Error('Failed to save audio asset metadata');
      }

      // Update job status in database
      await supabase
        .from('processing_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          result_asset_id: audioAsset.id,
        })
        .eq('provider_job_id', requestId)
        .eq('user_id', user.id);

      return {
        status: 'completed',
        done: true,
        asset: audioAsset,
        audioUrl: publicUrl,
      };
    } else if (statusData.status === 'FAILED' || statusData.status === 'ERROR') {
      // Update job status in database
      await supabase
        .from('processing_jobs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          metadata: {
            error: statusData.error || 'Unknown error',
          },
        })
        .eq('provider_job_id', requestId)
        .eq('user_id', user.id);

      return {
        status: 'failed',
        done: true,
        error: statusData.error || 'Audio generation failed',
      };
    }

    // Still processing
    return {
      status: 'processing',
      done: false,
      progress: statusData.progress || 0,
    };
  },
  {
    route: '/api/video/generate-audio-status',
    requiredParams: ['requestId', 'projectId'],
    optionalParams: ['assetId'],
  }
);
