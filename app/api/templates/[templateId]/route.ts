/**
 * Project Template API (Individual)
 *
 * GET /api/templates/[templateId] - Get a single template
 * PATCH /api/templates/[templateId] - Update a template
 * DELETE /api/templates/[templateId] - Delete a template
 * POST /api/templates/[templateId]/use - Increment usage count
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { createServiceSupabaseClient } from '@/lib/supabase';
import { errorResponse, successResponse } from '@/lib/api/response';
import { serverLogger } from '@/lib/serverLogger';
import type { ProjectTemplate, UpdateTemplateInput } from '@/types/template';

/**
 * GET /api/templates/[templateId]
 *
 * Get a single template
 */
export const GET = withAuth(async (req, context) => {
  try {
    const { userId, params } = context;
    const templateId = (await params).templateId;

    if (!templateId) {
      return errorResponse('Template ID is required', 400);
    }

    const supabase = await createServerSupabaseClient();

    const { data: template, error } = await supabase
      .from('project_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (error || !template) {
      serverLogger.warn({ error, userId, templateId }, 'Template not found');
      return errorResponse('Template not found', 404);
    }

    // Check access: must be public or user's own template
    if (!template.is_public && template.user_id !== userId) {
      return errorResponse('Access denied', 403);
    }

    return successResponse({ template: template as ProjectTemplate });
  } catch (error) {
    serverLogger.error({ error }, 'Unexpected error fetching template');
    return errorResponse('Internal server error', 500);
  }
});

/**
 * PATCH /api/templates/[templateId]
 *
 * Update a template (only owner can update)
 */
export const PATCH = withAuth(async (req, context) => {
  try {
    const { userId, params } = context;
    const templateId = (await params).templateId;
    const body: UpdateTemplateInput = await req.json();

    if (!templateId) {
      return errorResponse('Template ID is required', 400);
    }

    const supabase = await createServerSupabaseClient();

    // Verify template exists and is owned by user
    const { data: existingTemplate, error: fetchError } = await supabase
      .from('project_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (fetchError || !existingTemplate) {
      return errorResponse('Template not found', 404);
    }

    if (existingTemplate.user_id !== userId) {
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
        const durationSeconds = body.timeline_data.clips.reduce((max, clip) => {
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
      serverLogger.error({ error: updateError, userId, templateId }, 'Failed to update template');
      return errorResponse('Failed to update template', 500);
    }

    serverLogger.info({ userId, templateId }, 'Template updated');
    return successResponse({ template: updatedTemplate as ProjectTemplate });
  } catch (error) {
    serverLogger.error({ error }, 'Unexpected error updating template');
    return errorResponse('Internal server error', 500);
  }
});

/**
 * DELETE /api/templates/[templateId]
 *
 * Delete a template (only owner can delete)
 */
export const DELETE = withAuth(async (req, context) => {
  try {
    const { userId, params } = context;
    const templateId = (await params).templateId;

    if (!templateId) {
      return errorResponse('Template ID is required', 400);
    }

    const supabase = await createServerSupabaseClient();

    // Verify template exists and is owned by user
    const { data: existingTemplate, error: fetchError } = await supabase
      .from('project_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (fetchError || !existingTemplate) {
      return errorResponse('Template not found', 404);
    }

    if (existingTemplate.user_id !== userId) {
      return errorResponse('Access denied', 403);
    }

    // Delete template
    const { error: deleteError } = await supabase
      .from('project_templates')
      .delete()
      .eq('id', templateId);

    if (deleteError) {
      serverLogger.error({ error: deleteError, userId, templateId }, 'Failed to delete template');
      return errorResponse('Failed to delete template', 500);
    }

    serverLogger.info({ userId, templateId }, 'Template deleted');
    return successResponse({ message: 'Template deleted successfully' });
  } catch (error) {
    serverLogger.error({ error }, 'Unexpected error deleting template');
    return errorResponse('Internal server error', 500);
  }
});
