/**
 * Resume Job API Endpoint
 *
 * POST /api/export/queue/[jobId]/resume - Resume a paused job
 */

import { serverLogger } from '@/lib/serverLogger';
import { successResponse, errorResponse, notFoundResponse, validationError } from '@/lib/api/response';
import { withAuth } from '@/lib/api/withAuth';
import type { AuthenticatedHandler } from '@/lib/api/withAuth';
import { RATE_LIMITS } from '@/lib/rateLimit';
import { validateUUID, ValidationError } from '@/lib/validation';

const handleResumeJob: AuthenticatedHandler<{ jobId: string }> = async (request, { user, supabase, params }) => {
  const { jobId } = await params;

  // Validate jobId
  try {
    validateUUID(jobId, 'jobId');
  } catch (error) {
    if (error instanceof ValidationError) {
      return validationError(error.message, error.field);
    }
    throw error;
  }

  try {
    // Verify job exists and user owns it
    const { data: job, error: fetchError } = await supabase
      .from('processing_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .eq('job_type', 'video-export')
      .single();

    if (fetchError || !job) {
      return notFoundResponse('Export job');
    }

    // Can only resume pending jobs (paused state)
    if (job.status !== 'pending') {
      return errorResponse(
        `Cannot resume job with status '${job.status}'. Only pending jobs can be resumed.`,
        400
      );
    }

    // Update job status to processing (resumed state)
    const { error: updateError } = await supabase
      .from('processing_jobs')
      .update({
        status: 'processing',
      })
      .eq('id', jobId);

    if (updateError) {
      serverLogger.error(
        { error: updateError, jobId, userId: user.id },
        'Failed to resume job'
      );
      return errorResponse('Failed to resume job', 500);
    }

    serverLogger.info(
      { jobId, userId: user.id, projectId: job.project_id },
      'Export job resumed'
    );

    return successResponse({
      message: 'Export job resumed successfully',
      jobId,
    });
  } catch (error) {
    serverLogger.error(
      { error, jobId, userId: user.id },
      'Unexpected error resuming job'
    );
    return errorResponse('An unexpected error occurred', 500);
  }
};

export const POST = withAuth(handleResumeJob, {
  route: '/api/export/queue/[jobId]/resume',
  ...(process.env.NODE_ENV === 'test' ? {} : { rateLimit: RATE_LIMITS.tier2_resource_creation }),
});
