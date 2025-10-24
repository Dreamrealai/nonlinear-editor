/**
 * Export Preset API (Individual)
 *
 * GET /api/export-presets/[presetId] - Get a single preset
 * PATCH /api/export-presets/[presetId] - Update a custom preset
 * DELETE /api/export-presets/[presetId] - Delete a custom preset
 */

import { withAuth } from '@/lib/api/withAuth';
import { errorResponse, successResponse, validationError } from '@/lib/api/response';
import { serverLogger } from '@/lib/serverLogger';
import { validateUUID, validateString, validateInteger, ValidationError } from '@/lib/validation';
import type { ExportPreset, UpdateExportPresetInput } from '@/types/export';
import { RATE_LIMITS } from '@/lib/rateLimit';

/**
 * GET /api/export-presets/[presetId]
 *
 * Get a single export preset
 */
export const GET = withAuth<{ presetId: string }>(
  async (_req, { user, supabase }, routeContext): Promise<Response> => {
    try {
      const params = await routeContext?.params;
      const presetId = params?.presetId;

      if (!presetId) {
        return errorResponse('Preset ID is required', 400);
      }

      const { data: preset, error } = await supabase
        .from('export_presets')
        .select('*')
        .eq('id', presetId)
        .single();

      if (error || !preset) {
        serverLogger.warn({ error, userId: user.id, presetId }, 'Export preset not found');
        return errorResponse('Export preset not found', 404);
      }

      // Check access: must be platform preset or user's own preset
      if (!preset.is_platform && preset.user_id !== user.id) {
        return errorResponse('Access denied', 403);
      }

      return successResponse({ preset: preset as ExportPreset });
    } catch (error) {
      serverLogger.error({ error }, 'Unexpected error fetching export preset');
      return errorResponse('Internal server error', 500);
    }
  },
  {
    route: '/api/export-presets/[presetId]',
    rateLimit: RATE_LIMITS.tier3_status_read,
  }
);

/**
 * PATCH /api/export-presets/[presetId]
 *
 * Update a custom export preset (platform presets cannot be updated)
 */
export const PATCH = withAuth<{ presetId: string }>(
  async (req, { user, supabase }, routeContext): Promise<Response> => {
    try {
      const params = await routeContext?.params;
      const presetId = params?.presetId;

      // Validate preset ID
      validateUUID(presetId, 'presetId');

      const body: UpdateExportPresetInput = await req.json();

      // Validate optional fields
      if (body.name !== undefined) {
        validateString(body.name, 'name', { minLength: 1, maxLength: 100 });
      }

      if (body.description !== undefined && body.description !== null) {
        validateString(body.description, 'description', { required: false, maxLength: 500 });
      }

      if (body.settings !== undefined) {
        if (!body.settings || typeof body.settings !== 'object') {
          throw new ValidationError('settings must be an object', 'settings', 'INVALID_TYPE');
        }

        if (body.settings.width !== undefined) {
          validateInteger(body.settings.width, 'settings.width', { min: 1, max: 7680 });
        }
        if (body.settings.height !== undefined) {
          validateInteger(body.settings.height, 'settings.height', { min: 1, max: 4320 });
        }
        if (body.settings.fps !== undefined) {
          validateInteger(body.settings.fps, 'settings.fps', { min: 1, max: 120 });
        }
      }

      // Verify preset exists and is owned by user
      const { data: existingPreset, error: fetchError } = await supabase
        .from('export_presets')
        .select('*')
        .eq('id', presetId)
        .single();

      if (fetchError || !existingPreset) {
        return errorResponse('Export preset not found', 404);
      }

      if (existingPreset.user_id !== user.id) {
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
        serverLogger.error(
          { error: updateError, userId: user.id, presetId },
          'Failed to update export preset'
        );
        return errorResponse('Failed to update export preset', 500);
      }

      serverLogger.info({ userId: user.id, presetId }, 'Export preset updated');
      return successResponse({ preset: updatedPreset as ExportPreset });
    } catch (error) {
      if (error instanceof ValidationError) {
        return validationError(error.message);
      }
      serverLogger.error({ error }, 'Unexpected error updating export preset');
      return errorResponse('Internal server error', 500);
    }
  },
  {
    route: '/api/export-presets/[presetId]',
    rateLimit: RATE_LIMITS.tier2_resource_creation,
  }
);

/**
 * DELETE /api/export-presets/[presetId]
 *
 * Delete a custom export preset (platform presets cannot be deleted)
 */
export const DELETE = withAuth<{ presetId: string }>(
  async (_req, { user, supabase }, routeContext): Promise<Response> => {
    try {
      const params = await routeContext?.params;
      const presetId = params?.presetId;

      // Validate preset ID
      validateUUID(presetId, 'presetId');

      // Verify preset exists and is owned by user
      const { data: existingPreset, error: fetchError } = await supabase
        .from('export_presets')
        .select('*')
        .eq('id', presetId)
        .single();

      if (fetchError || !existingPreset) {
        return errorResponse('Export preset not found', 404);
      }

      if (existingPreset.user_id !== user.id) {
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
        serverLogger.error(
          { error: deleteError, userId: user.id, presetId },
          'Failed to delete export preset'
        );
        return errorResponse('Failed to delete export preset', 500);
      }

      serverLogger.info({ userId: user.id, presetId }, 'Export preset deleted');
      return successResponse({ message: 'Export preset deleted successfully' });
    } catch (error) {
      if (error instanceof ValidationError) {
        return validationError(error.message);
      }
      serverLogger.error({ error }, 'Unexpected error deleting export preset');
      return errorResponse('Internal server error', 500);
    }
  },
  {
    route: '/api/export-presets/[presetId]',
    rateLimit: RATE_LIMITS.tier2_resource_creation,
  }
);
