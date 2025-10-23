import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { serverLogger } from '@/lib/serverLogger';

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

    // Download the video file from Supabase storage
    const { data: videoBlob, error: downloadError } = await supabase.storage
      .from('assets')
      .download(asset.storage_url);

    if (downloadError || !videoBlob) {
      return NextResponse.json({ error: 'Failed to download video' }, { status: 500 });
    }

    // Note: In a production environment, you would use FFmpeg here to extract audio
    // For now, we'll use the Web Audio API approach which works for browser environments
    // but won't work server-side. You would typically use a library like fluent-ffmpeg
    // with a worker/queue system for server-side processing.

    // For browser-based extraction (client-side), we'll return instructions
    // to use the File API and Web Audio API in the client

    // This is a placeholder that would typically trigger a background job
    return NextResponse.json({
      message: 'Audio extraction requires client-side processing or a background worker',
      recommendation: 'Use Web Audio API or HTMLMediaElement in the browser',
      assetId,
      videoUrl: asset.metadata?.sourceUrl || asset.storage_url,
    });
  } catch (error) {
    serverLogger.error({ error }, 'Audio split error');
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to split audio' },
      { status: 500 }
    );
  }
}
