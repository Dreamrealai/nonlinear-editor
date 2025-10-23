import { NextRequest, NextResponse } from 'next/server';
import { generateVideo } from '@/lib/veo';
import { createServerSupabaseClient } from '@/lib/supabase';

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
    const {
      prompt,
      model,
      aspectRatio,
      duration,
      resolution,
      negativePrompt,
      personGeneration,
      enhancePrompt,
      generateAudio,
      seed,
      sampleCount,
      compressionQuality,
      projectId,
      imageAssetId,
    } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Verify user owns the project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 403 });
    }

    // Fetch image URL if imageAssetId is provided
    let imageUrl: string | undefined;
    if (imageAssetId) {
      const { data: imageAsset, error: imageError } = await supabase
        .from('assets')
        .select('storage_url, user_id')
        .eq('id', imageAssetId)
        .single();

      if (imageError || !imageAsset) {
        return NextResponse.json({ error: 'Image asset not found' }, { status: 404 });
      }

      // Verify user owns the image asset
      if (imageAsset.user_id !== user.id) {
        return NextResponse.json({ error: 'Image asset access denied' }, { status: 403 });
      }

      // Parse storage URL and get public URL
      const storageUrl = imageAsset.storage_url.replace(/^supabase:\/\//, '');
      const [bucket, ...pathParts] = storageUrl.split('/');
      const path = pathParts.join('/');

      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);

      imageUrl = publicUrlData.publicUrl;
    }

    // Start video generation with specified Veo model
    const result = await generateVideo({
      prompt,
      model,
      aspectRatio,
      duration,
      resolution,
      negativePrompt,
      personGeneration,
      enhancePrompt,
      generateAudio,
      seed,
      sampleCount,
      compressionQuality,
      imageUrl,
    });

    return NextResponse.json({
      operationName: result.name,
      status: 'processing',
      message: 'Video generation started. Use the operation name to check status.',
    });
  } catch (error) {
    console.error('Video generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate video' },
      { status: 500 }
    );
  }
}
