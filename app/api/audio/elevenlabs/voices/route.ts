import { withAuth } from '@/lib/api/withAuth';
import { RATE_LIMITS } from '@/lib/rateLimit';
import { errorResponse, internalServerError, successResponse } from '@/lib/api/response';
import { serverLogger } from '@/lib/serverLogger';

interface Voice {
  voice_id: string;
  name: string;
  category: string;
  labels: Record<string, string>;
  description?: string;
  preview_url?: string;
}

interface VoicesResponse {
  voices: Voice[];
}

async function handleGetVoices() {
  try {
    const apiKey = process.env['ELEVENLABS_API_KEY'];

    if (!apiKey) {
      return internalServerError('ElevenLabs API key not configured');
    }

    // Call ElevenLabs API to get available voices with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    try {
      const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        method: 'GET',
        headers: {
          'xi-api-key': apiKey,
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const error = await response.text();
        serverLogger.error({ error, status: response.status }, 'ElevenLabs API error');
        return errorResponse('Failed to fetch voices', response.status);
      }

      const result: VoicesResponse = await response.json();

      return successResponse({
        voices: result.voices,
      });
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error && error.name === 'AbortError') {
        serverLogger.error({}, 'ElevenLabs API timeout');
        return errorResponse('Request timeout after 60s', 504);
      }
      throw error;
    }
  } catch (error) {
    serverLogger.error({ error }, 'Error fetching ElevenLabs voices');
    return internalServerError('Internal server error');
  }
}

// Export with authentication and rate limiting
// Rate limit: 30 requests per minute per user
export const GET = withAuth(handleGetVoices, {
  route: '/api/audio/elevenlabs/voices',
  rateLimit: RATE_LIMITS.tier3_status_read, // TIER 3: 30 requests per minute
});
