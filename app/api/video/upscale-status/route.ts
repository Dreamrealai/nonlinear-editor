import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { v4 as uuid } from 'uuid';

/**
 * GET /api/video/upscale-status?requestId=xxx&projectId=xxx
 *
 * Checks the status of a video upscale request and saves the result when complete.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('requestId');
    const projectId = searchParams.get('projectId');

    if (!requestId || !projectId) {
      return NextResponse.json(
        { error: 'requestId and projectId are required' },
        { status: 400 }
      );
    }

    // Verify FAL_API_KEY is configured
    const falKey = process.env.FAL_API_KEY;
    if (!falKey) {
      return NextResponse.json(
        { error: 'FAL_API_KEY not configured on server' },
        { status: 500 }
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

    // Check status with fal.ai with timeout
    const controller1 = new AbortController();
    const timeout1 = setTimeout(() => controller1.abort(), 60000); // 60 second timeout

    let statusResponse;
    try {
      statusResponse = await fetch(
        `https://queue.fal.run/fal-ai/topaz/upscale/video/requests/${requestId}/status`,
        {
          headers: {
            'Authorization': `Key ${falKey}`,
          },
          signal: controller1.signal,
        }
      );

      clearTimeout(timeout1);

      if (!statusResponse.ok) {
        const errorText = await statusResponse.text();
        console.error('fal.ai status check failed:', errorText);
        return NextResponse.json(
          { error: 'Failed to check upscale status' },
          { status: 500 }
        );
      }
    } catch (error) {
      clearTimeout(timeout1);
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('FAL.ai status check timeout');
        return NextResponse.json(
          { error: 'Status check timeout after 60s' },
          { status: 504 }
        );
      }
      throw error;
    }

    const statusData = await statusResponse.json();

    // If still processing, return status
    if (statusData.status === 'IN_PROGRESS' || statusData.status === 'IN_QUEUE') {
      return NextResponse.json({
        done: false,
        status: statusData.status,
      });
    }

    // If failed, return error
    if (statusData.status === 'FAILED') {
      return NextResponse.json({
        done: true,
        error: statusData.error || 'Video upscale failed',
      });
    }

    // If completed, fetch the result
    if (statusData.status === 'COMPLETED') {
      const controller2 = new AbortController();
      const timeout2 = setTimeout(() => controller2.abort(), 60000);

      let resultResponse;
      try {
        resultResponse = await fetch(
          `https://queue.fal.run/fal-ai/topaz/upscale/video/requests/${requestId}`,
          {
            headers: {
              'Authorization': `Key ${falKey}`,
            },
            signal: controller2.signal,
          }
        );

        clearTimeout(timeout2);

        if (!resultResponse.ok) {
          return NextResponse.json(
            { error: 'Failed to fetch upscale result' },
            { status: 500 }
          );
        }
      } catch (error) {
        clearTimeout(timeout2);
        if (error instanceof Error && error.name === 'AbortError') {
          return NextResponse.json(
            { error: 'Result fetch timeout after 60s' },
            { status: 504 }
          );
        }
        throw error;
      }

      const resultData = await resultResponse.json();
      const videoUrl = resultData.video?.url;

      if (!videoUrl) {
        return NextResponse.json(
          { error: 'No video URL in result' },
          { status: 500 }
        );
      }

      // Download the upscaled video with timeout
      const controller3 = new AbortController();
      const timeout3 = setTimeout(() => controller3.abort(), 60000);

      let videoResponse;
      try {
        videoResponse = await fetch(videoUrl, {
          signal: controller3.signal,
        });

        clearTimeout(timeout3);

        if (!videoResponse.ok) {
          return NextResponse.json(
            { error: 'Failed to download upscaled video' },
            { status: 500 }
          );
        }
      } catch (error) {
        clearTimeout(timeout3);
        if (error instanceof Error && error.name === 'AbortError') {
          return NextResponse.json(
            { error: 'Video download timeout after 60s' },
            { status: 504 }
          );
        }
        throw error;
      }

      const videoBlob = await videoResponse.arrayBuffer();

      // Upload to Supabase storage
      const fileName = `upscaled_${Date.now()}.mp4`;
      const storagePath = `${user.id}/${projectId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(storagePath, videoBlob, {
          contentType: 'video/mp4',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return NextResponse.json(
          { error: 'Failed to upload upscaled video' },
          { status: 500 }
        );
      }

      const { data: { publicUrl } } = supabase.storage
        .from('assets')
        .getPublicUrl(storagePath);

      // Create asset record
      const { data: newAsset, error: assetError } = await supabase
        .from('assets')
        .insert({
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
        })
        .select()
        .single();

      if (assetError) {
        console.error('Asset creation error:', assetError);

        // CRITICAL FIX: Clean up uploaded file if database insert fails
        const { error: cleanupError } = await supabase.storage
          .from('assets')
          .remove([storagePath]);

        if (cleanupError) {
          console.error('Failed to clean up storage after DB insert failure:', cleanupError);
          return NextResponse.json(
            { error: `Failed to create asset record: ${assetError.message}. Additionally, failed to clean up storage: ${cleanupError.message}` },
            { status: 500 }
          );
        }

        return NextResponse.json(
          { error: `Failed to create asset record: ${assetError.message}` },
          { status: 500 }
        );
      }

      return NextResponse.json({
        done: true,
        asset: newAsset,
      });
    }

    // Unknown status
    return NextResponse.json({
      done: false,
      status: statusData.status || 'UNKNOWN',
    });
  } catch (error) {
    console.error('Error checking upscale status:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
