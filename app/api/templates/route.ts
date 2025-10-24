/**
 * Project Templates API
 *
 * GET /api/templates - List templates (with filters)
 * POST /api/templates - Create a new template
 */

import { withAuth } from '@/lib/api/withAuth';
import { errorResponse, successResponse, validationError } from '@/lib/api/response';
import { serverLogger } from '@/lib/serverLogger';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { validateString, ValidationError } from '@/lib/validation';
import type { ProjectTemplate, CreateTemplateInput } from '@/types/template';

/**
 * GET /api/templates
 *
 * List project templates with optional filters
 * Query params:
 * - category: Filter by category
 * - tags: Comma-separated list of tags
 * - is_public: Filter by public/private
 * - is_featured: Filter by featured
 * - search: Search in name and description
 * - page: Page number (default: 0)
 * - pageSize: Page size (default: 20, max: 100)
 */
export const GET = withAuth(
  async (req, context) => {
    try {
      const userId = context.user.id;
      const { searchParams } = new URL(req.url);

      // Parse filters
      const category = searchParams.get('category');
      const tags = searchParams.get('tags')?.split(',').filter(Boolean);
      const isPublic = searchParams.get('is_public') === 'true';
      const isFeatured = searchParams.get('is_featured') === 'true';
      const search = searchParams.get('search');
      const page = Math.max(0, parseInt(searchParams.get('page') || '0', 10));
      const pageSize = Math.min(
        100,
        Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10))
      );

      const supabase = await createServerSupabaseClient();

      // Build query
      let query = supabase.from('project_templates').select('*', { count: 'exact' });

      // Apply filters
      // User can see: their own templates + public templates
      query = query.or(`user_id.eq.${userId},is_public.eq.true`);

      if (category) {
        query = query.eq('category', category);
      }

      if (tags && tags.length > 0) {
        query = query.contains('tags', tags);
      }

      if (isPublic) {
        query = query.eq('is_public', true);
      }

      if (isFeatured) {
        query = query.eq('is_featured', true);
      }

      if (search) {
        query = query.textSearch('name', search, {
          type: 'websearch',
          config: 'english',
        });
      }

      // Pagination
      const from = page * pageSize;
      const to = from + pageSize - 1;

      query = query
        .order('is_featured', { ascending: false })
        .order('usage_count', { ascending: false })
        .order('created_at', { ascending: false })
        .range(from, to);

      const { data: templates, error, count } = await query;

      if (error) {
        serverLogger.error({ error, userId }, 'Failed to fetch templates');
        return errorResponse('Failed to fetch templates', 500);
      }

      const totalPages = count ? Math.ceil(count / pageSize) : 0;

      return successResponse({
        templates: templates as ProjectTemplate[],
        total: count || 0,
        page,
        pageSize,
        totalPages,
      });
    } catch (error) {
      serverLogger.error({ error }, 'Unexpected error fetching templates');
      return errorResponse('Internal server error', 500);
    }
  },
  {
    route: '/api/templates',
  }
);

/**
 * POST /api/templates
 *
 * Create a new project template
 */
export const POST = withAuth(
  async (req, context) => {
    try {
      const userId = context.user.id;
      const body: CreateTemplateInput = await req.json();

      // Validate input
      validateString(body.name, 'name', { minLength: 1, maxLength: 100 });
      validateString(body.category, 'category', { minLength: 1, maxLength: 50 });

      if (!body.timeline_data || typeof body.timeline_data !== 'object') {
        throw new ValidationError(
          'timeline_data is required and must be an object',
          'timeline_data',
          'INVALID_TYPE'
        );
      }

      if (body.description !== undefined && body.description !== null) {
        validateString(body.description, 'description', { required: false, maxLength: 1000 });
      }

      if (body.thumbnail_url !== undefined && body.thumbnail_url !== null) {
        validateString(body.thumbnail_url, 'thumbnail_url', { required: false, maxLength: 2048 });
      }

      // Calculate duration from timeline data if not provided
      let durationSeconds = 0;
      if (body.timeline_data.clips && body.timeline_data.clips.length > 0) {
        // Find the maximum end time across all clips
        durationSeconds = body.timeline_data.clips.reduce((max, clip): number => {
          const clipEnd = clip.timelinePosition + (clip.end - clip.start);
          return Math.max(max, clipEnd);
        }, 0);
      }

      const supabase = await createServerSupabaseClient();

      // Create template
      const { data: template, error } = await supabase
        .from('project_templates')
        .insert({
          user_id: userId,
          name: body.name,
          description: body.description || null,
          category: body.category,
          thumbnail_url: body.thumbnail_url || null,
          timeline_data: body.timeline_data,
          is_public: body.is_public ?? false,
          is_featured: false, // Only admins can set featured
          tags: body.tags || [],
          duration_seconds: durationSeconds,
        })
        .select()
        .single();

      if (error) {
        serverLogger.error({ error, userId, body }, 'Failed to create template');
        return errorResponse('Failed to create template', 500);
      }

      serverLogger.info({ userId, templateId: template.id }, 'Template created');
      return successResponse({ template: template as ProjectTemplate }, undefined, 201);
    } catch (error) {
      if (error instanceof ValidationError) {
        return validationError(error.message);
      }
      serverLogger.error({ error }, 'Unexpected error creating template');
      return errorResponse('Internal server error', 500);
    }
  },
  {
    route: '/api/templates',
  }
);
