/**
 * Export Preset API (Individual)
 *
 * GET /api/export-presets/[presetId] - Get a single preset
 * PATCH /api/export-presets/[presetId] - Update a custom preset
 * DELETE /api/export-presets/[presetId] - Delete a custom preset
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { createServerSupabaseClient } from '@/lib/supabase';
import { errorResponse, successResponse } from '@/lib/api/response';
import { serverLogger } from '@/lib/serverLogger';
import type { ExportPreset, UpdateExportPresetInput } from '@/types/export';

/**
 * GET /api/export-presets/[presetId]
 *
 * Get a single export preset
 */
export const GET = withAuth(async (req, context) => {
  try {
    const { userId, params } = context;
    const presetId = (await params).presetId;

    if (!presetId) {
      return errorResponse('Preset ID is required', 400);
    }

    const supabase = await createServerSupabaseClient();

    const { data: preset, error } = await supabase
      .from('export_presets')
      .select('*')
      .eq('id', presetId)
      .single();

    if (error || !preset) {
      serverLogger.warn({ error, userId, presetId }, 'Export preset not found');
      return errorResponse('Export preset not found', 404);
    }

    // Check access: must be platform preset or user's own preset
    if (!preset.is_platform && preset.user_id !== userId) {
      return errorResponse('Access denied', 403);
    }

    return successResponse({ preset: preset as ExportPreset });
  } catch (error) {
    serverLogger.error({ error }, 'Unexpected error fetching export preset');
    return errorResponse('Internal server error', 500);
  }
});

/**
 * PATCH /api/export-presets/[presetId]
 *
 * Update a custom export preset (platform presets cannot be updated)
 */
export const PATCH = withAuth(async (req, context) => {
  try {
    const { userId, params } = context;
    const presetId = (await params).presetId;
    const body: UpdateExportPresetInput = await req.json();

    if (!presetId) {
      return errorResponse('Preset ID is required', 400);
    }

    const supabase = await createServerSupabaseClient();

    // Verify preset exists and is owned by user
    const { data: existingPreset, error: fetchError } = await supabase
      .from('export_presets')
      .select('*')
      .eq('id', presetId)
      .single();

    if (fetchError || !existingPreset) {
      return errorResponse('Export preset not found', 404);
    }

    if (existingPreset.user_id !== userId) {
      return errorResponse('Access denied', 403);
    }

    if (existingPreset.is_platform) {
      return errorResponse('Platform presets cannot be modified', 400);
    }

    if (!existingPreset.is_custom) {
      return errorResponse('Only custom presets can be modified', 400);
    }

    // Update preset
    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.settings !== undefined) updateData.settings = body.settings;

    const { data: updatedPreset, error: updateError } = await supabase
      .from('export_presets')
      .update(updateData)
      .eq('id', presetId)
      .select()
      .single();

    if (updateError) {
      serverLogger.error({ error: updateError, userId, presetId }, 'Failed to update export preset');
      return errorResponse('Failed to update export preset', 500);
    }

    serverLogger.info({ userId, presetId }, 'Export preset updated');
    return successResponse({ preset: updatedPreset as ExportPreset });
  } catch (error) {
    serverLogger.error({ error }, 'Unexpected error updating export preset');
    return errorResponse('Internal server error', 500);
  }
});

/**
 * DELETE /api/export-presets/[presetId]
 *
 * Delete a custom export preset (platform presets cannot be deleted)
 */
export const DELETE = withAuth(async (req, context) => {
  try {
    const { userId, params } = context;
    const presetId = (await params).presetId;

    if (!presetId) {
      return errorResponse('Preset ID is required', 400);
    }

    const supabase = await createServerSupabaseClient();

    // Verify preset exists and is owned by user
    const { data: existingPreset, error: fetchError } = await supabase
      .from('export_presets')
      .select('*')
      .eq('id', presetId)
      .single();

    if (fetchError || !existingPreset) {
      return errorResponse('Export preset not found', 404);
    }

    if (existingPreset.user_id !== userId) {
      return errorResponse('Access denied', 403);
    }

    if (existingPreset.is_platform) {
      return errorResponse('Platform presets cannot be deleted', 400);
    }

    if (!existingPreset.is_custom) {
      return errorResponse('Only custom presets can be deleted', 400);
    }

    // Delete preset
    const { error: deleteError } = await supabase
      .from('export_presets')
      .delete()
      .eq('id', presetId);

    if (deleteError) {
      serverLogger.error({ error: deleteError, userId, presetId }, 'Failed to delete export preset');
      return errorResponse('Failed to delete export preset', 500);
    }

    serverLogger.info({ userId, presetId }, 'Export preset deleted');
    return successResponse({ message: 'Export preset deleted successfully' });
  } catch (error) {
    serverLogger.error({ error }, 'Unexpected error deleting export preset');
    return errorResponse('Internal server error', 500);
  }
});
