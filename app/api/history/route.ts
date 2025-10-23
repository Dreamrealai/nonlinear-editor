import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { serverLogger } from '@/lib/serverLogger';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit';
import {
  unauthorizedResponse,
  errorResponse,
  validationError,
  successResponse,
  rateLimitResponse
} from '@/lib/api/response';
import { validateInteger, validateEnum, validateAll } from '@/lib/api/validation';

export const dynamic = 'force-dynamic';

// GET /api/history - Fetch user's activity history
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return unauthorizedResponse();
    }

    // TIER 3 RATE LIMITING: Read operations (30/min)
    const rateLimitResult = await checkRateLimit(
      `history-get:${user.id}`,
      RATE_LIMITS.tier3_status_read
    );

    if (!rateLimitResult.success) {
      serverLogger.warn({
        event: 'history.get.rate_limited',
        userId: user.id,
        limit: rateLimitResult.limit,
      }, 'History GET rate limit exceeded');

      return rateLimitResponse(
        rateLimitResult.limit,
        rateLimitResult.remaining,
        rateLimitResult.resetAt
      );
    }

    // Parse query parameters for pagination
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Validate pagination parameters
    const validation = validateAll([
      validateInteger(limit, 'limit', { min: 1, max: 100 }),
      validateInteger(offset, 'offset', { min: 0 }),
    ]);

    if (!validation.valid) {
      return validationError(validation.errors[0].message, validation.errors[0].field);
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
      return errorResponse('Failed to fetch activity history', 500);
    }

    return successResponse({ history, count: history?.length || 0 });
  } catch (error) {
    serverLogger.error({ error }, 'Error in GET /api/history');
    return errorResponse('Internal server error', 500);
  }
}

// DELETE /api/history - Clear user's activity history
export async function DELETE() {
  try {
    const supabase = await createServerSupabaseClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return unauthorizedResponse();
    }

    // Delete all activity history for the user
    const { error } = await supabase
      .from('user_activity_history')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      serverLogger.error({ error, userId: user.id }, 'Error clearing activity history');
      return errorResponse('Failed to clear activity history', 500);
    }

    return successResponse(null, 'Activity history cleared');
  } catch (error) {
    serverLogger.error({ error }, 'Error in DELETE /api/history');
    return errorResponse('Internal server error', 500);
  }
}

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
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const {
      project_id,
      activity_type,
      title,
      description,
      model,
      asset_id,
      metadata,
    } = body;

    // Validate activity_type
    const validation = validateAll([
      validateEnum(activity_type, 'activity_type', VALID_ACTIVITY_TYPES, true),
    ]);

    if (!validation.valid) {
      return validationError(validation.errors[0].message, validation.errors[0].field);
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
      return errorResponse('Failed to add activity history entry', 500);
    }

    return successResponse({ success: true, activity: data });
  } catch (error) {
    serverLogger.error({ error }, 'Error in POST /api/history');
    return errorResponse('Internal server error', 500);
  }
}
