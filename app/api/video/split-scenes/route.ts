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
    const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (!credentialsJson) {
      return NextResponse.json(
        {
          error: 'Google Cloud Video Intelligence not configured',
          message: 'GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable is required'
        },
        { status: 503 }
      );
    }

    // Initialize Video Intelligence client
    const credentials = JSON.parse(credentialsJson);
    const client = new VideoIntelligenceServiceClient({ credentials });

    // Perform shot detection
    const request = {
      inputUri: videoUrl,
      features: [protos.google.cloud.videointelligence.v1.Feature.SHOT_CHANGE_DETECTION],
    };

    const results = await client.annotateVideo(request);
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to split scenes' },
      { status: 500 }
    );
  }
}
