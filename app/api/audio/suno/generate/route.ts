import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

interface SunoGenerateRequest {
  prompt: string;
  style?: string;
  title?: string;
  customMode?: boolean;
  instrumental?: boolean;
}

interface SunoTaskResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
  };
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.COMET_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Comet API key not configured' },
        { status: 500 }
      );
    }

    const body: SunoGenerateRequest = await req.json();
    const { prompt, style, title, customMode = false, instrumental = false } = body;

    if (!prompt && !customMode) {
      return NextResponse.json(
        { error: 'Prompt is required for non-custom mode' },
        { status: 400 }
      );
    }

    if (customMode && !style) {
      return NextResponse.json(
        { error: 'Style is required for custom mode' },
        { status: 400 }
      );
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

    // Call Comet API
    const response = await fetch('https://api.cometapi.com/suno/submit/music', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Suno API error:', error);
      return NextResponse.json(
        { error: 'Failed to generate audio with Suno' },
        { status: response.status }
      );
    }

    const result: SunoTaskResponse = await response.json();

    if (result.code !== 200) {
      return NextResponse.json(
        { error: result.msg || 'Failed to generate audio' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      taskId: result.data.taskId,
      message: 'Audio generation started',
    });
  } catch (error) {
    console.error('Error generating audio with Suno:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
