import { NextResponse } from 'next/server';
import { serverLogger } from '@/lib/serverLogger';
import { withAuth } from '@/lib/api/withAuth';
import type { AuthenticatedHandler } from '@/lib/api/withAuth';
import { RATE_LIMITS } from '@/lib/rateLimit';

/**
 * POST /api/video/generate-audio
 *
 * Generates audio from video using fal.ai video-to-audio models.
 *
 * Request body:
 * - assetId: string - ID of the video asset
 * - projectId: string - ID of the project
 * - model: 'minimax' | 'mureka-1.5' | 'kling-turbo-2.5' - Model to use
 * - prompt?: string - Optional text prompt to guide audio generation
 */
const handleGenerateAudio: AuthenticatedHandler = async (request, { user, supabase }) => {
  const body = await request.json();
  const { assetId, projectId, model = 'minimax', prompt } = body;

  if (!assetId || !projectId) {
    return NextResponse.json({ error: 'assetId and projectId are required' }, { status: 400 });
  }

  if (!['minimax', 'mureka-1.5', 'kling-turbo-2.5'].includes(model)) {
    return NextResponse.json(
      { error: 'Invalid model. Must be minimax, mureka-1.5, or kling-turbo-2.5' },
      { status: 400 }
    );
  }

  // Get the asset from database
  const { data: asset, error: assetError } = await supabase
    .from('assets')
    .select('*')
    .eq('id', assetId)
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .single();

  if (assetError || !asset) {
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
  }

  // Verify FAL_API_KEY is configured
  const falKey = process.env['FAL_API_KEY'];
  if (!falKey) {
    return NextResponse.json({ error: 'FAL_API_KEY not configured on server' }, { status: 500 });
  }

  // Get public URL for the video
  let videoUrl = asset.url;

  // If using storage URL, convert to public URL
  if (asset.storage_url) {
    const storageUrl = asset.storage_url as string;
    const [, bucketPath] = storageUrl.split('://');

    if (!bucketPath) {
      throw new Error('Invalid storage URL format');
    }

    const [bucket, ...pathParts] = bucketPath.split('/');
    const path = pathParts.join('/');

    if (!bucket) {
      throw new Error('Invalid storage URL: missing bucket');
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);

    if (urlData?.publicUrl) {
      videoUrl = urlData.publicUrl;
    }
  }

  if (!videoUrl) {
    return NextResponse.json({ error: 'Failed to get video URL' }, { status: 500 });
  }

  // Map model to fal.ai endpoint
  const modelEndpoints: Record<string, string> = {
    minimax: 'fal-ai/minimax/video-to-audio',
    'mureka-1.5': 'fal-ai/mureka/v1-5',
    'kling-turbo-2.5': 'fal-ai/kling/turbo-2-5/video-to-audio',
  };

  const endpoint = modelEndpoints[model];

  // Submit video-to-audio request to fal.ai with timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000); // 60 second timeout

  let falResponse: Response;
  try {
    falResponse = await fetch(`https://queue.fal.run/${endpoint}`, {
      method: 'POST',
      headers: {
        Authorization: `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_url: videoUrl,
        ...(prompt && { prompt }),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!falResponse.ok) {
      const errorText = await falResponse.text();
      serverLogger.error(
        { errorText, status: falResponse.status, userId: user.id, projectId },
        'fal.ai video-to-audio request failed'
      );
      return NextResponse.json(
        { error: `Failed to submit video-to-audio request: ${errorText}` },
        { status: falResponse.status }
      );
    }
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === 'AbortError') {
      serverLogger.error(
        { userId: user.id, projectId, assetId },
        'FAL.ai video-to-audio submission timeout'
      );
      return NextResponse.json(
        { error: 'Video-to-audio submission timeout after 60s' },
        { status: 504 }
      );
    }
    throw error;
  }

  const falData = (await falResponse.json()) as { request_id?: string };

  // Store the request ID for polling
  const requestId = falData.request_id;

  if (!requestId) {
    return NextResponse.json({ error: 'No request ID returned from fal.ai' }, { status: 500 });
  }

  // Store the job details in the database for tracking
  const { data: jobData, error: jobError } = await supabase
    .from('processing_jobs')
    .insert({
      user_id: user.id,
      project_id: projectId,
      asset_id: assetId,
      job_type: 'video-to-audio',
      status: 'pending',
      provider: 'fal.ai',
      provider_job_id: requestId,
      metadata: {
        model,
        prompt,
        endpoint,
      },
    })
    .select()
    .single();

  if (jobError) {
    serverLogger.error(
      { error: jobError, userId: user.id, projectId, requestId },
      'Failed to store job in database'
    );
    // Continue anyway - we can still poll using the request_id
  }

  return NextResponse.json({
    success: true,
    requestId,
    jobId: jobData?.id,
    model,
    message: 'Video-to-audio generation started',
  });
};

export const POST = withAuth(handleGenerateAudio, {
  route: '/api/video/generate-audio',
  rateLimit: RATE_LIMITS.tier2_resource_creation,
});
