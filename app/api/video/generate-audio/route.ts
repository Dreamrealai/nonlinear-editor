import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

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
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { assetId, projectId, model = 'minimax', prompt } = body;

    if (!assetId || !projectId) {
      return NextResponse.json(
        { error: 'assetId and projectId are required' },
        { status: 400 }
      );
    }

    if (!['minimax', 'mureka-1.5', 'kling-turbo-2.5'].includes(model)) {
      return NextResponse.json(
        { error: 'Invalid model. Must be minimax, mureka-1.5, or kling-turbo-2.5' },
        { status: 400 }
      );
    }

    // Initialize Supabase client
    const supabase = await createServerSupabaseClient();

    // Verify user authentication
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    const falKey = process.env.FAL_API_KEY;
    if (!falKey) {
      return NextResponse.json(
        { error: 'FAL_API_KEY not configured on server' },
        { status: 500 }
      );
    }

    // Get public URL for the video
    let videoUrl = asset.url;

    // If using storage URL, convert to public URL
    if (asset.storage_url) {
      const storageUrl = asset.storage_url as string;
      const [, bucketPath] = storageUrl.split('://');
      const [bucket, ...pathParts] = bucketPath.split('/');
      const path = pathParts.join('/');

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);

      if (urlData?.publicUrl) {
        videoUrl = urlData.publicUrl;
      }
    }

    if (!videoUrl) {
      return NextResponse.json(
        { error: 'Failed to get video URL' },
        { status: 500 }
      );
    }

    // Map model to fal.ai endpoint
    const modelEndpoints: Record<string, string> = {
      'minimax': 'fal-ai/minimax/video-to-audio',
      'mureka-1.5': 'fal-ai/mureka/v1-5',
      'kling-turbo-2.5': 'fal-ai/kling/turbo-2-5/video-to-audio',
    };

    const endpoint = modelEndpoints[model];

    // Submit video-to-audio request to fal.ai
    const falResponse = await fetch(`https://queue.fal.run/${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_url: videoUrl,
        ...(prompt && { prompt }),
      }),
    });

    if (!falResponse.ok) {
      const errorText = await falResponse.text();
      console.error('fal.ai video-to-audio request failed:', errorText);
      return NextResponse.json(
        { error: `Failed to submit video-to-audio request: ${errorText}` },
        { status: falResponse.status }
      );
    }

    const falData = await falResponse.json();

    // Store the request ID for polling
    const requestId = falData.request_id;

    if (!requestId) {
      return NextResponse.json(
        { error: 'No request ID returned from fal.ai' },
        { status: 500 }
      );
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
      console.error('Failed to store job in database:', jobError);
      // Continue anyway - we can still poll using the request_id
    }

    return NextResponse.json({
      success: true,
      requestId,
      jobId: jobData?.id,
      model,
      message: 'Video-to-audio generation started',
    });
  } catch (error) {
    console.error('Video-to-audio generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
