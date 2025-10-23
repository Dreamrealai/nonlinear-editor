import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { VideoIntelligenceServiceClient, protos } from '@google-cloud/video-intelligence';
import { Storage } from '@google-cloud/storage';
import { serverLogger } from '@/lib/serverLogger';

const parseStorageUrl = (storageUrl: string) => {
  // SECURITY: Validate input format
  if (!storageUrl || typeof storageUrl !== 'string') {
    return null;
  }

  const normalized = storageUrl.replace(/^supabase:\/\//, '').replace(/^\/+/, '');
  const [bucket, ...parts] = normalized.split('/');

  if (!bucket || parts.length === 0) {
    return null;
  }

  // SECURITY: Prevent path traversal attacks
  const path = parts.join('/');
  if (path.includes('..') || path.includes('//')) {
    console.error('Path traversal attempt detected:', storageUrl);
    return null;
  }

  return { bucket, path };
};

// Set max duration for Vercel serverless function (10 seconds on hobby, 60 on pro)
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    serverLogger.info('Scene detection request received');
    const supabase = await createServerSupabaseClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      serverLogger.warn({ authError }, 'Unauthorized scene detection attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    serverLogger.info({ userId: user.id }, 'User authenticated for scene detection');

    const body = await req.json();
    const { assetId, projectId } = body;

    // Validate assetId format (UUID)
    if (!assetId) {
      return NextResponse.json({ error: 'Asset ID is required' }, { status: 400 });
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(assetId)) {
      return NextResponse.json({ error: 'Invalid asset ID format' }, { status: 400 });
    }

    // Validate projectId format (UUID)
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    if (!uuidRegex.test(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID format' }, { status: 400 });
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
      serverLogger.error({ assetId, projectId }, 'GOOGLE_SERVICE_ACCOUNT not configured');
      console.warn('Scene detection unavailable: GOOGLE_SERVICE_ACCOUNT not configured');
      return NextResponse.json(
        {
          error: 'Scene detection unavailable',
          message: 'Google Cloud Video Intelligence is not configured on this deployment. Please configure the GOOGLE_SERVICE_ACCOUNT environment variable.',
          details: 'Contact your administrator to enable scene detection features.'
        },
        { status: 503 }
      );
    }

    serverLogger.info({ assetId, projectId }, 'Google Cloud credentials found');

    // Initialize Video Intelligence client
    let credentials;
    try {
      credentials = JSON.parse(credentialsJson);
      serverLogger.info({ projectId: credentials.project_id }, 'Parsed GCP credentials successfully');
    } catch (parseError) {
      serverLogger.error({ parseError, assetId, projectId }, 'Failed to parse GOOGLE_SERVICE_ACCOUNT');
      console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT:', parseError);
      return NextResponse.json(
        {
          error: 'Invalid Google Cloud credentials',
          message: 'GOOGLE_SERVICE_ACCOUNT is not valid JSON'
        },
        { status: 503 }
      );
    }

    // Initialize clients
    const videoClient = new VideoIntelligenceServiceClient({ credentials });
    const storageClient = new Storage({ credentials });

    // Get or create GCS bucket for temporary video processing
    const bucketName = process.env.GCS_BUCKET_NAME || `${credentials.project_id}-video-processing`;
    const bucket = storageClient.bucket(bucketName);

    // Check if bucket exists, create if it doesn't
    try {
      const [exists] = await bucket.exists();
      if (!exists) {
        console.log(`Creating GCS bucket: ${bucketName}`);
        await storageClient.createBucket(bucketName, {
          location: 'US',
          storageClass: 'STANDARD',
        });
        console.log(`Bucket ${bucketName} created successfully`);
      }
    } catch (bucketError) {
      console.error('Bucket check/creation error:', bucketError);
      // Continue anyway - the bucket might exist but we don't have permissions to check
    }

    // Upload video to GCS
    serverLogger.info({ videoUrl: videoUrl.substring(0, 50) + '...', assetId, projectId }, 'Downloading video from Supabase');
    console.log('Downloading video from Supabase...');
    let gcsFilePath: string;
    let gcsFile;

    try {
      const videoResponse = await fetch(videoUrl);
      if (!videoResponse.ok) {
        serverLogger.error({ status: videoResponse.status, statusText: videoResponse.statusText, assetId }, 'Failed to download video from Supabase');
        throw new Error(`Failed to download video: ${videoResponse.statusText}`);
      }

      const arrayBuffer = await videoResponse.arrayBuffer();
      const videoBuffer = Buffer.from(arrayBuffer);
      console.log(`Downloaded video: ${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB`);

      // Generate unique filename for GCS
      const timestamp = Date.now();
      gcsFilePath = `video-analysis/${assetId}-${timestamp}.mp4`;
      gcsFile = bucket.file(gcsFilePath);

      console.log(`Uploading video to GCS: gs://${bucketName}/${gcsFilePath}`);
      await gcsFile.save(videoBuffer, {
        metadata: {
          contentType: 'video/mp4',
          metadata: {
            assetId,
            projectId,
            uploadedAt: new Date().toISOString(),
          },
        },
      });

      serverLogger.info({ gcsFilePath, bucketName, assetId }, 'Video uploaded to GCS successfully');
      console.log('Video uploaded to GCS successfully');
    } catch (uploadError) {
      serverLogger.error({ uploadError, assetId, projectId, bucketName }, 'Failed to upload video to GCS');
      console.error('Failed to upload video to GCS:', uploadError);
      return NextResponse.json(
        {
          error: 'Video upload to GCS failed',
          message: uploadError instanceof Error ? uploadError.message : 'Could not upload video to Google Cloud Storage',
          details: 'Unable to prepare video for analysis. Check GCS bucket permissions.'
        },
        { status: 502 }
      );
    }

    // Perform shot detection using GCS URI (gs://)
    const gcsUri = `gs://${bucketName}/${gcsFilePath}`;
    const request = {
      inputUri: gcsUri,
      features: [protos.google.cloud.videointelligence.v1.Feature.SHOT_CHANGE_DETECTION],
    };

    console.log(`Starting video annotation for shot detection using: ${gcsUri}`);
    let results;
    try {
      // Add timeout to prevent function from hanging (45 seconds)
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Video analysis timed out after 45 seconds')), 45000)
      );

      results = await Promise.race([videoClient.annotateVideo(request), timeoutPromise]);
    } catch (apiError) {
      console.error('Video Intelligence API error:', apiError);

      // Clean up GCS file on error
      try {
        await gcsFile.delete();
        console.log('Cleaned up GCS file after error');
      } catch (deleteError) {
        console.error('Failed to clean up GCS file:', deleteError);
      }

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
      // Clean up GCS file
      try {
        await gcsFile.delete();
        console.log('Cleaned up GCS file (no scenes detected)');
      } catch (deleteError) {
        console.error('Failed to clean up GCS file:', deleteError);
      }

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

    // Clean up GCS file after successful processing
    try {
      await gcsFile.delete();
      console.log('Cleaned up GCS file after successful processing');
    } catch (deleteError) {
      console.error('Failed to clean up GCS file:', deleteError);
      // Don't fail the request if cleanup fails
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
