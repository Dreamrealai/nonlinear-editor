import { NextRequest, NextResponse } from 'next/server';
import { generateVideo } from '@/lib/veo';
import { createServerSupabaseClient } from '@/lib/supabase';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit';

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

    // Rate limiting (expensive operation - 5 requests per minute per user)
    const rateLimitResult = checkRateLimit(`video-gen:${user.id}`, RATE_LIMITS.expensive);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.resetAt).toISOString(),
            'Retry-After': Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000).toString(),
          },
        }
      );
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

    // Validate prompt
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    if (prompt.length < 3 || prompt.length > 1000) {
      return NextResponse.json(
        { error: 'Prompt must be between 3 and 1000 characters' },
        { status: 400 }
      );
    }

    // Validate projectId format (UUID)
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID format' }, { status: 400 });
    }

    // Validate aspectRatio
    if (aspectRatio) {
      const validAspectRatios = ['16:9', '9:16', '1:1'];
      if (!validAspectRatios.includes(aspectRatio)) {
        return NextResponse.json(
          { error: 'Invalid aspect ratio. Must be one of: 16:9, 9:16, 1:1' },
          { status: 400 }
        );
      }
    }

    // Validate duration
    if (duration !== undefined) {
      const validDurations = [5, 10];
      if (!validDurations.includes(duration)) {
        return NextResponse.json(
          { error: 'Invalid duration. Must be either 5 or 10 seconds' },
          { status: 400 }
        );
      }
    }

    // Validate seed
    if (seed !== undefined) {
      if (!Number.isInteger(seed) || seed < 0 || seed > 4294967295) {
        return NextResponse.json(
          { error: 'Invalid seed. Must be an integer between 0 and 4294967295' },
          { status: 400 }
        );
      }
    }

    // Validate sampleCount
    if (sampleCount !== undefined) {
      if (!Number.isInteger(sampleCount) || sampleCount < 1 || sampleCount > 4) {
        return NextResponse.json(
          { error: 'Invalid sample count. Must be an integer between 1 and 4' },
          { status: 400 }
        );
      }
    }

    // Validate negativePrompt length
    if (negativePrompt && typeof negativePrompt === 'string') {
      if (negativePrompt.length > 1000) {
        return NextResponse.json(
          { error: 'Negative prompt must not exceed 1000 characters' },
          { status: 400 }
        );
      }
    }

    // Validate imageAssetId format if provided
    if (imageAssetId && !uuidRegex.test(imageAssetId)) {
      return NextResponse.json({ error: 'Invalid image asset ID format' }, { status: 400 });
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
