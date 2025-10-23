import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const runtime = 'edge';

/**
 * Generate sound effects using ElevenLabs Sound Effects API
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, prompt, duration = 5.0 } = body;

    if (!projectId || !prompt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify user owns the project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found or unauthorized' }, { status: 404 });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'ElevenLabs API key not configured' }, { status: 500 });
    }

    // Call ElevenLabs Sound Generation API
    const response = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: prompt,
        duration_seconds: duration,
        prompt_influence: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs SFX API error:', errorText);
      return NextResponse.json(
        { error: `ElevenLabs API error: ${response.statusText}` },
        { status: response.status }
      );
    }

    // Get the audio data as ArrayBuffer
    const audioBuffer = await response.arrayBuffer();

    // Upload to Supabase Storage
    const fileName = `sfx-${Date.now()}-${prompt.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '-')}.mp3`;
    const filePath = `${user.id}/${projectId}/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('assets')
      .upload(filePath, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: false,
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload audio file' }, { status: 500 });
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('assets').getPublicUrl(filePath);

    // Save asset metadata to database
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .insert({
        project_id: projectId,
        user_id: user.id,
        type: 'audio',
        name: `SFX: ${prompt.substring(0, 50)}`,
        url: publicUrl,
        storage_path: filePath,
        metadata: {
          prompt,
          duration,
          source: 'elevenlabs-sfx',
          generatedAt: new Date().toISOString(),
        },
      })
      .select()
      .single();

    if (assetError) {
      console.error('Database insert error:', assetError);
      return NextResponse.json({ error: 'Failed to save asset metadata' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      asset,
      url: publicUrl,
    });
  } catch (error) {
    console.error('Sound effect generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
