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
import { withAuth, type AuthContext } from '@/lib/api/withAuth';
import { BackupService } from '@/lib/services/backupService';
import { errorResponse } from '@/lib/api/response';
import { validateString, ValidationError } from '@/lib/validation';
import { RATE_LIMITS } from '@/lib/rateLimit';
import type { BackupType } from '@/lib/services/backupService';
import type { AssetRow } from '@/types/assets';

/**
 * GET /api/projects/[projectId]/backups
 * List all backups for a project
 */
async function handleListBackups(
  _request: NextRequest,
  context: AuthContext,
  routeContext?: { params: Promise<{ projectId: string }> }
): Promise<NextResponse> {
  const { supabase } = context;
  const resolvedParams = await routeContext?.params;

  if (!resolvedParams?.projectId) {
    return errorResponse('Project ID is required', 400);
  }

  const { projectId } = resolvedParams;

  try {
    validateString(projectId, 'projectId');
  } catch (error) {
    if (error instanceof ValidationError) {
      return errorResponse(error.message, 400, error.field, { projectId });
    }
    throw error;
  }

  const backupService = new BackupService(supabase);

  try {
    const backups = await backupService.listBackups(projectId);

    return NextResponse.json({
      success: true,
      backups,
      count: backups.length,
    });
  } catch (error) {
    return errorResponse('Failed to list backups', 500, undefined, { error, projectId });
  }
}

export const GET = withAuth(handleListBackups, {
  route: '/api/projects/[projectId]/backups',
  rateLimit: RATE_LIMITS.tier3_status_read,
});

/**
 * POST /api/projects/[projectId]/backups
 * Create a new backup
 *
 * Body:
 * - backupType: 'auto' | 'manual'
 * - backupName?: string (optional for manual backups)
 */
async function handleCreateBackup(
  request: NextRequest,
  context: AuthContext,
  routeContext?: { params: Promise<{ projectId: string }> }
): Promise<NextResponse> {
  const { supabase } = context;
  const resolvedParams = await routeContext?.params;

  if (!resolvedParams?.projectId) {
    return errorResponse('Project ID is required', 400);
  }

  const { projectId } = resolvedParams;

  try {
    validateString(projectId, 'projectId');
  } catch (error) {
    if (error instanceof ValidationError) {
      return errorResponse(error.message, 400, error.field, { projectId });
    }
    throw error;
  }

  const body = await request.json();
  const backupType = body.backupType as BackupType;
  const backupName = body.backupName as string | undefined;

  // Validate backup type
  if (backupType !== 'auto' && backupType !== 'manual') {
    return errorResponse('Invalid backup type', 400, undefined, { backupType });
  }

  const backupService = new BackupService(supabase);

  try {
    // Get project data
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError) {
      return errorResponse('Project lookup failed', 500, undefined, {
        projectId,
        error: projectError.message,
        code: projectError.code,
      });
    }

    if (!project) {
      return errorResponse('Project not found', 404, undefined, { projectId });
    }

    // Get timeline data
    const { data: timelineRow, error: timelineError } = await supabase
      .from('timelines')
      .select('timeline_data')
      .eq('project_id', projectId)
      .single();

    if (timelineError) {
      return errorResponse('Timeline lookup failed', 500, undefined, {
        projectId,
        error: timelineError.message,
        code: timelineError.code,
      });
    }

    if (!timelineRow) {
      return errorResponse('Timeline not found', 404, undefined, { projectId });
    }

    // Get assets
    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .select('*')
      .eq('project_id', projectId);

    if (assetsError) {
      return errorResponse('Failed to fetch assets', 500, undefined, {
        projectId,
        error: assetsError.message,
        code: assetsError.code,
      });
    }

    // Create backup with retry logic built into service
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
    // Enhanced error logging with more context
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';

    return errorResponse(`Failed to create ${backupType} backup`, 500, undefined, {
      error: errorMsg,
      projectId,
      backupType,
    });
  }
}

export const POST = withAuth(handleCreateBackup, {
  route: '/api/projects/[projectId]/backups',
  rateLimit: RATE_LIMITS.tier3_status_read, // Use tier3 (30/min) to accommodate auto-backups from multiple tabs
});
