import { serverLogger } from '@/lib/serverLogger';
import { validateString, validateUUID, validateBoolean } from '@/lib/validation';
import { successResponse } from '@/lib/api/response';
import { createGenerationRoute } from '@/lib/api/createGenerationRoute';
import { HttpError } from '@/lib/errors/HttpError';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Request body for Suno music generation
 */
interface SunoGenerateRequest extends Record<string, unknown> {
  prompt: string;
  style?: string;
  title?: string;
  customMode?: boolean;
  instrumental?: boolean;
  projectId: string;
}

/**
 * Response from Suno music generation
 */
interface SunoGenerateResponse {
  taskId: string;
  message: string;
}

interface SunoPayload {
  mv: string;
  gpt_description_prompt: string;
  custom_mode?: boolean;
  tags?: string;
  title?: string;
  make_instrumental?: boolean;
}

interface SunoTaskResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
  };
}

/**
 * Execute Suno music generation
 */
async function executeSunoGeneration(options: {
  body: SunoGenerateRequest;
  userId: string;
  projectId: string;
  supabase: SupabaseClient;
}): Promise<SunoGenerateResponse> {
  const { body } = options;
  const { prompt, style, title, customMode = false, instrumental = false } = body;

  const apiKey = process.env['COMET_API_KEY'];
  if (!apiKey) {
    throw new HttpError('Comet API key not configured', 500);
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
      // Preserve the HTTP status code from the external API
      throw new HttpError(error || response.statusText, response.status);
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
      throw new HttpError('Music generation timeout after 60s', 504);
    }
    throw error;
  }

  const result: SunoTaskResponse = await response.json();

  if (result.code !== 200) {
    // Map Comet API error codes to HTTP status codes
    const statusCode = result.code >= 400 && result.code < 600 ? result.code : 500;
    throw new HttpError(
      result.msg ||
        'Music generation failed. Please check your input and try again. If the problem persists, contact support.',
      statusCode
    );
  }

  return {
    taskId: result.data.taskId,
    message: 'Audio generation started',
  };
}

/**
 * Generate music using Suno AI
 */
export const POST = createGenerationRoute<SunoGenerateRequest, SunoGenerateResponse>({
  routeId: 'audio.music',
  rateLimitPrefix: 'audio-music',
  validateRequest: (body: Record<string, unknown>) => {
    validateUUID(body.projectId as string, 'Project ID');
    validateBoolean(body.customMode as boolean, 'Custom mode', { required: false });
    validateBoolean(body.instrumental as boolean, 'Instrumental', { required: false });

    // Validate prompt if not in custom mode
    if (!body.customMode) {
      validateString(body.prompt as string, 'Prompt', { minLength: 3, maxLength: 1000 });
    }

    // Validate style if in custom mode
    if (body.customMode) {
      validateString(body.style as string, 'Style', {
        minLength: 2,
        maxLength: 200,
        required: true,
      });
    }

    // Validate title if provided
    if (body.title) {
      validateString(body.title as string, 'Title', { required: false, maxLength: 100 });
    }
  },
  execute: executeSunoGeneration,
  formatResponse: (result) => successResponse(result),
});
