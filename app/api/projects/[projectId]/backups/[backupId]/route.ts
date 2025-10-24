/**
 * Individual Backup API Routes
 *
 * Endpoints for managing individual backups:
 * - GET: Get backup details (for download)
 * - DELETE: Delete a backup
 *
 * @module app/api/projects/[projectId]/backups/[backupId]
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/api/withAuth';
import { BackupService } from '@/lib/services/backupService';
import { errorResponse } from '@/lib/api/response';
import { ValidationError } from '@/lib/validation';
import { RATE_LIMITS } from '@/lib/rateLimit';

/**
 * GET /api/projects/[projectId]/backups/[backupId]
 * Get backup details (for download)
 */
async function handleGetBackup(
  _request: NextRequest,
  context: AuthContext,
  routeContext?: { params: Promise<{ projectId: string; backupId: string }> }
): Promise<NextResponse> {
  const { supabase } = context;
  const resolvedParams = await routeContext?.params;

  if (!resolvedParams?.projectId || !resolvedParams?.backupId) {
    return errorResponse('Project ID and Backup ID are required', {}, 400);
  }

  const { projectId, backupId } = resolvedParams;

  try {
    validateString(projectId, 'projectId');
    validateString(backupId, 'backupId');
  } catch (error) {
    if (error instanceof ValidationError) {
      return errorResponse(error.message, { projectId, backupId }, 400);
    }
    throw error;
  }

  const backupService = new BackupService(supabase);

    try {
      const backup = await backupService.getBackup(backupId);

      if (!backup) {
        return errorResponse('Backup not found', { backupId }, 404);
      }

      // Verify backup belongs to project
      if (backup.project_id !== projectId) {
        return errorResponse('Backup does not belong to project', { backupId, projectId }, 403);
      }

      // Return as JSON for download
      const jsonData = backupService.exportBackupAsJSON(backup);

      return new NextResponse(jsonData, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="backup-${backup.backup_name.replace(/[^a-z0-9-]/gi, '-')}.json"`,
        },
      });
    } catch (error) {
      return errorResponse('Failed to get backup', { error, backupId });
    }
}

export const GET = withAuth<{ projectId: string; backupId: string }>(handleGetBackup, { rateLimit: RATE_LIMITS.tier3_status_read });

/**
 * DELETE /api/projects/[projectId]/backups/[backupId]
 * Delete a backup
 */
async function handleDeleteBackup(
  _request: NextRequest,
  context: AuthContext,
  routeContext?: { params: Promise<{ projectId: string; backupId: string }> }
): Promise<NextResponse> {
  const { supabase } = context;
  const resolvedParams = await routeContext?.params;

  if (!resolvedParams?.projectId || !resolvedParams?.backupId) {
    return errorResponse('Project ID and Backup ID are required', {}, 400);
  }

  const { projectId, backupId } = resolvedParams;

  try {
    validateString(projectId, 'projectId');
    validateString(backupId, 'backupId');
  } catch (error) {
    if (error instanceof ValidationError) {
      return errorResponse(error.message, { projectId, backupId }, 400);
    }
    throw error;
  }

  const backupService = new BackupService(supabase);

    try {
      // Verify backup exists and belongs to project
      const backup = await backupService.getBackup(backupId);

      if (!backup) {
        return errorResponse('Backup not found', { backupId }, 404);
      }

      if (backup.project_id !== projectId) {
        return errorResponse('Backup does not belong to project', { backupId, projectId }, 403);
      }

      // Delete backup
      await backupService.deleteBackup(backupId);

      return NextResponse.json({
        success: true,
        message: 'Backup deleted successfully',
      });
    } catch (error) {
      return errorResponse('Failed to delete backup', { error, backupId });
    }
}

export const DELETE = withAuth<{ projectId: string; backupId: string }>(handleDeleteBackup, { rateLimit: RATE_LIMITS.tier2_resource_creation });
