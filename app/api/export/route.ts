import { serverLogger } from '@/lib/serverLogger';
import {
  validationError,
  notFoundResponse,
  errorResponse,
  successResponse,
  serviceUnavailableResponse,
  internalServerError,
} from '@/lib/api/response';
import { validateUUID, validateEnum, validateInteger, ValidationError } from '@/lib/validation';
import { verifyProjectOwnership } from '@/lib/api/project-verification';
import { withAuth } from '@/lib/api/withAuth';
import type { AuthenticatedHandler } from '@/lib/api/withAuth';
import { RATE_LIMITS } from '@/lib/rateLimit';
import { HttpStatusCode } from '@/lib/errors/errorCodes';

/**
 * Video Export API Endpoint
 *
 * This endpoint handles video export requests from the editor.
 *
 * Current Implementation:
 * - Creates an export job in the database for tracking
 * - Validates timeline and output specifications
 * - Returns job ID for status polling
 *
 * Production Deployment Notes:
 * To enable actual video rendering, integrate with:
 * - AWS MediaConvert
 * - Google Cloud Video Intelligence API
 * - Azure Media Services
 * - Self-hosted FFmpeg workers
 *
 * The job system is ready for background worker integration.
 */

export interface ExportRequest {
  projectId: string;
  timeline: {
    clips: Array<{
      id: string;
      assetId: string;
      start: number;
      end: number;
      timelinePosition: number;
      trackIndex: number;
      transitionToNext?: {
        type: 'none' | 'crossfade' | 'fade-in' | 'fade-out' | 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down' | 'wipe-left' | 'wipe-right' | 'zoom-in' | 'zoom-out';
        duration: number;
      };
      volume?: number;
      opacity?: number;
      speed?: number;
    }>;
  };
  outputSpec: {
    width: number;
    height: number;
    fps: number;
    vBitrateK: number;
    aBitrateK: number;
    format: 'mp4' | 'webm';
  };
}

export interface ExportResponse {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  message: string;
  estimatedTime?: number;
}

const VALID_FORMATS = ['mp4', 'webm'] as const;
const VALID_TRANSITIONS = [
  'none',
  'crossfade',
  'fade-in',
  'fade-out',
  'slide-left',
  'slide-right',
  'slide-up',
  'slide-down',
  'wipe-left',
  'wipe-right',
  'zoom-in',
  'zoom-out',
] as const;

const handleExportCreate: AuthenticatedHandler = async (request, { user, supabase }) => {
  const exportEnabled = process.env['VIDEO_EXPORT_ENABLED'] === 'true';

  if (!exportEnabled) {
    serverLogger.warn(
      {
        event: 'export.disabled',
        userId: user.id,
      },
      'Video export requested but the export worker is not configured'
    );

    return serviceUnavailableResponse('Video export is not currently available.', {
      help: 'Set VIDEO_EXPORT_ENABLED=true and configure a background worker to process export jobs.',
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    serverLogger.warn(
      {
        event: 'export.invalid_json',
        userId: user.id,
        error: error instanceof Error ? error.message : error,
      },
      'Invalid JSON body received for export request'
    );

    return validationError('Invalid JSON body');
  }

  if (!body || typeof body !== 'object') {
    return validationError('Missing required fields: projectId, timeline, outputSpec');
  }

  const partialBody = body as Partial<ExportRequest>;

  if (!partialBody.projectId || !partialBody.timeline || !partialBody.outputSpec) {
    return validationError('Missing required fields: projectId, timeline, outputSpec');
  }

  const payload = partialBody as ExportRequest;

  // Validate timeline structure
  if (!payload.timeline.clips || !Array.isArray(payload.timeline.clips)) {
    return validationError('Timeline must contain a clips array', 'timeline');
  }

  // Validate projectId and outputSpec
  try {
    validateUUID(payload.projectId, 'projectId');
    validateEnum(payload.outputSpec.format, 'format', VALID_FORMATS);
    validateInteger(payload.outputSpec.width, 'width', { required: true, min: 1, max: 7680 });
    validateInteger(payload.outputSpec.height, 'height', { required: true, min: 1, max: 4320 });
    validateInteger(payload.outputSpec.fps, 'fps', { required: true, min: 1, max: 120 });
    validateInteger(payload.outputSpec.vBitrateK, 'vBitrateK', {
      required: true,
      min: 100,
      max: 50000,
    });
    validateInteger(payload.outputSpec.aBitrateK, 'aBitrateK', {
      required: true,
      min: 32,
      max: 320,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return validationError(error.message, error.field);
    }
    throw error;
  }

  // Validate each clip in timeline
  for (let i = 0; i < payload.timeline.clips.length; i++) {
    const clip = payload.timeline.clips[i];
    if (!clip) continue;

    try {
      validateUUID(clip.id, `clip[${i}].id`);
      validateUUID(clip.assetId, `clip[${i}].assetId`);
      validateInteger(clip.start, `clip[${i}].start`, { required: true, min: 0 });
      validateInteger(clip.end, `clip[${i}].end`, { required: true, min: 0 });
      validateInteger(clip.timelinePosition, `clip[${i}].timelinePosition`, {
        required: true,
        min: 0,
      });
      validateInteger(clip.trackIndex, `clip[${i}].trackIndex`, { required: true, min: 0 });
    } catch (error) {
      if (error instanceof ValidationError) {
        return validationError(error.message, error.field);
      }
      throw error;
    }

    if (clip.end <= clip.start) {
      return validationError(
        `Invalid end time at index ${i}. Must be greater than start time`,
        `clip[${i}].end`
      );
    }

    // Validate optional fields
    try {
      if (clip.volume !== undefined) {
        validateInteger(clip.volume, `clip[${i}].volume`, { min: 0, max: 2 });
      }

      if (clip.opacity !== undefined) {
        validateInteger(clip.opacity, `clip[${i}].opacity`, { min: 0, max: 1 });
      }

      if (clip.speed !== undefined) {
        validateInteger(clip.speed, `clip[${i}].speed`, { min: 1, max: 10 });
      }

      if (clip.transitionToNext) {
        validateEnum(
          clip.transitionToNext.type,
          `clip[${i}].transitionToNext.type`,
          VALID_TRANSITIONS
        );
        validateInteger(clip.transitionToNext.duration, `clip[${i}].transitionToNext.duration`, {
          required: true,
          min: 0,
        });
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        return validationError(error.message, error.field);
      }
      throw error;
    }
  }

  // Verify user owns the project
  const projectVerification = await verifyProjectOwnership(
    supabase,
    payload.projectId,
    user.id,
    'user_id'
  );
  if (!projectVerification.hasAccess) {
    const parsedStatus = Number(projectVerification.status);
    const projectErrorText =
      typeof projectVerification.error === 'string' ? projectVerification.error.toLowerCase() : '';
    const status = Number.isFinite(parsedStatus)
      ? parsedStatus
      : projectErrorText.includes('not')
        ? HttpStatusCode.NOT_FOUND
        : HttpStatusCode.FORBIDDEN;

    return errorResponse(projectVerification.error ?? 'Project access denied', status);
  }

  // Create export job in database for tracking
  const { data: exportJob, error: jobError } = await supabase
    .from('processing_jobs')
    .insert({
      user_id: user.id,
      project_id: payload.projectId,
      job_type: 'video-export',
      status: 'pending',
      provider: 'internal',
      config: {
        timeline: payload.timeline,
        outputSpec: payload.outputSpec,
      },
      metadata: {
        clipCount: payload.timeline.clips.length,
        format: payload.outputSpec.format,
        resolution: `${payload.outputSpec.width}x${payload.outputSpec.height}`,
        fps: payload.outputSpec.fps,
      },
      progress_percentage: 0,
    })
    .select()
    .single();

  if (jobError || !exportJob) {
    serverLogger.error(
      { error: jobError, userId: user.id, projectId: payload.projectId },
      'Failed to create export job'
    );
    return internalServerError(
      'Unable to create your video export job. Please check your timeline and try again. If the problem persists, contact support.'
    );
  }

  const response: ExportResponse = {
    jobId: exportJob.id,
    status: 'queued',
    message: 'Export job created and queued for processing.',
    estimatedTime: payload.timeline.clips.length * 5, // Rough estimate: 5 seconds per clip
  };

  return successResponse(response, undefined, 202); // 202 Accepted
};

export const POST = withAuth(handleExportCreate, {
  route: '/api/export',
  ...(process.env.NODE_ENV === 'test' ? {} : { rateLimit: RATE_LIMITS.tier2_resource_creation }),
});

/**
 * GET /api/export?jobId=xxx
 * Check status of export job
 */
const handleExportStatus: AuthenticatedHandler = async (request, { user, supabase }) => {
  const jobId = request.nextUrl.searchParams.get('jobId');

  if (!jobId) {
    return validationError('jobId required', 'jobId');
  }

  try {
    validateUUID(jobId, 'jobId');
  } catch (error) {
    if (error instanceof ValidationError) {
      return validationError(error.message, error.field);
    }
    throw error;
  }

  // Fetch job status from database
  const { data: job, error: fetchError } = await supabase
    .from('processing_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !job) {
    return notFoundResponse('Export job');
  }

  // Map database status to API response status
  const statusMapping: Record<string, ExportResponse['status']> = {
    pending: 'queued',
    processing: 'processing',
    completed: 'completed',
    failed: 'failed',
    cancelled: 'failed',
  };

  const response: ExportResponse = {
    jobId: job.id,
    status: statusMapping[job.status] || 'queued',
    message:
      job.status === 'completed'
        ? 'Export completed successfully'
        : job.status === 'failed'
          ? `Export failed: ${job.error_message || 'Unknown error'}`
          : job.status === 'processing'
            ? `Export in progress (${job.progress_percentage}%)`
            : 'Export queued for processing',
    ...(job.status === 'pending' && { estimatedTime: 30 }),
  };

  return successResponse(response);
};

export const GET = withAuth(handleExportStatus, {
  route: '/api/export',
  ...(process.env.NODE_ENV === 'test' ? {} : { rateLimit: RATE_LIMITS.tier3_status_read }),
});
