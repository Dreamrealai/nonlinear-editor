/**
 * Asset Tags API Endpoint
 *
 * Manages tags for assets to enable better organization and filtering
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { RATE_LIMITS } from '@/lib/rateLimit';
import { errorResponse } from '@/lib/api/errorResponse';
import { HttpStatusCode } from '@/lib/errors/errorCodes';

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

      // Parse request body
      const body = (await request.json()) as TagsUpdateBody;

      if (!body.tags || !Array.isArray(body.tags)) {
        return errorResponse('Tags must be an array', HttpStatusCode.BAD_REQUEST);
      }

      // Validate tags (max 20 tags, max 50 chars each)
      if (body.tags.length > 20) {
        return errorResponse('Maximum 20 tags allowed', HttpStatusCode.BAD_REQUEST);
      }

      for (const tag of body.tags) {
        if (typeof tag !== 'string' || tag.length === 0 || tag.length > 50) {
          return errorResponse('Each tag must be 1-50 characters', HttpStatusCode.BAD_REQUEST);
        }
      }

      // Sanitize tags (trim whitespace, lowercase)
      const sanitizedTags = body.tags.map((tag) => tag.trim().toLowerCase()).filter((tag) => tag.length > 0);

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
    rateLimit: RATE_LIMITS.tier3_read,
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

      // Parse request body
      const body = (await request.json()) as { is_favorite: boolean };

      if (typeof body.is_favorite !== 'boolean') {
        return errorResponse('is_favorite must be a boolean', HttpStatusCode.BAD_REQUEST);
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
        return errorResponse('Failed to update favorite status', HttpStatusCode.INTERNAL_SERVER_ERROR);
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
    rateLimit: RATE_LIMITS.tier3_read,
  }
);
