import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { serverLogger } from '@/lib/serverLogger';

/**
 * GET /api/video/generate-audio-status?requestId=...&projectId=...&assetId=...
 *
 * Checks the status of a video-to-audio generation job.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('requestId');
    const projectId = searchParams.get('projectId');
    const assetId = searchParams.get('assetId');

    if (!requestId || !projectId) {
      return NextResponse.json(
        { error: 'requestId and projectId are required' },
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

    // Verify FAL_API_KEY is configured
    const falKey = process.env.FAL_API_KEY;
    if (!falKey) {
      return NextResponse.json(
        { error: 'FAL_API_KEY not configured on server' },
        { status: 500 }
      );
    }

    // Check status with fal.ai with timeout
    const controller1 = new AbortController();
    const timeout1 = setTimeout(() => controller1.abort(), 60000); // 60 second timeout

    let statusResponse;
    try {
      statusResponse = await fetch(`https://queue.fal.run/requests/${requestId}/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Key ${falKey}`,
        },
        signal: controller1.signal,
      });

      clearTimeout(timeout1);

      if (!statusResponse.ok) {
        const errorText = await statusResponse.text();
        serverLogger.error({ errorText, status: statusResponse.status, requestId, userId: user.id }, 'fal.ai status check failed');
        return NextResponse.json(
          { error: 'Failed to check generation status' },
          { status: statusResponse.status }
        );
      }
    } catch (error) {
      clearTimeout(timeout1);
      if (error instanceof Error && error.name === 'AbortError') {
        serverLogger.error({ requestId, userId: user.id }, 'FAL.ai status check timeout');
        return NextResponse.json(
          { error: 'Status check timeout after 60s' },
          { status: 504 }
        );
      }
      throw error;
    }

    const statusData = await statusResponse.json();

    // If completed, fetch the result
    if (statusData.status === 'COMPLETED') {
      const controller2 = new AbortController();
      const timeout2 = setTimeout(() => controller2.abort(), 60000);

      let resultResponse;
      try {
        resultResponse = await fetch(`https://queue.fal.run/requests/${requestId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Key ${falKey}`,
          },
          signal: controller2.signal,
        });

        clearTimeout(timeout2);

        if (!resultResponse.ok) {
          return NextResponse.json(
            { error: 'Failed to fetch generation result' },
            { status: resultResponse.status }
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

      const result = await resultResponse.json();
      const audioUrl = result.audio?.url || result.audio_url || result.output?.url;

      if (!audioUrl) {
        return NextResponse.json(
          { error: 'No audio URL in result' },
          { status: 500 }
        );
      }

      // Download and upload audio to Supabase Storage with timeout
      const controller3 = new AbortController();
      const timeout3 = setTimeout(() => controller3.abort(), 60000);

      let audioResponse;
      try {
        audioResponse = await fetch(audioUrl, {
          signal: controller3.signal,
        });

        clearTimeout(timeout3);

        if (!audioResponse.ok) {
          return NextResponse.json(
            { error: 'Failed to download generated audio' },
            { status: 500 }
          );
        }
      } catch (error) {
        clearTimeout(timeout3);
        if (error instanceof Error && error.name === 'AbortError') {
          return NextResponse.json(
            { error: 'Audio download timeout after 60s' },
            { status: 504 }
          );
        }
        throw error;
      }

      const audioBuffer = await audioResponse.arrayBuffer();

      // Upload to Supabase Storage
      const fileName = `video-audio-${Date.now()}.mp3`;
      const filePath = `${user.id}/${projectId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(filePath, audioBuffer, {
          contentType: 'audio/mpeg',
          upsert: false,
        });

      if (uploadError) {
        serverLogger.error({ error: uploadError, userId: user.id, projectId, requestId }, 'Supabase upload error');
        return NextResponse.json(
          { error: 'Failed to upload audio file' },
          { status: 500 }
        );
      }

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
        serverLogger.error({ error: assetError, userId: user.id, projectId, requestId }, 'Database insert error');
        return NextResponse.json(
          { error: 'Failed to save audio asset metadata' },
          { status: 500 }
        );
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

      return NextResponse.json({
        status: 'completed',
        asset: audioAsset,
        audioUrl: publicUrl,
      });
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

      return NextResponse.json({
        status: 'failed',
        error: statusData.error || 'Audio generation failed',
      });
    }

    // Still processing
    return NextResponse.json({
      status: 'processing',
      progress: statusData.progress || 0,
    });
  } catch (error) {
    serverLogger.error({ error }, 'Video-to-audio status check error');
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
