/**
 * Template Usage API
 *
 * POST /api/templates/[templateId]/use - Increment usage count when template is used
 */

import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { createServiceSupabaseClient } from '@/lib/supabase';
import { errorResponse, successResponse } from '@/lib/api/response';
import { serverLogger } from '@/lib/serverLogger';

/**
 * POST /api/templates/[templateId]/use
 *
 * Increment template usage count
 */
export const POST = withAuth(async (req, context) => {
  try {
    const { userId, params } = context;
    const templateId = (await params).templateId;

    if (!templateId) {
      return errorResponse('Template ID is required', 400);
    }

    const supabase = await createServerSupabaseClient();

    // Verify template exists and is accessible
    const { data: template, error: fetchError } = await supabase
      .from('project_templates')
      .select('id, user_id, is_public, usage_count')
      .eq('id', templateId)
      .single();

    if (fetchError || !template) {
      return errorResponse('Template not found', 404);
    }

    // Check access: must be public or user's own template
    if (!template.is_public && template.user_id !== userId) {
      return errorResponse('Access denied', 403);
    }

    // Increment usage count
    const { error: updateError } = await supabase.rpc('increment_template_usage_count', {
      template_id: templateId,
    });

    if (updateError) {
      serverLogger.error({ error: updateError, userId, templateId }, 'Failed to increment template usage');
      return errorResponse('Failed to increment template usage', 500);
    }

    serverLogger.info({ userId, templateId, previousCount: template.usage_count }, 'Template usage incremented');
    return successResponse({ message: 'Template usage incremented', usage_count: (template.usage_count || 0) + 1 });
  } catch (error) {
    serverLogger.error({ error }, 'Unexpected error incrementing template usage');
    return errorResponse('Internal server error', 500);
  }
});
