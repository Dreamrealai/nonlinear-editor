/**
 * Individual Job Management API Endpoint
 *
 * DELETE /api/export/queue/[jobId] - Cancel a job
 */

import { serverLogger } from '@/lib/serverLogger';
import { successResponse, errorResponse, notFoundResponse, validationError } from '@/lib/api/response';
import { withAuth } from '@/lib/api/withAuth';
import type { AuthenticatedHandler } from '@/lib/api/withAuth';
import { RATE_LIMITS } from '@/lib/rateLimit';
import { validateUUID, ValidationError } from '@/lib/validation';

const handleCancelJob: AuthenticatedHandler<{ jobId: string }> = async (request, { user, supabase, params }) => {
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

    // Can only cancel pending or processing jobs
    if (job.status !== 'pending' && job.status !== 'processing') {
      return errorResponse(
        `Cannot cancel job with status '${job.status}'. Only pending or processing jobs can be cancelled.`,
        400
      );
    }

    // Update job status to cancelled
    const { error: updateError } = await supabase
      .from('processing_jobs')
      .update({
        status: 'cancelled',
        error_message: 'Cancelled by user',
      })
      .eq('id', jobId);

    if (updateError) {
      serverLogger.error(
        { error: updateError, jobId, userId: user.id },
        'Failed to cancel job'
      );
      return errorResponse('Failed to cancel job', 500);
    }

    serverLogger.info(
      { jobId, userId: user.id, projectId: job.project_id },
      'Export job cancelled'
    );

    return successResponse({
      message: 'Export job cancelled successfully',
      jobId,
    });
  } catch (error) {
    serverLogger.error(
      { error, jobId, userId: user.id },
      'Unexpected error cancelling job'
    );
    return errorResponse('An unexpected error occurred', 500);
  }
};

export const DELETE = withAuth(handleCancelJob, {
  route: '/api/export/queue/[jobId]',
  ...(process.env.NODE_ENV === 'test' ? {} : { rateLimit: RATE_LIMITS.tier2_resource_creation }),
});
