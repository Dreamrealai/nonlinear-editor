import { NextRequest, NextResponse } from 'next/server';
import { checkOperationStatus } from '@/lib/veo';
import { createServerSupabaseClient } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const operationName = searchParams.get('operationName');
    const projectId = searchParams.get('projectId');

    if (!operationName) {
      return NextResponse.json({ error: 'Operation name is required' }, { status: 400 });
    }

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Check operation status
    const result = await checkOperationStatus(operationName);

    if (result.done && result.response) {
      // Video generation completed - save to Supabase
      const videoUrl = result.response.generatedSamples?.[0]?.video?.url;
      const mimeType = result.response.generatedSamples?.[0]?.video?.mimeType || 'video/mp4';

      if (videoUrl) {
        // Download the video from Google's URL
        const videoResponse = await fetch(videoUrl);
        const videoBuffer = await videoResponse.arrayBuffer();

        // Upload to Supabase storage
        const fileName = `${uuidv4()}.mp4`;
        const storagePath = `${user.id}/${projectId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('assets')
          .upload(storagePath, videoBuffer, {
            contentType: mimeType,
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Storage upload failed: ${uploadError.message}`);
        }

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from('assets').getPublicUrl(storagePath);

        // Create asset record
        const { data: asset, error: assetError } = await supabase
          .from('assets')
          .insert({
            user_id: user.id,
            project_id: projectId,
            type: 'video',
            source: 'genai',
            storage_url: storagePath,
            metadata: {
              filename: fileName,
              mimeType: mimeType,
              sourceUrl: publicUrl,
              generator: 'veo-3-1',
            },
          })
          .select()
          .single();

        if (assetError) {
          throw new Error(`Asset creation failed: ${assetError.message}`);
        }

        return NextResponse.json({
          done: true,
          asset,
          storageUrl: publicUrl,
        });
      }
    }

    // Still processing or error
    return NextResponse.json({
      done: result.done,
      progress: result.metadata?.progressPercentage || 0,
      error: result.error?.message,
    });
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check status' },
      { status: 500 }
    );
  }
}
