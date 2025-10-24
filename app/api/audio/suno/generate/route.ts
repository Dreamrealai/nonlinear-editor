import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit';
import { serverLogger } from '@/lib/serverLogger';
import { validateString, validateUUID, validateAll, validateBoolean } from '@/lib/api/validation';
import type { ValidationError } from '@/lib/api/validation';
import {
  errorResponse,
  unauthorizedResponse,
  validationError,
  rateLimitResponse,
  internalServerError,
  withErrorHandling,
  successResponse,
} from '@/lib/api/response';
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

interface SunoPayload {
  mv: string;
  gpt_description_prompt: string;
  custom_mode?: boolean;
  tags?: string;
  title?: string;
  make_instrumental?: boolean;
}

export const POST = withErrorHandling(async (req: NextRequest) => {
  const startTime = Date.now();

  serverLogger.info(
    {
      event: 'audio.music.request_started',
    },
    'Suno music generation request received'
  );
  const apiKey = process.env['COMET_API_KEY'];

  if (!apiKey) {
    return internalServerError('Comet API key not configured');
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    serverLogger.warn(
      {
        event: 'audio.music.unauthorized',
        error: authError?.message,
      },
      'Unauthorized music generation attempt'
    );
    return unauthorizedResponse();
  }

  // Rate limiting (expensive operation - 5 requests per minute per user)
  // TIER 2 RATE LIMITING: Resource creation - music generation (10/min)
  const rateLimitResult = await checkRateLimit(
    `audio-music:${user.id}`,
    RATE_LIMITS.tier2_resource_creation
  );

  if (!rateLimitResult.success) {
    serverLogger.warn(
      {
        event: 'audio.music.rate_limited',
        userId: user.id,
        limit: rateLimitResult.limit,
        remaining: rateLimitResult.remaining,
        resetAt: rateLimitResult.resetAt,
      },
      'Music generation rate limit exceeded'
    );
    return rateLimitResponse(
      rateLimitResult.limit,
      rateLimitResult.remaining,
      rateLimitResult.resetAt
    );
  }

  serverLogger.debug(
    {
      event: 'audio.music.rate_limit_ok',
      userId: user.id,
      remaining: rateLimitResult.remaining,
    },
    'Rate limit check passed'
  );

  const body: SunoGenerateRequest = await req.json();
  const { prompt, style, title, customMode = false, instrumental = false, projectId } = body;

  // Validate all inputs using centralized validation utilities
  try {
    validateAll(() => {
      validateUUID(projectId, 'projectId');
      validateBoolean(customMode, 'customMode');
      validateBoolean(instrumental, 'instrumental');

      if (!customMode) {
        validateString(prompt, 'prompt', { minLength: 3, maxLength: 1000 });
      }

      if (customMode) {
        validateString(style, 'style', { minLength: 2, maxLength: 200 });
      }

      if (title) {
        validateString(title, 'title', { required: false, maxLength: 100 });
      }
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return validationError(error.message, error.field);
    }
    throw error;
  }

  // Verify project ownership using centralized verification
  const projectVerification = await verifyProjectOwnership(supabase, projectId, user.id, 'user_id');
  if (!projectVerification.hasAccess) {
    return errorResponse(projectVerification.error!, projectVerification.status!);
  }

  // Prepare request payload for Suno V5 (chirp-crow)
  const payload: SunoPayload = {
    mv: 'chirp-crow', // Suno V5
    gpt_description_prompt: prompt,
  };

  if (customMode) {
    payload.custom_mode = true;
    if (style) payload.tags = style;
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
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const error = await response.text();
      serverLogger.error(
        {
          event: 'audio.music.api_error',
          status: response.status,
          error,
        },
        'Suno API error'
      );
      return errorResponse(
        'Unable to generate music with Suno AI. The service may be temporarily unavailable or experiencing high demand. Please try again in a few moments.',
        response.status
      );
    }
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === 'AbortError') {
      serverLogger.error(
        {
          event: 'audio.music.timeout',
        },
        'Suno music generation timeout'
      );
      return errorResponse('Music generation timeout after 60s', 504);
    }
    throw error;
  }

  const result: SunoTaskResponse = await response.json();

  if (result.code !== 200) {
    return errorResponse(
      result.msg ||
        'Music generation failed. Please check your input and try again. If the problem persists, contact support.',
      400
    );
  }

  const duration = Date.now() - startTime;
  serverLogger.info(
    {
      event: 'audio.music.success',
      userId: user.id,
      projectId,
      taskId: result.data.taskId,
      duration,
    },
    `Suno music generation started successfully in ${duration}ms`
  );

  return successResponse({
    taskId: result.data.taskId,
    message: 'Audio generation started',
  });
});
