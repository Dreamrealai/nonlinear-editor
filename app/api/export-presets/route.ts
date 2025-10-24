/**
 * Export Presets API
 *
 * GET /api/export-presets - List all presets (platform + user's custom)
 * POST /api/export-presets - Create a custom preset
 */

import type { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { createServerSupabaseClient } from '@/lib/supabase';
import { errorResponse, successResponse, validationError } from '@/lib/api/response';
import type { ErrorResponse, SuccessResponse } from '@/lib/api/response';
import { serverLogger } from '@/lib/serverLogger';
import { validateString, validateInteger, ValidationError } from '@/lib/validation';
import type { ExportPreset, CreateExportPresetInput } from '@/types/export';

/**
 * GET /api/export-presets
 *
 * List all export presets (platform presets + user's custom presets)
 */
export const GET = withAuth(async (req, context): Promise<NextResponse<ErrorResponse> | NextResponse<{ presets: ExportPreset[]; } | SuccessResponse<{ presets: ExportPreset[]; }>>> => {
  try {
    const { userId } = context;
    const supabase = await createServerSupabaseClient();

    // Fetch all platform presets and user's custom presets
    const { data: presets, error } = await supabase
      .from('export_presets')
      .select('*')
      .or(`is_platform.eq.true,user_id.eq.${userId}`)
      .order('is_platform', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      serverLogger.error({ error, userId }, 'Failed to fetch export presets');
      return errorResponse('Failed to fetch export presets', 500);
    }

    return successResponse({ presets: presets as ExportPreset[] });
  } catch (error) {
    serverLogger.error({ error }, 'Unexpected error fetching export presets');
    return errorResponse('Internal server error', 500);
  }
});

/**
 * POST /api/export-presets
 *
 * Create a new custom export preset
 */
export const POST = withAuth(async (req, context): Promise<NextResponse<ErrorResponse> | NextResponse<{ preset: ExportPreset; } | SuccessResponse<{ preset: ExportPreset; }>>> => {
  try {
    const { userId } = context;
    const body: CreateExportPresetInput = await req.json();

    // Validate input
    validateString(body.name, 'name', { minLength: 1, maxLength: 100 });

    if (!body.settings || typeof body.settings !== 'object') {
      throw new ValidationError('settings is required and must be an object', 'settings', 'INVALID_TYPE');
    }

    validateInteger(body.settings.width, 'settings.width', { required: true, min: 1, max: 7680 });
    validateInteger(body.settings.height, 'settings.height', { required: true, min: 1, max: 4320 });
    validateInteger(body.settings.fps, 'settings.fps', { required: true, min: 1, max: 120 });

    if (body.description !== undefined && body.description !== null) {
      validateString(body.description, 'description', { required: false, maxLength: 500 });
    }

    const supabase = await createServerSupabaseClient();

    // Create custom preset
    const { data: preset, error } = await supabase
      .from('export_presets')
      .insert({
        user_id: userId,
        name: body.name,
        description: body.description || null,
        is_custom: true,
        is_platform: false,
        platform_type: 'custom',
        settings: body.settings,
      })
      .select()
      .single();

    if (error) {
      serverLogger.error({ error, userId, body }, 'Failed to create export preset');
      return errorResponse('Failed to create export preset', 500);
    }

    serverLogger.info({ userId, presetId: preset.id }, 'Export preset created');
    return successResponse({ preset: preset as ExportPreset }, 201);
  } catch (error) {
    if (error instanceof ValidationError) {
      return validationError(error.message);
    }
    serverLogger.error({ error }, 'Unexpected error creating export preset');
    return errorResponse('Internal server error', 500);
  }
});
