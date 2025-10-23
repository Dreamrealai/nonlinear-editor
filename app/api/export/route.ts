import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { serverLogger } from '@/lib/serverLogger';
import {
  unauthorizedResponse,
  validationError,
  notFoundResponse,
  errorResponse,
  successResponse,
  withErrorHandling,
} from '@/lib/api/response';
import { validateUUID, validateEnum, validateInteger, validateAll } from '@/lib/api/validation';
import { verifyProjectOwnership } from '@/lib/api/project-verification';

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
        type: 'crossfade' | 'fade-in' | 'fade-out';
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
const VALID_TRANSITIONS = ['crossfade', 'fade-in', 'fade-out'] as const;

export const POST = withErrorHandling(async (request: NextRequest) => {
  // SECURITY: Verify user authentication
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return unauthorizedResponse();
  }

  const exportEnabled = process.env['VIDEO_EXPORT_ENABLED'] === 'true';

  if (!exportEnabled) {
    serverLogger.warn(
      {
        event: 'export.disabled',
        userId: user.id,
      },
      'Video export requested but the export worker is not configured'
    );

    return NextResponse.json(
      {
        error: 'Video export is not currently available.',
        help: 'Set VIDEO_EXPORT_ENABLED=true and configure a background worker to process export jobs.',
      },
      { status: 503 }
    );
  }

  const body: ExportRequest = await request.json();

  // Validate required fields
  if (!body.projectId || !body.timeline || !body.outputSpec) {
    return validationError('Missing required fields: projectId, timeline, outputSpec');
  }

  // Validate timeline structure
  if (!body.timeline.clips || !Array.isArray(body.timeline.clips)) {
    return validationError('Timeline must contain a clips array', 'timeline');
  }

  // Validate projectId and outputSpec
  const validation = validateAll([
    validateUUID(body.projectId, 'projectId'),
    validateEnum(body.outputSpec.format, 'format', VALID_FORMATS, true),
    validateInteger(body.outputSpec.width, 'width', { required: true, min: 1, max: 7680 }),
    validateInteger(body.outputSpec.height, 'height', { required: true, min: 1, max: 4320 }),
    validateInteger(body.outputSpec.fps, 'fps', { required: true, min: 1, max: 120 }),
    validateInteger(body.outputSpec.vBitrateK, 'vBitrateK', {
      required: true,
      min: 100,
      max: 50000,
    }),
    validateInteger(body.outputSpec.aBitrateK, 'aBitrateK', { required: true, min: 32, max: 320 }),
  ]);

  if (!validation.valid) {
    const firstError = validation.errors[0];
    return validationError(firstError?.message ?? 'Invalid input', firstError?.field);
  }

  // Validate each clip in timeline
  for (let i = 0; i < body.timeline.clips.length; i++) {
    const clip = body.timeline.clips[i];
    if (!clip) continue;

    const clipValidation = validateAll([
      validateUUID(clip.id, `clip[${i}].id`),
      validateUUID(clip.assetId, `clip[${i}].assetId`),
      validateInteger(clip.start, `clip[${i}].start`, { required: true, min: 0 }),
      validateInteger(clip.end, `clip[${i}].end`, { required: true, min: 0 }),
      validateInteger(clip.timelinePosition, `clip[${i}].timelinePosition`, {
        required: true,
        min: 0,
      }),
      validateInteger(clip.trackIndex, `clip[${i}].trackIndex`, { required: true, min: 0 }),
    ]);

    if (!clipValidation.valid) {
      const firstError = clipValidation.errors[0];
      if (!firstError) {
        return validationError('Validation error occurred', `clip[${i}]`);
      }
      return validationError(firstError.message, firstError.field);
    }

    if (clip.end <= clip.start) {
      return validationError(
        `Invalid end time at index ${i}. Must be greater than start time`,
        `clip[${i}].end`
      );
    }

    // Validate optional fields
    if (clip.volume !== undefined) {
      const volumeValidation = validateInteger(clip.volume, `clip[${i}].volume`, {
        min: 0,
        max: 2,
      });
      if (volumeValidation) {
        return validationError(volumeValidation.message, volumeValidation.field);
      }
    }

    if (clip.opacity !== undefined) {
      const opacityValidation = validateInteger(clip.opacity, `clip[${i}].opacity`, {
        min: 0,
        max: 1,
      });
      if (opacityValidation) {
        return validationError(opacityValidation.message, opacityValidation.field);
      }
    }

    if (clip.speed !== undefined) {
      const speedValidation = validateInteger(clip.speed, `clip[${i}].speed`, { min: 1, max: 10 });
      if (speedValidation) {
        return validationError(speedValidation.message, speedValidation.field);
      }
    }

    if (clip.transitionToNext) {
      const transitionValidation = validateAll([
        validateEnum(
          clip.transitionToNext.type,
          `clip[${i}].transitionToNext.type`,
          VALID_TRANSITIONS,
          true
        ),
        validateInteger(clip.transitionToNext.duration, `clip[${i}].transitionToNext.duration`, {
          required: true,
          min: 0,
        }),
      ]);

      if (!transitionValidation.valid) {
        const firstError = transitionValidation.errors[0];
        return validationError(firstError?.message ?? 'Invalid transition', firstError?.field);
      }
    }
  }

  // Verify user owns the project
  const projectVerification = await verifyProjectOwnership(
    supabase,
    body.projectId,
    user.id,
    'user_id'
  );
  if (!projectVerification.hasAccess) {
    return errorResponse(projectVerification.error!, projectVerification.status!);
  }

  // Create export job in database for tracking
  const { data: exportJob, error: jobError } = await supabase
    .from('processing_jobs')
    .insert({
      user_id: user.id,
      project_id: body.projectId,
      job_type: 'video-export',
      status: 'pending',
      provider: 'internal',
      config: {
        timeline: body.timeline,
        outputSpec: body.outputSpec,
      },
      metadata: {
        clipCount: body.timeline.clips.length,
        format: body.outputSpec.format,
        resolution: `${body.outputSpec.width}x${body.outputSpec.height}`,
        fps: body.outputSpec.fps,
      },
      progress_percentage: 0,
    })
    .select()
    .single();

  if (jobError || !exportJob) {
    serverLogger.error(
      { error: jobError, userId: user.id, projectId: body.projectId },
      'Failed to create export job'
    );
    return NextResponse.json({ error: 'Failed to create export job' }, { status: 500 });
  }

  const response: ExportResponse = {
    jobId: exportJob.id,
    status: 'queued',
    message: 'Export job created and queued for processing.',
    estimatedTime: body.timeline.clips.length * 5, // Rough estimate: 5 seconds per clip
  };

  return NextResponse.json(response, { status: 202 }); // 202 Accepted
});

/**
 * GET /api/export?jobId=xxx
 * Check status of export job
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return unauthorizedResponse();
  }

  const jobId = request.nextUrl.searchParams.get('jobId');

  if (!jobId) {
    return validationError('jobId required', 'jobId');
  }

  const validation = validateAll([validateUUID(jobId, 'jobId')]);
  if (!validation.valid) {
    const firstError = validation.errors[0];
    return validationError(firstError?.message ?? 'Invalid input', firstError?.field);
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
    estimatedTime: job.status === 'pending' ? 30 : undefined,
  };

  return successResponse(response);
});
