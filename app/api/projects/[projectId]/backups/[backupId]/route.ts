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
import { withAuth } from '@/lib/api/withAuth';
import { BackupService } from '@/lib/services/backupService';
import { createServerSupabaseClient } from '@/lib/supabase';
import { errorResponse } from '@/lib/api/response';
import { validateString } from '@/lib/validation';
import { RATE_LIMITS } from '@/lib/rateLimit';

/**
 * GET /api/projects/[projectId]/backups/[backupId]
 * Get backup details (for download)
 */
export const GET = withAuth(
  async (
    _request: NextRequest,
    context: { params: Promise<{ projectId: string; backupId: string }> }
  ): Promise<NextResponse> => {
    const { projectId, backupId } = await context.params;
    assertValidString(projectId, 'projectId');
    assertValidString(backupId, 'backupId');

    const supabase = createServerSupabaseClient();
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
  },
  { tier: RateLimitTier.STANDARD }
);

/**
 * DELETE /api/projects/[projectId]/backups/[backupId]
 * Delete a backup
 */
export const DELETE = withAuth(
  async (
    _request: NextRequest,
    context: { params: Promise<{ projectId: string; backupId: string }> }
  ): Promise<NextResponse> => {
    const { projectId, backupId } = await context.params;
    assertValidString(projectId, 'projectId');
    assertValidString(backupId, 'backupId');

    const supabase = createServerSupabaseClient();
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
  },
  { tier: RateLimitTier.STANDARD }
);
