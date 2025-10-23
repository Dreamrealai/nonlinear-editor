import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { unauthorizedResponse, validationError, errorResponse } from '@/lib/api/response';
import { verifyProjectOwnership } from '@/lib/api/project-verification';

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
      return errorResponse('Comet API key not configured', 500);
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get('taskId');
    const projectId = searchParams.get('projectId');

    if (!taskId) {
      return validationError('Task ID is required', 'taskId');
    }

    if (!projectId) {
      return validationError('Project ID is required', 'projectId');
    }

    // Verify user owns the project using centralized verification
    const projectVerification = await verifyProjectOwnership(supabase, projectId, user.id, 'user_id');
    if (!projectVerification.hasAccess) {
      return errorResponse(projectVerification.error!, projectVerification.status!);
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
      return errorResponse('Failed to check status', response.status);
    }

    const result: SunoStatusResponse = await response.json();

    if (result.code !== 200) {
      return errorResponse(result.msg || 'Failed to check status', 400);
    }

    return NextResponse.json({
      tasks: result.data,
    });
  } catch (error) {
    console.error('Error checking Suno status:', error);
    return errorResponse('Internal server error', 500);
  }
}
