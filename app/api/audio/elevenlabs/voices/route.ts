import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { RATE_LIMITS } from '@/lib/rateLimit';

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
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' },
        { status: 500 }
      );
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
        console.error('ElevenLabs API error:', error);
        return NextResponse.json(
          { error: 'Failed to fetch voices' },
          { status: response.status }
        );
      }

        const result: VoicesResponse = await response.json();

      return NextResponse.json({
        voices: result.voices,
      });
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('ElevenLabs API timeout');
        return NextResponse.json(
          { error: 'Request timeout after 60s' },
          { status: 504 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('Error fetching ElevenLabs voices:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Export with authentication and rate limiting
// Rate limit: 30 requests per minute per user
export const GET = withAuth(handleGetVoices, {
  route: '/api/audio/elevenlabs/voices',
  rateLimit: RATE_LIMITS.moderate, // 30 requests per minute
});
