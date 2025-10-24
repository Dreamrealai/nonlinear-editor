/**
 * Backup Restore API Route
 *
 * Endpoint for restoring a project from a backup
 * - POST: Restore project from backup
 *
 * @module app/api/projects/[projectId]/backups/[backupId]/restore
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { BackupService } from '@/lib/services/backupService';
import { createServerSupabaseClient } from '@/lib/supabase';
import { errorResponse } from '@/lib/api/response';
import { validateString } from '@/lib/validation';
import { RateLimitTier } from '@/lib/api/rateLimit';

/**
 * POST /api/projects/[projectId]/backups/[backupId]/restore
 * Restore a project from a backup
 */
export const POST = withAuth(
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
      // Restore the backup
      await backupService.restoreBackup({
        backupId,
        projectId,
      });

      return NextResponse.json({
        success: true,
        message: 'Project restored successfully from backup',
      });
    } catch (error) {
      return errorResponse('Failed to restore backup', { error, backupId, projectId });
    }
  },
  { tier: RateLimitTier.STANDARD }
);
