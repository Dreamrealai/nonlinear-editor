import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const runtime = 'edge';

interface ElevenLabsGenerateRequest {
  text: string;
  voiceId?: string;
  modelId?: string;
  stability?: number;
  similarity?: number;
  projectId: string;
  userId?: string; // kept for backward compatibility; ignored in favor of session user
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' },
        { status: 500 }
      );
    }

    const body: ElevenLabsGenerateRequest = await req.json();
    const {
      text,
      voiceId = 'EXAVITQu4vr4xnSDxMaL', // Default voice: Sarah
      modelId = 'eleven_multilingual_v2',
      stability = 0.5,
      similarity = 0.75,
      projectId,
      userId: bodyUserId,
    } = body;

    // Validate text
    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    if (typeof text !== 'string' || text.length < 1 || text.length > 5000) {
      return NextResponse.json(
        { error: 'Text must be between 1 and 5000 characters' },
        { status: 400 }
      );
    }

    // Validate projectId format (UUID)
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID format' }, { status: 400 });
    }

    // Validate voiceId format (alphanumeric)
    if (voiceId && typeof voiceId === 'string') {
      if (!/^[a-zA-Z0-9_-]{1,100}$/.test(voiceId)) {
        return NextResponse.json(
          { error: 'Invalid voice ID format' },
          { status: 400 }
        );
      }
    }

    // Validate stability (0-1)
    if (stability !== undefined) {
      if (typeof stability !== 'number' || stability < 0 || stability > 1) {
        return NextResponse.json(
          { error: 'Stability must be a number between 0 and 1' },
          { status: 400 }
        );
      }
    }

    // Validate similarity (0-1)
    if (similarity !== undefined) {
      if (typeof similarity !== 'number' || similarity < 0 || similarity > 1) {
        return NextResponse.json(
          { error: 'Similarity must be a number between 0 and 1' },
          { status: 400 }
        );
      }
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (bodyUserId && bodyUserId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('user_id')
      .eq('id', projectId)
      .maybeSingle();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Call ElevenLabs API with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    let response;
    try {
      response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text,
            model_id: modelId,
            voice_settings: {
              stability,
              similarity_boost: similarity,
            },
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeout);

      if (!response.ok) {
        const error = await response.text();
        console.error('ElevenLabs API error:', error);
        return NextResponse.json(
          { error: 'Failed to generate audio with ElevenLabs' },
          { status: response.status }
        );
      }
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('ElevenLabs TTS timeout');
        return NextResponse.json(
          { error: 'TTS generation timeout after 60s' },
          { status: 504 }
        );
      }
      throw error;
    }

    // Get the audio data as ArrayBuffer
    const audioData = await response.arrayBuffer();

    const timestamp = Date.now();
    const fileName = `elevenlabs_${timestamp}.mp3`;
    const filePath = `${user.id}/${projectId}/audio/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('assets')
      .upload(filePath, audioData, {
        contentType: 'audio/mpeg',
        upsert: false,
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload audio to storage' },
        { status: 500 }
      );
    }

    const storageUrl = `supabase://assets/${filePath}`;
    const {
      data: { publicUrl },
    } = supabase.storage.from('assets').getPublicUrl(filePath);

    // Save asset to database
    const { data: assetData, error: assetError } = await supabase
      .from('assets')
      .insert({
        project_id: projectId,
        user_id: user.id,
        storage_url: storageUrl,
        type: 'audio',
        source: 'genai',
        mime_type: 'audio/mpeg',
        metadata: {
          filename: fileName,
          provider: 'elevenlabs',
          voiceId,
          modelId,
          text: text.substring(0, 200), // Store first 200 chars
          sourceUrl: publicUrl ?? undefined,
        },
      })
      .select()
      .single();

    if (assetError) {
      console.error('Database error:', assetError);
      return NextResponse.json(
        { error: 'Failed to save asset to database' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      asset: assetData,
      message: 'Audio generated successfully',
    });
  } catch (error) {
    console.error('Error generating audio with ElevenLabs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
