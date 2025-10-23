import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit';
import { serverLogger } from '@/lib/serverLogger';
import { validateString, validateUUID, validateAll } from '@/lib/api/validation';
import { errorResponse, unauthorizedResponse, validationError, rateLimitResponse, internalServerError } from '@/lib/api/response';
import { verifyProjectOwnership } from '@/lib/api/project-verification';

/**
 * Generate sound effects using ElevenLabs Sound Effects API
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    serverLogger.info({
      event: 'audio.sfx.request_started',
    }, 'ElevenLabs SFX request received');

    const supabase = await createServerSupabaseClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      serverLogger.warn({
        event: 'audio.sfx.unauthorized',
      }, 'Unauthorized SFX generation attempt');
      return unauthorizedResponse();
    }

    // Rate limiting (expensive operation - 5 requests per minute per user)
    const rateLimitResult = await checkRateLimit(`audio-sfx:${user.id}`, RATE_LIMITS.expensive);

    if (!rateLimitResult.success) {
      serverLogger.warn({
        event: 'audio.sfx.rate_limited',
        userId: user.id,
        limit: rateLimitResult.limit,
        remaining: rateLimitResult.remaining,
        resetAt: rateLimitResult.resetAt,
      }, 'SFX generation rate limit exceeded');
      return rateLimitResponse(rateLimitResult.limit, rateLimitResult.remaining, rateLimitResult.resetAt);
    }

    serverLogger.debug({
      event: 'audio.sfx.rate_limit_ok',
      userId: user.id,
      remaining: rateLimitResult.remaining,
    }, 'Rate limit check passed');

    const body = await request.json();
    const { projectId, prompt, duration = 5.0 } = body;

    // Validate all inputs using centralized validation
    const validation = validateAll([
      validateString(prompt, 'prompt', { minLength: 3, maxLength: 500 }),
      validateUUID(projectId, 'projectId'),
    ]);

    if (!validation.valid) {
      return validationError(validation.errors[0].message, validation.errors[0].field);
    }

    // Validate duration
    if (typeof duration !== 'number' || duration < 0.5 || duration > 22) {
      return validationError('Duration must be between 0.5 and 22 seconds', 'duration');
    }

    // Verify project ownership using centralized verification
    const projectVerification = await verifyProjectOwnership(supabase, projectId, user.id, 'id');
    if (!projectVerification.hasAccess) {
      return errorResponse(projectVerification.error!, projectVerification.status!);
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return internalServerError('ElevenLabs API key not configured');
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
        console.error('ElevenLabs SFX API error:', errorText);
        return errorResponse(`ElevenLabs API error: ${response.statusText}`, response.status);
      }
    } catch (error) {
      if (error instanceof Error && /timeout/i.test(error.message)) {
        console.error('ElevenLabs SFX timeout');
        return errorResponse('SFX generation timeout after 60s', 504);
      }
      throw error;
    }

    // Get the audio data as ArrayBuffer
    const audioBuffer = await response.arrayBuffer();

    // Upload to Supabase Storage
    const fileName = `sfx_${Date.now()}_${prompt.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '-')}.mp3`;
    const filePath = `${user.id}/${projectId}/audio/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('assets')
      .upload(filePath, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: false,
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return internalServerError('Failed to upload audio file');
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
        user_id: user.id,
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
      console.error('Database insert error:', assetError);
      return internalServerError('Failed to save asset metadata');
    }

    const executionTime = Date.now() - startTime;
    serverLogger.info({
      event: 'audio.sfx.success',
      userId: user.id,
      projectId,
      executionTime,
    }, `ElevenLabs SFX generated successfully in ${executionTime}ms`);

    return NextResponse.json({
      success: true,
      asset,
      url: publicUrl,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    serverLogger.error({
      event: 'audio.sfx.error',
      error,
      duration,
    }, 'Sound effect generation error');
    return internalServerError(error instanceof Error ? error.message : 'Internal server error');
  }
}
