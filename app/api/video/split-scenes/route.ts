import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { VideoIntelligenceServiceClient, protos } from '@google-cloud/video-intelligence';

const parseStorageUrl = (storageUrl: string) => {
  const normalized = storageUrl.replace(/^supabase:\/\//, '').replace(/^\/+/, '');
  const [bucket, ...parts] = normalized.split('/');
  if (!bucket || parts.length === 0) {
    return null;
  }
  return { bucket, path: parts.join('/') };
};

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { assetId, projectId } = body;

    if (!assetId) {
      return NextResponse.json({ error: 'Asset ID is required' }, { status: 400 });
    }

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Get the video asset
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select('*')
      .eq('id', assetId)
      .eq('user_id', user.id)
      .single();

    if (assetError || !asset) {
      return NextResponse.json({ error: 'Asset not found or access denied' }, { status: 403 });
    }

    if (asset.type !== 'video') {
      return NextResponse.json({ error: 'Asset must be a video' }, { status: 400 });
    }

    // Check if scenes already exist for this asset
    const { data: existingScenes } = await supabase
      .from('scenes')
      .select('*')
      .eq('asset_id', assetId);

    if (existingScenes && existingScenes.length > 0) {
      return NextResponse.json({
        message: 'Scenes already detected',
        scenes: existingScenes,
        count: existingScenes.length,
      });
    }

    // Get the video URL
    let videoUrl = (asset.metadata as { sourceUrl?: string })?.sourceUrl;
    if (!videoUrl) {
      const location = typeof asset.storage_url === 'string' ? parseStorageUrl(asset.storage_url) : null;
      if (!location) {
        return NextResponse.json({ error: 'Video storage location invalid' }, { status: 400 });
      }

      const { data: signed, error: signError } = await supabase.storage
        .from(location.bucket)
        .createSignedUrl(location.path, 3600);

      if (signError || !signed?.signedUrl) {
        console.error('Failed to create signed URL for scene detection', signError);
        return NextResponse.json({ error: 'Unable to access video for scene detection' }, { status: 502 });
      }

      videoUrl = signed.signedUrl;
    }

    // Check for Google Cloud credentials
    const credentialsJson = process.env.GOOGLE_SERVICE_ACCOUNT;
    if (!credentialsJson) {
      return NextResponse.json(
        {
          error: 'Google Cloud Video Intelligence not configured',
          message: 'GOOGLE_SERVICE_ACCOUNT environment variable is required'
        },
        { status: 503 }
      );
    }

    // Initialize Video Intelligence client
    let credentials;
    try {
      credentials = JSON.parse(credentialsJson);
    } catch (parseError) {
      console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT:', parseError);
      return NextResponse.json(
        {
          error: 'Invalid Google Cloud credentials',
          message: 'GOOGLE_SERVICE_ACCOUNT is not valid JSON'
        },
        { status: 503 }
      );
    }

    const client = new VideoIntelligenceServiceClient({ credentials });

    // Download video content from Supabase
    console.log('Downloading video from Supabase...');
    let videoBuffer: Buffer;
    try {
      const videoResponse = await fetch(videoUrl);
      if (!videoResponse.ok) {
        throw new Error(`Failed to download video: ${videoResponse.statusText}`);
      }

      const arrayBuffer = await videoResponse.arrayBuffer();
      videoBuffer = Buffer.from(arrayBuffer);
      console.log(`Downloaded video: ${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB`);

      // Check file size limit (10MB for Video Intelligence API)
      const maxSizeMB = 10;
      if (videoBuffer.length > maxSizeMB * 1024 * 1024) {
        return NextResponse.json(
          {
            error: 'Video too large for scene detection',
            message: `Video size (${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB) exceeds the ${maxSizeMB} MB limit for direct analysis. Please use a smaller video or contact support.`,
            details: 'The Google Cloud Video Intelligence API has size limitations for direct content analysis.'
          },
          { status: 413 }
        );
      }
    } catch (downloadError) {
      console.error('Failed to download video:', downloadError);
      return NextResponse.json(
        {
          error: 'Video download failed',
          message: downloadError instanceof Error ? downloadError.message : 'Could not download video from storage',
          details: 'Unable to fetch video content from Supabase storage'
        },
        { status: 502 }
      );
    }

    // Perform shot detection using inputContent instead of inputUri
    // Note: inputContent is base64-encoded in the request
    const request = {
      inputContent: videoBuffer.toString('base64'),
      features: [protos.google.cloud.videointelligence.v1.Feature.SHOT_CHANGE_DETECTION],
    };

    console.log('Starting video annotation for shot detection...');
    let results;
    try {
      results = await client.annotateVideo(request);
    } catch (apiError) {
      console.error('Video Intelligence API error:', apiError);
      return NextResponse.json(
        {
          error: 'Video analysis failed',
          message: apiError instanceof Error ? apiError.message : 'Google Cloud Video Intelligence API error',
          details: 'The video format may not be supported or the API credentials may be invalid'
        },
        { status: 502 }
      );
    }

    console.log('Processing video for shot detection...');
    const operation = results[0];
    const operationResult = await operation.promise();
    const shots = operationResult?.[0]?.annotationResults?.[0]?.shotAnnotations || [];

    if (shots.length === 0) {
      return NextResponse.json({
        message: 'No scenes detected in video',
        count: 0,
      });
    }

    console.log(`Detected ${shots.length} shots`);

    // Create scenes in database
    const scenes = [];
    for (const shot of shots) {
      const startMs =
        (Number(shot.startTimeOffset?.seconds || 0) * 1000) +
        ((shot.startTimeOffset?.nanos || 0) / 1e6);
      const endMs =
        (Number(shot.endTimeOffset?.seconds || 0) * 1000) +
        ((shot.endTimeOffset?.nanos || 0) / 1e6);

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
        console.error('Failed to create scene:', sceneError);
        continue;
      }

      scenes.push(scene);
    }

    return NextResponse.json({
      message: `Successfully detected ${scenes.length} scenes`,
      scenes,
      count: scenes.length,
      note: 'Scene frames can be extracted in the Keyframe Editor',
    });
  } catch (error) {
    console.error('Scene split error:', error);

    // Provide detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Failed to split scenes';
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error('Error details:', { message: errorMessage, stack: errorStack });

    return NextResponse.json(
      {
        error: errorMessage,
        details: 'An unexpected error occurred during scene detection. Check server logs for more information.'
      },
      { status: 500 }
    );
  }
}
