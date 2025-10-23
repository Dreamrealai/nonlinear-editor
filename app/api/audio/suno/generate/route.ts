import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit';
import { serverLogger } from '@/lib/serverLogger';

interface SunoGenerateRequest {
  prompt: string;
  style?: string;
  title?: string;
  customMode?: boolean;
  instrumental?: boolean;
  projectId: string;
}

interface SunoTaskResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
  };
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    serverLogger.info({
      event: 'audio.music.request_started',
    }, 'Suno music generation request received');
    const apiKey = process.env.COMET_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Comet API key not configured' },
        { status: 500 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      serverLogger.warn({
        event: 'audio.music.unauthorized',
        error: authError?.message,
      }, 'Unauthorized music generation attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting (expensive operation - 5 requests per minute per user)
    const rateLimitResult = await checkRateLimit(`audio-music:${user.id}`, RATE_LIMITS.expensive);

    if (!rateLimitResult.success) {
      serverLogger.warn({
        event: 'audio.music.rate_limited',
        userId: user.id,
        limit: rateLimitResult.limit,
        remaining: rateLimitResult.remaining,
        resetAt: rateLimitResult.resetAt,
      }, 'Music generation rate limit exceeded');
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
      event: 'audio.music.rate_limit_ok',
      userId: user.id,
      remaining: rateLimitResult.remaining,
    }, 'Rate limit check passed');

    const body: SunoGenerateRequest = await req.json();
    const { prompt, style, title, customMode = false, instrumental = false, projectId } = body;

    // Validate prompt
    if (!prompt && !customMode) {
      return NextResponse.json(
        { error: 'Prompt is required for non-custom mode' },
        { status: 400 }
      );
    }

    if (prompt && typeof prompt === 'string') {
      if (prompt.length < 3 || prompt.length > 1000) {
        return NextResponse.json(
          { error: 'Prompt must be between 3 and 1000 characters' },
          { status: 400 }
        );
      }
    }

    // Validate style
    if (customMode && !style) {
      return NextResponse.json(
        { error: 'Style is required for custom mode' },
        { status: 400 }
      );
    }

    if (style && typeof style === 'string') {
      if (style.length < 2 || style.length > 200) {
        return NextResponse.json(
          { error: 'Style must be between 2 and 200 characters' },
          { status: 400 }
        );
      }
    }

    // Validate title
    if (title && typeof title === 'string') {
      if (title.length > 100) {
        return NextResponse.json(
          { error: 'Title must not exceed 100 characters' },
          { status: 400 }
        );
      }
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

    // Validate customMode is boolean
    if (typeof customMode !== 'boolean') {
      return NextResponse.json(
        { error: 'Custom mode must be a boolean' },
        { status: 400 }
      );
    }

    // Validate instrumental is boolean
    if (typeof instrumental !== 'boolean') {
      return NextResponse.json(
        { error: 'Instrumental must be a boolean' },
        { status: 400 }
      );
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

    // Prepare request payload for Suno V5 (chirp-crow)
    const payload: Record<string, unknown> = {
      mv: 'chirp-crow', // Suno V5
      gpt_description_prompt: prompt,
    };

    if (customMode) {
      payload.custom_mode = true;
      payload.tags = style;
      if (title) payload.title = title;
      if (instrumental) payload.make_instrumental = true;
    }

    // Call Comet API with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    let response;
    try {
      response = await fetch('https://api.cometapi.com/suno/submit/music', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const error = await response.text();
        serverLogger.error({
          event: 'audio.music.api_error',
          status: response.status,
          error,
        }, 'Suno API error');
        return NextResponse.json(
          { error: 'Failed to generate audio with Suno' },
          { status: response.status }
        );
      }
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error && error.name === 'AbortError') {
        serverLogger.error({
          event: 'audio.music.timeout',
        }, 'Suno music generation timeout');
        return NextResponse.json(
          { error: 'Music generation timeout after 60s' },
          { status: 504 }
        );
      }
      throw error;
    }

    const result: SunoTaskResponse = await response.json();

    if (result.code !== 200) {
      return NextResponse.json(
        { error: result.msg || 'Failed to generate audio' },
        { status: 400 }
      );
    }

    const duration = Date.now() - startTime;
    serverLogger.info({
      event: 'audio.music.success',
      userId: user.id,
      projectId,
      taskId: result.data.taskId,
      duration,
    }, `Suno music generation started successfully in ${duration}ms`);

    return NextResponse.json({
      taskId: result.data.taskId,
      message: 'Audio generation started',
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    serverLogger.error({
      event: 'audio.music.error',
      error,
      duration,
    }, 'Error generating audio with Suno');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
