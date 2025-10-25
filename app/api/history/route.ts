import { serverLogger } from '@/lib/serverLogger';
import { RATE_LIMITS } from '@/lib/rateLimit';
import { errorResponse, validationError, successResponse } from '@/lib/api/response';
import { validateInteger, validateEnum, ValidationError } from '@/lib/validation';
import { withAuth } from '@/lib/api/withAuth';
import type { AuthenticatedHandler } from '@/lib/api/withAuth';

export const dynamic = 'force-dynamic';

// GET /api/history - Fetch user's activity history
const handleGetHistory: AuthenticatedHandler = async (request, { user, supabase }): Promise<Response> => {
  // Parse query parameters for pagination
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  // Validate pagination parameters
  try {
    validateInteger(limit, 'limit', { min: 1, max: 100 });
    validateInteger(offset, 'offset', { min: 0 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return validationError(error.message, error.field);
    }
    throw error;
  }

  // Fetch activity history for the user
  const { data: history, error } = await supabase
    .from('user_activity_history')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    serverLogger.error({ error, userId: user.id }, 'Error fetching activity history');
    return errorResponse(
      'Unable to load your activity history. Please refresh the page and try again.',
      500
    );
  }

  return successResponse({ history, count: history?.length || 0 });
};

export const GET = withAuth(handleGetHistory, {
  route: '/api/history',
  rateLimit: RATE_LIMITS.tier3_status_read,
});

// DELETE /api/history - Clear user's activity history
const handleDeleteHistory: AuthenticatedHandler = async (_request, { user, supabase }): Promise<Response> => {
  // Delete all activity history for the user
  const { error } = await supabase.from('user_activity_history').delete().eq('user_id', user.id);

  if (error) {
    serverLogger.error({ error, userId: user.id }, 'Error clearing activity history');
    return errorResponse(
      'Unable to clear your activity history. Please try again or contact support if the problem persists.',
      500
    );
  }

  return successResponse(null, 'Activity history cleared');
};

export const DELETE = withAuth(handleDeleteHistory, {
  route: '/api/history',
  rateLimit: RATE_LIMITS.tier2_resource_creation,
});

const VALID_ACTIVITY_TYPES = [
  'video_generation',
  'audio_generation',
  'image_upload',
  'video_upload',
  'audio_upload',
  'frame_edit',
  'video_upscale',
] as const;

// POST /api/history - Add a new activity entry (for manual logging)
const handleAddHistory: AuthenticatedHandler = async (request, { user, supabase }): Promise<Response> => {
  const body = await request.json();
  const { project_id, activity_type, title, description, model, asset_id, metadata } = body;

  // Validate activity_type
  try {
    validateEnum(activity_type, 'activity_type', VALID_ACTIVITY_TYPES);
  } catch (error) {
    if (error instanceof ValidationError) {
      return validationError(error.message, error.field);
    }
    throw error;
  }

  // Insert activity history entry
  const { data, error } = await supabase
    .from('user_activity_history')
    .insert({
      user_id: user.id,
      project_id,
      activity_type,
      title,
      description,
      model,
      asset_id,
      metadata: metadata || {},
    })
    .select()
    .single();

  if (error) {
    serverLogger.error({ error, userId: user.id }, 'Error adding activity history entry');
    return errorResponse(
      'Unable to record this activity in your history. The activity was completed successfully, but logging failed.',
      500
    );
  }

  return successResponse({ success: true, activity: data });
};

export const POST = withAuth(handleAddHistory, {
  route: '/api/history',
  rateLimit: RATE_LIMITS.tier4_general,
});
