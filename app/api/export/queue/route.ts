/**
 * Render Queue API Endpoint
 *
 * GET /api/export/queue - Get all export jobs in the queue
 * - Returns active and optionally completed jobs
 * - Sorted by priority and creation time
 */

import { serverLogger } from '@/lib/serverLogger';
import { successResponse, errorResponse } from '@/lib/api/response';
import { withAuth } from '@/lib/api/withAuth';
import type { AuthenticatedHandler } from '@/lib/api/withAuth';
import { RATE_LIMITS } from '@/lib/rateLimit';

const handleGetQueue: AuthenticatedHandler = async (request, { user, supabase }) => {
  const includeCompleted = request.nextUrl.searchParams.get('includeCompleted') === 'true';

  try {
    let query = supabase
      .from('processing_jobs')
      .select('*')
      .eq('user_id', user.id)
      .eq('job_type', 'video-export')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true });

    // Filter by status if not including completed
    if (!includeCompleted) {
      query = query.in('status', ['pending', 'processing']);
    }

    const { data: jobs, error: fetchError } = await query;

    if (fetchError) {
      serverLogger.error(
        { error: fetchError, userId: user.id },
        'Failed to fetch render queue'
      );
      return errorResponse('Failed to fetch render queue', 500);
    }

    // Map database jobs to API response format
    const mappedJobs = jobs.map((job) => ({
      id: job.id,
      projectId: job.project_id,
      status: job.status,
      progress: job.progress_percentage || 0,
      priority: job.priority || 0,
      config: job.config || {},
      metadata: job.metadata || {},
      errorMessage: job.error_message,
      createdAt: job.created_at,
      startedAt: job.started_at,
      completedAt: job.completed_at,
    }));

    return successResponse({
      jobs: mappedJobs,
      total: mappedJobs.length,
      active: mappedJobs.filter(j => j.status === 'pending' || j.status === 'processing').length,
      completed: mappedJobs.filter(j => j.status === 'completed' || j.status === 'failed' || j.status === 'cancelled').length,
    });
  } catch (error) {
    serverLogger.error(
      { error, userId: user.id },
      'Unexpected error fetching render queue'
    );
    return errorResponse('An unexpected error occurred', 500);
  }
};

export const GET = withAuth(handleGetQueue, {
  route: '/api/export/queue',
  ...(process.env.NODE_ENV === 'test' ? {} : { rateLimit: RATE_LIMITS.tier3_status_read }),
});
