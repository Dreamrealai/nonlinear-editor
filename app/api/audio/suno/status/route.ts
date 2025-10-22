import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

interface SunoStatusResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
    status: string;
    audioUrl?: string;
    videoUrl?: string;
    imageUrl?: string;
    title?: string;
    prompt?: string;
    tags?: string;
    duration?: number;
  }[];
}

export async function GET(req: NextRequest) {
  try {
    const apiKey = process.env.COMET_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Comet API key not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    // Call Comet API to check status
    const response = await fetch(
      `https://api.cometapi.com/suno/fetch?ids=${taskId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Suno API error:', error);
      return NextResponse.json(
        { error: 'Failed to check status' },
        { status: response.status }
      );
    }

    const result: SunoStatusResponse = await response.json();

    if (result.code !== 200) {
      return NextResponse.json(
        { error: result.msg || 'Failed to check status' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      tasks: result.data,
    });
  } catch (error) {
    console.error('Error checking Suno status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
