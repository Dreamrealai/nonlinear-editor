import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { v4 as uuid } from 'uuid';

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
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { assetId, projectId, upscaleFactor = 2, targetFps, h264Output = false } = body;

    if (!assetId || !projectId) {
      return NextResponse.json(
        { error: 'assetId and projectId are required' },
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

    // Verify FAL_KEY is configured
    const falKey = process.env.FAL_KEY;
    if (!falKey) {
      return NextResponse.json(
        { error: 'FAL_KEY not configured on server' },
        { status: 500 }
      );
    }

    // Get public URL for the video
    const storageUrl = asset.storage_url as string;
    const [, bucketPath] = storageUrl.split('://');
    const [bucket, ...pathParts] = bucketPath.split('/');
    const path = pathParts.join('/');

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    if (!urlData?.publicUrl) {
      return NextResponse.json(
        { error: 'Failed to generate public URL for video' },
        { status: 500 }
      );
    }

    // Submit upscale request to fal.ai
    const falResponse = await fetch('https://queue.fal.run/fal-ai/topaz/upscale/video', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_url: urlData.publicUrl,
        upscale_factor: upscaleFactor,
        ...(targetFps && { target_fps: targetFps }),
        ...(h264Output && { H264_output: h264Output }),
      }),
    });

    if (!falResponse.ok) {
      const errorText = await falResponse.text();
      console.error('fal.ai upscale request failed:', errorText);
      return NextResponse.json(
        { error: 'Failed to submit upscale request to fal.ai' },
        { status: 500 }
      );
    }

    const falData = await falResponse.json();
    const requestId = falData.request_id;

    if (!requestId) {
      return NextResponse.json(
        { error: 'No request ID returned from fal.ai' },
        { status: 500 }
      );
    }

    // Return the request ID for polling
    return NextResponse.json({
      requestId,
      message: 'Video upscale request submitted successfully',
    });
  } catch (error) {
    console.error('Error in video upscale:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
