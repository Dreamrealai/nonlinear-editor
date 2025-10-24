/**
 * Update Job Priority API Endpoint
 *
 * PATCH /api/export/queue/[jobId]/priority - Update job priority
 */

import { serverLogger } from '@/lib/serverLogger';
import { successResponse, errorResponse, notFoundResponse, validationError } from '@/lib/api/response';
import { withAuth } from '@/lib/api/withAuth';
import type { AuthenticatedHandler } from '@/lib/api/withAuth';
import { RATE_LIMITS } from '@/lib/rateLimit';
import { validateUUID, validateInteger, ValidationError } from '@/lib/validation';

const handleUpdatePriority: AuthenticatedHandler<{ jobId: string }> = async (request, { user, supabase, params }) => {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    serverLogger.warn(
      {
        event: 'priority.invalid_json',
        userId: user.id,
        jobId,
        error: error instanceof Error ? error.message : error,
      },
      'Invalid JSON body received for priority update'
    );
    return validationError('Invalid JSON body');
  }

  if (!body || typeof body !== 'object') {
    return validationError('Missing required field: priority');
  }

  const partialBody = body as Partial<{ priority: number }>;

  if (partialBody.priority === undefined) {
    return validationError('Missing required field: priority');
  }

  // Validate priority
  try {
    validateInteger(partialBody.priority, 'priority', { required: true, min: 0, max: 100 });
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

    // Can only update priority for pending jobs
    if (job.status !== 'pending') {
      return errorResponse(
        `Cannot update priority for job with status '${job.status}'. Only pending jobs can have their priority changed.`,
        400
      );
    }

    // Update job priority
    const { error: updateError } = await supabase
      .from('processing_jobs')
      .update({
        priority: partialBody.priority,
      })
      .eq('id', jobId);

    if (updateError) {
      serverLogger.error(
        { error: updateError, jobId, userId: user.id, priority: partialBody.priority },
        'Failed to update job priority'
      );
      return errorResponse('Failed to update job priority', 500);
    }

    serverLogger.info(
      { jobId, userId: user.id, projectId: job.project_id, priority: partialBody.priority },
      'Export job priority updated'
    );

    return successResponse({
      message: 'Job priority updated successfully',
      jobId,
      priority: partialBody.priority,
    });
  } catch (error) {
    serverLogger.error(
      { error, jobId, userId: user.id },
      'Unexpected error updating job priority'
    );
    return errorResponse('An unexpected error occurred', 500);
  }
};

export const PATCH = withAuth(handleUpdatePriority, {
  route: '/api/export/queue/[jobId]/priority',
  ...(process.env.NODE_ENV === 'test' ? {} : { rateLimit: RATE_LIMITS.tier2_resource_creation }),
});
