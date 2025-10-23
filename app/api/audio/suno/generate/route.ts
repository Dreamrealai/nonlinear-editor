import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const runtime = 'edge';

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
  try {
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
