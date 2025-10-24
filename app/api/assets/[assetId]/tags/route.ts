/**
 * Asset Tags API Endpoint
 *
 * Manages tags for assets to enable better organization and filtering
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { RATE_LIMITS } from '@/lib/rateLimit';
import { errorResponse, ErrorResponses } from '@/lib/api/errorResponse';
import { HttpStatusCode } from '@/lib/errors/errorCodes';
import { validateUUID, ValidationError } from '@/lib/validation';

interface TagsUpdateBody {
  tags: string[];
}

/**
 * Update asset tags
 * PUT /api/assets/[assetId]/tags
 */
export const PUT = withAuth<{ assetId: string }>(
  async (request, { user, supabase }, routeContext) => {
    try {
      const params = await routeContext!.params;
      const { assetId } = params;

      // Validate assetId
      try {
        validateUUID(assetId, 'assetId');
      } catch (error) {
        if (error instanceof ValidationError) {
          return ErrorResponses.badRequest(error.message);
        }
        throw error;
      }

      // Parse request body
      const body = (await request.json()) as TagsUpdateBody;

      if (!body.tags || !Array.isArray(body.tags)) {
        return ErrorResponses.badRequest('Tags must be an array');
      }

      // Validate tags (max 20 tags, max 50 chars each)
      if (body.tags.length > 20) {
        return ErrorResponses.badRequest('Maximum 20 tags allowed');
      }

      for (const tag of body.tags) {
        if (typeof tag !== 'string' || tag.length === 0 || tag.length > 50) {
          return ErrorResponses.badRequest('Each tag must be 1-50 characters');
        }
      }

      // Sanitize tags (trim whitespace, lowercase)
      const sanitizedTags = body.tags
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag.length > 0);

      // Verify asset exists and user owns it
      const { data: asset, error: fetchError } = await supabase
        .from('assets')
        .select('id, project_id')
        .eq('id', assetId)
        .single();

      if (fetchError || !asset) {
        return errorResponse('Asset not found', HttpStatusCode.NOT_FOUND);
      }

      // Verify user owns the project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id, user_id')
        .eq('id', asset.project_id)
        .single();

      if (projectError || !project || project.user_id !== user.id) {
        return errorResponse('Unauthorized', HttpStatusCode.FORBIDDEN);
      }

      // Update asset tags
      const { error: updateError } = await supabase
        .from('assets')
        .update({ tags: sanitizedTags })
        .eq('id', assetId);

      if (updateError) {
        return errorResponse('Failed to update tags', HttpStatusCode.INTERNAL_SERVER_ERROR);
      }

      return NextResponse.json({
        success: true,
        tags: sanitizedTags,
      });
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : 'Internal server error',
        HttpStatusCode.INTERNAL_SERVER_ERROR
      );
    }
  },
  {
    route: '/api/assets/[assetId]/tags',
    rateLimit: RATE_LIMITS.tier2_resource_creation,
  }
);

/**
 * Toggle favorite status for an asset
 * POST /api/assets/[assetId]/favorite
 */
export const POST = withAuth<{ assetId: string }>(
  async (request, { user, supabase }, routeContext) => {
    try {
      const params = await routeContext!.params;
      const { assetId } = params;

      // Validate assetId
      try {
        validateUUID(assetId, 'assetId');
      } catch (error) {
        if (error instanceof ValidationError) {
          return ErrorResponses.badRequest(error.message);
        }
        throw error;
      }

      // Parse request body
      const body = (await request.json()) as { is_favorite: boolean };

      if (typeof body.is_favorite !== 'boolean') {
        return ErrorResponses.badRequest('is_favorite must be a boolean');
      }

      // Verify asset exists and user owns it
      const { data: asset, error: fetchError } = await supabase
        .from('assets')
        .select('id, project_id')
        .eq('id', assetId)
        .single();

      if (fetchError || !asset) {
        return errorResponse('Asset not found', HttpStatusCode.NOT_FOUND);
      }

      // Verify user owns the project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id, user_id')
        .eq('id', asset.project_id)
        .single();

      if (projectError || !project || project.user_id !== user.id) {
        return errorResponse('Unauthorized', HttpStatusCode.FORBIDDEN);
      }

      // Update favorite status
      const { error: updateError } = await supabase
        .from('assets')
        .update({ is_favorite: body.is_favorite })
        .eq('id', assetId);

      if (updateError) {
        return errorResponse(
          'Failed to update favorite status',
          HttpStatusCode.INTERNAL_SERVER_ERROR
        );
      }

      return NextResponse.json({
        success: true,
        is_favorite: body.is_favorite,
      });
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : 'Internal server error',
        HttpStatusCode.INTERNAL_SERVER_ERROR
      );
    }
  },
  {
    route: '/api/assets/[assetId]/favorite',
    rateLimit: RATE_LIMITS.tier2_resource_creation,
  }
);
