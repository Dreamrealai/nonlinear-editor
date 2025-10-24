/**
 * Project Backups API Routes
 *
 * Endpoints for managing project backups:
 * - GET: List all backups for a project
 * - POST: Create a new backup (manual or auto)
 *
 * @module app/api/projects/[projectId]/backups
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { BackupService } from '@/lib/services/backupService';
import { createServerSupabaseClient } from '@/lib/supabase';
import { errorResponse } from '@/lib/api/response';
import { validateString } from '@/lib/validation';
import { RateLimitTier } from '@/lib/api/rateLimit';
import type { BackupType } from '@/lib/services/backupService';
import type { AssetRow } from '@/types/assets';

/**
 * GET /api/projects/[projectId]/backups
 * List all backups for a project
 */
export const GET = withAuth(
  async (
    _request: NextRequest,
    context: { params: Promise<{ projectId: string }> }
  ): Promise<NextResponse> => {
    const { projectId } = await context.params;
    assertValidString(projectId, 'projectId');

    const supabase = createServerSupabaseClient();
    const backupService = new BackupService(supabase);

    try {
      const backups = await backupService.listBackups(projectId);

      return NextResponse.json({
        success: true,
        backups,
        count: backups.length,
      });
    } catch (error) {
      return errorResponse('Failed to list backups', { error, projectId });
    }
  },
  { tier: RateLimitTier.STANDARD }
);

/**
 * POST /api/projects/[projectId]/backups
 * Create a new backup
 *
 * Body:
 * - backupType: 'auto' | 'manual'
 * - backupName?: string (optional for manual backups)
 */
export const POST = withAuth(
  async (
    request: NextRequest,
    context: { params: Promise<{ projectId: string }> }
  ): Promise<NextResponse> => {
    const { projectId } = await context.params;
    assertValidString(projectId, 'projectId');

    const body = await request.json();
    const backupType = body.backupType as BackupType;
    const backupName = body.backupName as string | undefined;

    // Validate backup type
    if (backupType !== 'auto' && backupType !== 'manual') {
      return errorResponse('Invalid backup type', { backupType }, 400);
    }

    const supabase = createServerSupabaseClient();
    const backupService = new BackupService(supabase);

    try {
      // Get project data
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError || !project) {
        return errorResponse('Project not found', { projectId }, 404);
      }

      // Get timeline data
      const { data: timelineRow, error: timelineError } = await supabase
        .from('timelines')
        .select('timeline_data')
        .eq('project_id', projectId)
        .single();

      if (timelineError || !timelineRow) {
        return errorResponse('Timeline not found', { projectId }, 404);
      }

      // Get assets
      const { data: assets, error: assetsError } = await supabase
        .from('assets')
        .select('*')
        .eq('project_id', projectId);

      if (assetsError) {
        return errorResponse('Failed to fetch assets', { projectId }, 500);
      }

      // Create backup
      const backup = await backupService.createBackup({
        projectId,
        backupType,
        backupName,
        projectData: {
          id: project.id,
          title: project.title,
          user_id: project.user_id,
          created_at: project.created_at,
          updated_at: project.updated_at,
        },
        timelineData: timelineRow.timeline_data,
        assets: (assets || []) as AssetRow[],
      });

      return NextResponse.json({
        success: true,
        backup,
        message: `${backupType === 'auto' ? 'Auto' : 'Manual'} backup created successfully`,
      });
    } catch (error) {
      return errorResponse('Failed to create backup', { error, projectId });
    }
  },
  { tier: RateLimitTier.STANDARD }
);
