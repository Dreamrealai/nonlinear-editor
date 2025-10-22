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
  userId: string;
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
      userId,
    } = body;

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    if (!projectId || !userId) {
      return NextResponse.json(
        { error: 'Project ID and User ID are required' },
        { status: 400 }
      );
    }

    // Call ElevenLabs API
    const response = await fetch(
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
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('ElevenLabs API error:', error);
      return NextResponse.json(
        { error: 'Failed to generate audio with ElevenLabs' },
        { status: response.status }
      );
    }

    // Get the audio data as ArrayBuffer
    const audioData = await response.arrayBuffer();

    // Upload to Supabase Storage
    const supabase = await createServerSupabaseClient();
    const timestamp = Date.now();
    const fileName = `elevenlabs_${timestamp}.mp3`;
    const filePath = `${userId}/${projectId}/audio/${fileName}`;

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

    // Save asset to database
    const { data: assetData, error: assetError } = await supabase
      .from('assets')
      .insert({
        project_id: projectId,
        user_id: userId,
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
