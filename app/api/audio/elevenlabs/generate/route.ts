import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit';
import { serverLogger } from '@/lib/serverLogger';
import { validateString, validateUUID, validateAll } from '@/lib/api/validation';
import { errorResponse, unauthorizedResponse, validationError, rateLimitResponse, internalServerError } from '@/lib/api/response';
import { verifyProjectOwnership } from '@/lib/api/project-verification';

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
  const startTime = Date.now();

  try {
    serverLogger.info({
      event: 'audio.tts.request_started',
    }, 'ElevenLabs TTS request received');
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      return internalServerError('ElevenLabs API key not configured');
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

    // Validate all inputs using centralized validation
    const validation = validateAll([
      validateString(text, 'text', { minLength: 1, maxLength: 5000 }),
      validateUUID(projectId, 'projectId'),
    ]);

    if (!validation.valid) {
      return validationError(validation.errors[0].message, validation.errors[0].field);
    }

    // Validate voiceId format (alphanumeric)
    if (voiceId && typeof voiceId === 'string') {
      if (!/^[a-zA-Z0-9_-]{1,100}$/.test(voiceId)) {
        return validationError('Invalid voice ID format', 'voiceId');
      }
    }

    // Validate stability (0-1)
    if (stability !== undefined) {
      if (typeof stability !== 'number' || stability < 0 || stability > 1) {
        return validationError('Stability must be a number between 0 and 1', 'stability');
      }
    }

    // Validate similarity (0-1)
    if (similarity !== undefined) {
      if (typeof similarity !== 'number' || similarity < 0 || similarity > 1) {
        return validationError('Similarity must be a number between 0 and 1', 'similarity');
      }
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      serverLogger.warn({
        event: 'audio.tts.unauthorized',
        error: authError?.message,
      }, 'Unauthorized TTS generation attempt');
      return unauthorizedResponse();
    }

    // Rate limiting (expensive operation - 5 requests per minute per user)
    const rateLimitResult = await checkRateLimit(`audio-tts:${user.id}`, RATE_LIMITS.expensive);

    if (!rateLimitResult.success) {
      serverLogger.warn({
        event: 'audio.tts.rate_limited',
        userId: user.id,
        limit: rateLimitResult.limit,
        remaining: rateLimitResult.remaining,
        resetAt: rateLimitResult.resetAt,
      }, 'TTS generation rate limit exceeded');
      return rateLimitResponse(rateLimitResult.limit, rateLimitResult.remaining, rateLimitResult.resetAt);
    }

    serverLogger.debug({
      event: 'audio.tts.rate_limit_ok',
      userId: user.id,
      remaining: rateLimitResult.remaining,
    }, 'Rate limit check passed');

    if (bodyUserId && bodyUserId !== user.id) {
      return errorResponse('Forbidden', 403);
    }

    // Verify project ownership using centralized verification
    const projectVerification = await verifyProjectOwnership(supabase, projectId, user.id, 'user_id');
    if (!projectVerification.hasAccess) {
      return errorResponse(projectVerification.error!, projectVerification.status!);
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
        serverLogger.error({
          error,
          status: response.status,
          voiceId,
          modelId,
          event: 'audio.tts.api_error'
        }, 'ElevenLabs API error');
        return errorResponse('Failed to generate audio with ElevenLabs', response.status);
      }
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error && error.name === 'AbortError') {
        serverLogger.error({
          voiceId,
          modelId,
          event: 'audio.tts.timeout'
        }, 'ElevenLabs TTS timeout');
        return errorResponse('TTS generation timeout after 60s', 504);
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
      serverLogger.error({
        uploadError,
        filePath,
        projectId,
        event: 'audio.tts.upload_error'
      }, 'Supabase upload error');
      return internalServerError('Failed to upload audio to storage');
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
      serverLogger.error({
        assetError,
        projectId,
        filePath,
        event: 'audio.tts.db_error'
      }, 'Database error');
      return internalServerError('Failed to save asset to database');
    }

    const duration = Date.now() - startTime;
    serverLogger.info({
      event: 'audio.tts.success',
      userId: user.id,
      projectId,
      duration,
    }, `ElevenLabs TTS generated successfully in ${duration}ms`);

    return NextResponse.json({
      success: true,
      asset: assetData,
      message: 'Audio generated successfully',
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    serverLogger.error({
      event: 'audio.tts.error',
      error,
      duration,
    }, 'Error generating audio with ElevenLabs');
    return internalServerError('Internal server error');
  }
}
