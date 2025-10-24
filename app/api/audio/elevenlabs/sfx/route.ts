import { NextResponse } from 'next/server';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';
import { serverLogger } from '@/lib/serverLogger';
import { validateString, validateUUID } from '@/lib/validation';
import { successResponse } from '@/lib/api/response';
import type { SuccessResponse } from '@/lib/api/response';
import { createGenerationRoute } from '@/lib/api/createGenerationRoute';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Request body for SFX generation
 */
interface SFXGenerateRequest extends Record<string, unknown> {
  prompt: string;
  projectId: string;
  duration?: number;
}

/**
 * Response from SFX generation
 */
interface SFXGenerateResponse {
  asset: {
    id?: string;
    project_id: string;
    user_id: string;
    type: string;
    source: string;
    mime_type: string;
    storage_url: string;
    metadata: Record<string, unknown>;
  };
  url: string;
}

/**
 * Execute SFX generation and store results
 */
async function executeSFXGeneration(options: {
  body: SFXGenerateRequest;
  userId: string;
  projectId: string;
  supabase: SupabaseClient;
}): Promise<SFXGenerateResponse> {
  const { body, userId, projectId, supabase } = options;
  const { prompt, duration = 5.0 } = body;

  // Validate duration
  if (typeof duration !== 'number' || duration < 0.5 || duration > 22) {
    throw new Error('Duration must be between 0.5 and 22 seconds');
  }

  const apiKey = process.env['ELEVENLABS_API_KEY'];
  if (!apiKey) {
    throw new Error('ElevenLabs API key not configured');
  }

  // Call ElevenLabs Sound Generation API with timeout
  let response;
  try {
    response = await fetchWithTimeout('https://api.elevenlabs.io/v1/sound-generation', {
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
      timeout: 60000,
    });

    if (!response.ok) {
      const errorText = await response.text();
      serverLogger.error(
        { errorText, status: response.status, userId, projectId },
        'ElevenLabs SFX API error'
      );
      throw new Error(`ElevenLabs API error: ${response.statusText}`);
    }
  } catch (error) {
    if (error instanceof Error && /timeout/i.test(error.message)) {
      serverLogger.error({ userId, projectId }, 'ElevenLabs SFX timeout');
      throw new Error('SFX generation timeout after 60s');
    }
    throw error;
  }

  // Get the audio data as ArrayBuffer
  const audioBuffer = await response.arrayBuffer();

  // Upload to Supabase Storage
  const fileName = `sfx_${Date.now()}_${prompt.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '-')}.mp3`;
  const filePath = `${userId}/${projectId}/audio/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('assets')
    .upload(filePath, audioBuffer, {
      contentType: 'audio/mpeg',
      upsert: false,
    });

  if (uploadError) {
    serverLogger.error({ error: uploadError, userId, projectId }, 'Supabase upload error');
    throw new Error('Failed to upload audio file');
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from('assets').getPublicUrl(filePath);

  // Save asset metadata to database (align with assets schema)
  const { data: asset, error: assetError } = await supabase
    .from('assets')
    .insert({
      project_id: projectId,
      user_id: userId,
      type: 'audio',
      source: 'genai',
      mime_type: 'audio/mpeg',
      storage_url: `supabase://assets/${filePath}`,
      metadata: {
        filename: fileName,
        mimeType: 'audio/mpeg',
        sourceUrl: publicUrl,
        provider: 'elevenlabs-sfx',
        prompt,
        duration,
        generatedAt: new Date().toISOString(),
      },
    })
    .select()
    .single();

  if (assetError) {
    serverLogger.error({ error: assetError, userId, projectId }, 'Database insert error');
    throw new Error('Failed to save asset metadata');
  }

  return {
    asset,
    url: publicUrl,
  };
}

/**
 * Generate sound effects using ElevenLabs Sound Effects API
 */
export const POST = createGenerationRoute<SFXGenerateRequest, SFXGenerateResponse>({
  routeId: 'audio.sfx',
  rateLimitPrefix: 'audio-sfx',
  validateRequest: (body: Record<string, unknown>): void => {
    validateString(body.prompt as string, 'prompt', { minLength: 3, maxLength: 500 });
    validateUUID(body.projectId as string, 'projectId');
  },
  execute: executeSFXGeneration,
  formatResponse: (result): NextResponse<SFXGenerateResponse | SuccessResponse<SFXGenerateResponse>> => successResponse(result),
});
