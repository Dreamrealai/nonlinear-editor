import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit';
import { serverLogger } from '@/lib/serverLogger';

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    serverLogger.debug({
      event: 'audio.sfx.rate_limit_ok',
      userId: user.id,
      remaining: rateLimitResult.remaining,
    }, 'Rate limit check passed');

    const body = await request.json();
    const { projectId, prompt, duration = 5.0 } = body;

    if (!projectId || !prompt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate prompt length
    if (typeof prompt !== 'string' || prompt.length < 3 || prompt.length > 500) {
      return NextResponse.json({ error: 'Prompt must be between 3 and 500 characters' }, { status: 400 });
    }

    // Validate duration
    if (typeof duration !== 'number' || duration < 0.5 || duration > 22) {
      return NextResponse.json({ error: 'Duration must be between 0.5 and 22 seconds' }, { status: 400 });
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
        return NextResponse.json(
          { error: `ElevenLabs API error: ${response.statusText}` },
          { status: response.status }
        );
      }
    } catch (error) {
      if (error instanceof Error && /timeout/i.test(error.message)) {
        console.error('ElevenLabs SFX timeout');
        return NextResponse.json(
          { error: 'SFX generation timeout after 60s' },
          { status: 504 }
        );
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
      return NextResponse.json({ error: 'Failed to upload audio file' }, { status: 500 });
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
      return NextResponse.json({ error: 'Failed to save asset metadata' }, { status: 500 });
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
