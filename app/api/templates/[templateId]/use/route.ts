/**
 * Template Usage API
 *
 * POST /api/templates/[templateId]/use - Increment usage count when template is used
 */

import { withAuth } from '@/lib/api/withAuth';
import { errorResponse, successResponse, validationError } from '@/lib/api/response';
import { serverLogger } from '@/lib/serverLogger';
import { RATE_LIMITS } from '@/lib/rateLimit';
import { validateUUID, ValidationError } from '@/lib/validation';

/**
 * POST /api/templates/[templateId]/use
 *
 * Increment template usage count
 */
export const POST = withAuth<{ templateId: string }>(
  async (_, { user, supabase }, routeContext) => {
    try {
      const params = await routeContext?.params;
      const templateId = params?.templateId;

      // Validate templateId
      try {
        validateUUID(templateId, 'templateId');
      } catch (error) {
        if (error instanceof ValidationError) {
          return validationError(error.message, error.field);
        }
        throw error;
      }

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
      if (!template.is_public && template.user_id !== user.id) {
        return errorResponse('Access denied', 403);
      }

      // Increment usage count
      const { error: updateError } = await supabase.rpc('increment_template_usage_count', {
        template_id: templateId,
      });

      if (updateError) {
        serverLogger.error(
          { error: updateError, userId: user.id, templateId },
          'Failed to increment template usage'
        );
        return errorResponse('Failed to increment template usage', 500);
      }

      serverLogger.info(
        { userId: user.id, templateId, previousCount: template.usage_count },
        'Template usage incremented'
      );
      return successResponse({
        message: 'Template usage incremented',
        usage_count: (template.usage_count || 0) + 1,
      });
    } catch (error) {
      serverLogger.error({ error }, 'Unexpected error incrementing template usage');
      return errorResponse('Internal server error', 500);
    }
  },
  {
    route: '/api/templates/[templateId]/use',
    rateLimit: RATE_LIMITS.tier2_resource_creation,
  }
);
