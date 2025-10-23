import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit';
import { serverLogger } from '@/lib/serverLogger';
import { validateString, validateUUID, validateAll } from '@/lib/api/validation';
import { errorResponse, unauthorizedResponse, validationError, rateLimitResponse, internalServerError } from '@/lib/api/response';
import { verifyProjectOwnership } from '@/lib/api/project-verification';

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
      return internalServerError('Comet API key not configured');
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
      return unauthorizedResponse();
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
      return rateLimitResponse(rateLimitResult.limit, rateLimitResult.remaining, rateLimitResult.resetAt);
    }

    serverLogger.debug({
      event: 'audio.music.rate_limit_ok',
      userId: user.id,
      remaining: rateLimitResult.remaining,
    }, 'Rate limit check passed');

    const body: SunoGenerateRequest = await req.json();
    const { prompt, style, title, customMode = false, instrumental = false, projectId } = body;

    // Validate customMode and instrumental are booleans
    if (typeof customMode !== 'boolean') {
      return validationError('Custom mode must be a boolean', 'customMode');
    }
    if (typeof instrumental !== 'boolean') {
      return validationError('Instrumental must be a boolean', 'instrumental');
    }

    // Build validation array based on customMode
    const validations = [validateUUID(projectId, 'projectId')];

    if (!customMode && prompt) {
      validations.push(validateString(prompt, 'prompt', { minLength: 3, maxLength: 1000 }));
    } else if (!customMode) {
      return validationError('Prompt is required for non-custom mode', 'prompt');
    }

    if (customMode) {
      if (!style) {
        return validationError('Style is required for custom mode', 'style');
      }
      validations.push(validateString(style, 'style', { minLength: 2, maxLength: 200 }));
    }

    if (title) {
      validations.push(validateString(title, 'title', { required: false, maxLength: 100 }));
    }

    const validation = validateAll(validations);
    if (!validation.valid) {
      return validationError(validation.errors[0].message, validation.errors[0].field);
    }

    // Verify project ownership using centralized verification
    const projectVerification = await verifyProjectOwnership(supabase, projectId, user.id, 'user_id');
    if (!projectVerification.hasAccess) {
      return errorResponse(projectVerification.error!, projectVerification.status!);
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
        return errorResponse('Failed to generate audio with Suno', response.status);
      }
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error && error.name === 'AbortError') {
        serverLogger.error({
          event: 'audio.music.timeout',
        }, 'Suno music generation timeout');
        return errorResponse('Music generation timeout after 60s', 504);
      }
      throw error;
    }

    const result: SunoTaskResponse = await response.json();

    if (result.code !== 200) {
      return errorResponse(result.msg || 'Failed to generate audio', 400);
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
    return internalServerError('Internal server error');
  }
}
