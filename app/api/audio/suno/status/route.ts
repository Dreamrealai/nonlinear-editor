import {
  validationError,
  errorResponse,
  successResponse,
} from '@/lib/api/response';
import { verifyProjectOwnership } from '@/lib/api/project-verification';
import { serverLogger } from '@/lib/serverLogger';
import { withAuth } from '@/lib/api/withAuth';
import type { AuthenticatedHandler } from '@/lib/api/withAuth';
import { RATE_LIMITS } from '@/lib/rateLimit';
import { validateString, validateUUID, ValidationError } from '@/lib/validation';

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

const handleSunoStatus: AuthenticatedHandler = async (req, { user, supabase }) => {
  const apiKey = process.env['COMET_API_KEY'];

  if (!apiKey) {
    return errorResponse('Comet API key not configured', 500);
  }

  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get('taskId');
  const projectId = searchParams.get('projectId');

  // Validate query parameters
  try {
    validateString(taskId, 'taskId', { minLength: 1 });
    validateUUID(projectId, 'projectId');
  } catch (error) {
    if (error instanceof ValidationError) {
      return validationError(error.message, error.field);
    }
    throw error;
  }

  // Verify user owns the project using centralized verification
  const projectVerification = await verifyProjectOwnership(supabase, projectId, user.id, 'user_id');
  if (!projectVerification.hasAccess) {
    return errorResponse(projectVerification.error!, projectVerification.status!);
  }

  // Call Comet API to check status
  const response = await fetch(`https://api.cometapi.com/suno/fetch?ids=${taskId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    serverLogger.error(
      { error, status: response.status, taskId, userId: user.id },
      'Suno API error'
    );
    return errorResponse(
      'Unable to check music generation status. The service may be temporarily unavailable. Please try again.',
      response.status
    );
  }

  const result: SunoStatusResponse = await response.json();

  if (result.code !== 200) {
    return errorResponse(
      result.msg ||
        'Cannot retrieve music generation status. Please verify your operation ID and try again.',
      400
    );
  }

  return successResponse({
    tasks: result.data,
  });
};

export const GET = withAuth(handleSunoStatus, {
  route: '/api/audio/suno/status',
  rateLimit: RATE_LIMITS.tier3_status_read,
});
