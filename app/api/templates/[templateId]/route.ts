/**
 * Project Template API (Individual)
 *
 * GET /api/templates/[templateId] - Get a single template
 * PATCH /api/templates/[templateId] - Update a template
 * DELETE /api/templates/[templateId] - Delete a template
 * POST /api/templates/[templateId]/use - Increment usage count
 */

import { withAuth } from '@/lib/api/withAuth';
import { errorResponse, successResponse, validationError } from '@/lib/api/response';
import { serverLogger } from '@/lib/serverLogger';
import { validateUUID, validateString, ValidationError } from '@/lib/validation';
import type { ProjectTemplate, UpdateTemplateInput } from '@/types/template';
import { RATE_LIMITS } from '@/lib/rateLimit';

/**
 * GET /api/templates/[templateId]
 *
 * Get a single template
 */
export const GET = withAuth<{ templateId: string }>(async (req, { user, supabase }, routeContext) => {
  try {
    const params = await routeContext?.params;
    const templateId = params?.templateId;

    if (!templateId) {
      return errorResponse('Template ID is required', 400);
    }

    const { data: template, error } = await supabase
      .from('project_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (error || !template) {
      serverLogger.warn({ error, userId: user.id, templateId }, 'Template not found');
      return errorResponse('Template not found', 404);
    }

    // Check access: must be public or user's own template
    if (!template.is_public && template.user_id !== user.id) {
      return errorResponse('Access denied', 403);
    }

    return successResponse({ template: template as ProjectTemplate });
  } catch (error) {
    serverLogger.error({ error }, 'Unexpected error fetching template');
    return errorResponse('Internal server error', 500);
  }
}, {
  route: '/api/templates/[templateId]',
  rateLimit: RATE_LIMITS.tier2_read,
});

/**
 * PATCH /api/templates/[templateId]
 *
 * Update a template (only owner can update)
 */
export const PATCH = withAuth<{ templateId: string }>(async (req, { user, supabase }, routeContext) => {
  try {
    const params = await routeContext?.params;
    const templateId = params?.templateId;

    // Validate template ID
    validateUUID(templateId, 'templateId');

    const body: UpdateTemplateInput = await req.json();

    // Validate optional fields
    if (body.name !== undefined) {
      validateString(body.name, 'name', { minLength: 1, maxLength: 100 });
    }

    if (body.category !== undefined) {
      validateString(body.category, 'category', { minLength: 1, maxLength: 50 });
    }

    if (body.description !== undefined && body.description !== null) {
      validateString(body.description, 'description', { required: false, maxLength: 1000 });
    }

    if (body.thumbnail_url !== undefined && body.thumbnail_url !== null) {
      validateString(body.thumbnail_url, 'thumbnail_url', { required: false, maxLength: 2048 });
    }

    if (body.timeline_data !== undefined && (typeof body.timeline_data !== 'object' || body.timeline_data === null)) {
      throw new ValidationError('timeline_data must be an object', 'timeline_data', 'INVALID_TYPE');
    }

    // Verify template exists and is owned by user
    const { data: existingTemplate, error: fetchError } = await supabase
      .from('project_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (fetchError || !existingTemplate) {
      return errorResponse('Template not found', 404);
    }

    if (existingTemplate.user_id !== user.id) {
      return errorResponse('Access denied', 403);
    }

    // Update template
    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.thumbnail_url !== undefined) updateData.thumbnail_url = body.thumbnail_url;
    if (body.timeline_data !== undefined) {
      updateData.timeline_data = body.timeline_data;

      // Recalculate duration
      if (body.timeline_data.clips && body.timeline_data.clips.length > 0) {
        const durationSeconds = body.timeline_data.clips.reduce((max, clip): number => {
          const clipEnd = clip.timelinePosition + (clip.end - clip.start);
          return Math.max(max, clipEnd);
        }, 0);
        updateData.duration_seconds = durationSeconds;
      }
    }
    if (body.is_public !== undefined) updateData.is_public = body.is_public;
    if (body.tags !== undefined) updateData.tags = body.tags;

    const { data: updatedTemplate, error: updateError } = await supabase
      .from('project_templates')
      .update(updateData)
      .eq('id', templateId)
      .select()
      .single();

    if (updateError) {
      serverLogger.error({ error: updateError, userId: user.id, templateId }, 'Failed to update template');
      return errorResponse('Failed to update template', 500);
    }

    serverLogger.info({ userId: user.id, templateId }, 'Template updated');
    return successResponse({ template: updatedTemplate as ProjectTemplate });
  } catch (error) {
    if (error instanceof ValidationError) {
      return validationError(error.message);
    }
    serverLogger.error({ error }, 'Unexpected error updating template');
    return errorResponse('Internal server error', 500);
  }
}, {
  route: '/api/templates/[templateId]',
  rateLimit: RATE_LIMITS.tier2_write,
});

/**
 * DELETE /api/templates/[templateId]
 *
 * Delete a template (only owner can delete)
 */
export const DELETE = withAuth<{ templateId: string }>(async (req, { user, supabase }, routeContext) => {
  try {
    const params = await routeContext?.params;
    const templateId = params?.templateId;

    // Validate template ID
    validateUUID(templateId, 'templateId');

    // Verify template exists and is owned by user
    const { data: existingTemplate, error: fetchError } = await supabase
      .from('project_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (fetchError || !existingTemplate) {
      return errorResponse('Template not found', 404);
    }

    if (existingTemplate.user_id !== user.id) {
      return errorResponse('Access denied', 403);
    }

    // Delete template
    const { error: deleteError } = await supabase
      .from('project_templates')
      .delete()
      .eq('id', templateId);

    if (deleteError) {
      serverLogger.error({ error: deleteError, userId: user.id, templateId }, 'Failed to delete template');
      return errorResponse('Failed to delete template', 500);
    }

    serverLogger.info({ userId: user.id, templateId }, 'Template deleted');
    return successResponse({ message: 'Template deleted successfully' });
  } catch (error) {
    if (error instanceof ValidationError) {
      return validationError(error.message);
    }
    serverLogger.error({ error }, 'Unexpected error deleting template');
    return errorResponse('Internal server error', 500);
  }
}, {
  route: '/api/templates/[templateId]',
  rateLimit: RATE_LIMITS.tier2_write,
});
