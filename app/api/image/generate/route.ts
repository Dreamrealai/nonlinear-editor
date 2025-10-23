import { NextRequest, NextResponse } from 'next/server';
import { generateImage } from '@/lib/imagen';
import { createServerSupabaseClient } from '@/lib/supabase';
import { v4 as uuid } from 'uuid';

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
      negativePrompt,
      sampleCount,
      seed,
      safetyFilterLevel,
      personGeneration,
      addWatermark,
      language,
      outputMimeType,
      projectId,
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

    // Generate images with Imagen
    const result = await generateImage({
      prompt,
      model,
      aspectRatio,
      negativePrompt,
      sampleCount: sampleCount || 1,
      seed,
      safetyFilterLevel,
      personGeneration,
      addWatermark,
      language,
      outputMimeType,
    });

    // Upload images to Supabase storage and create asset records
    const assets = [];

    for (let i = 0; i < result.predictions.length; i++) {
      const prediction = result.predictions[i];

      // Convert base64 to buffer
      const imageBuffer = Buffer.from(prediction.bytesBase64Encoded, 'base64');

      // Determine file extension based on MIME type
      const extension = prediction.mimeType === 'image/png' ? 'png' : 'jpg';
      const fileName = `imagen_${Date.now()}_${i}.${extension}`;
      const storagePath = `${user.id}/${projectId}/images/${fileName}`;

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(storagePath, imageBuffer, {
          contentType: prediction.mimeType,
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        continue;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('assets')
        .getPublicUrl(storagePath);

      // Create thumbnail (use the image itself as thumbnail)
      const thumbnailDataUrl = `data:${prediction.mimeType};base64,${prediction.bytesBase64Encoded}`;

      // Create asset record
      const { data: newAsset, error: assetError } = await supabase
        .from('assets')
        .insert({
          id: uuid(),
          user_id: user.id,
          project_id: projectId,
          type: 'image',
          source: 'genai',
          storage_url: `supabase://assets/${storagePath}`,
          metadata: {
            filename: fileName,
            mimeType: prediction.mimeType,
            sourceUrl: publicUrl,
            thumbnail: thumbnailDataUrl,
            provider: 'imagen',
            model: model || 'imagen-3.0-generate-001',
            prompt,
            negativePrompt,
            aspectRatio,
            seed,
          },
        })
        .select()
        .single();

      if (assetError) {
        console.error('Asset creation error:', assetError);
        continue;
      }

      assets.push(newAsset);
    }

    return NextResponse.json({
      assets,
      message: `Generated ${assets.length} image(s) successfully`,
    });
  } catch (error) {
    console.error('Image generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate image' },
      { status: 500 }
    );
  }
}
