'use client';

import type { Timeline } from '@/types/timeline';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { browserLogger } from '@/lib/browserLogger';

export async function loadTimeline(projectId: string): Promise<Timeline | null> {
  const startTime = Date.now();
  browserLogger.debug({ projectId, operation: 'loadTimeline' }, 'Starting timeline load');

  try {
    if (!projectId) {
      browserLogger.error({ projectId }, 'Project ID is required for loading timeline');
      return null;
    }

    const supabase = createBrowserSupabaseClient();

    // Check authentication status
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      browserLogger.error(
        { error: authError, projectId },
        'Failed to get authenticated user during timeline load'
      );
      return null;
    }

    if (!user) {
      browserLogger.warn({ projectId }, 'No authenticated user found during timeline load');
      return null;
    }

    browserLogger.debug(
      { projectId, userId: user.id },
      'User authenticated, proceeding with timeline load'
    );

    const { data, error } = await supabase
      .from('timelines')
      .select('timeline_data')
      .eq('project_id', projectId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      browserLogger.error(
        {
          error,
          projectId,
          userId: user.id,
          errorCode: error.code,
          errorDetails: error.details,
          errorHint: error.hint,
          errorMessage: error.message,
        },
        'Database error during timeline load'
      );
      return null;
    }

    const duration = Date.now() - startTime;

    if (!data) {
      browserLogger.info(
        { projectId, userId: user.id, duration },
        'No timeline found in database (new project)'
      );
      return null;
    }

    const timeline = data.timeline_data as Timeline;

    // Validate asset existence and filter out orphaned clips
    const originalClipCount = timeline.clips?.length ?? 0;
    if (originalClipCount > 0) {
      // Extract unique asset IDs from clips
      const assetIds = Array.from(new Set(timeline.clips.map((clip) => clip.assetId)));

      // Query assets table to check which assets exist
      const { data: existingAssets, error: assetsError } = await supabase
        .from('assets')
        .select('id')
        .in('id', assetIds);

      if (assetsError) {
        browserLogger.warn(
          { error: assetsError, projectId },
          'Failed to validate assets - proceeding without validation'
        );
      } else {
        // Create a Set of existing asset IDs for fast lookup
        const existingAssetIds = new Set(
          existingAssets?.map((asset: { id: string }) => asset.id) ?? []
        );

        // Filter out clips with non-existent assets
        const validClips = timeline.clips.filter((clip) => existingAssetIds.has(clip.assetId));
        const removedCount = timeline.clips.length - validClips.length;

        if (removedCount > 0) {
          timeline.clips = validClips;
          browserLogger.warn(
            {
              projectId,
              removedCount,
              originalCount: originalClipCount,
              remainingCount: validClips.length,
            },
            `Removed ${removedCount} orphaned clip(s) with missing assets`
          );

          // Auto-save the cleaned timeline to prevent loading orphaned clips again
          try {
            await saveTimeline(projectId, timeline);
            browserLogger.info(
              { projectId, removedCount },
              'Auto-saved timeline after removing orphaned clips'
            );
          } catch (saveError) {
            browserLogger.warn(
              { error: saveError, projectId },
              'Failed to auto-save cleaned timeline - orphaned clips may reappear'
            );
          }
        }
      }
    }

    // Calculate timeline duration from clips
    const calculatedDuration = timeline.clips.reduce((max, clip) => {
      const clipEnd = clip.timelinePosition + (clip.end - clip.start);
      return Math.max(max, clipEnd);
    }, 0);

    // Log timeline metadata
    const timelineMetadata = {
      projectId,
      userId: user.id,
      loadDuration: duration,
      tracksCount: timeline.tracks?.length ?? 0,
      totalClips: timeline.clips?.length ?? 0,
      timelineDuration: calculatedDuration,
      hasClips: (timeline.clips?.length ?? 0) > 0,
    };

    browserLogger.info(timelineMetadata, 'Timeline loaded successfully');

    return timeline;
  } catch (error) {
    const duration = Date.now() - startTime;
    browserLogger.error(
      {
        error,
        projectId,
        duration,
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
      },
      'Unexpected error loading timeline'
    );
    return null;
  }
}

export async function saveTimeline(projectId: string, timeline: Timeline): Promise<void> {
  const startTime = Date.now();
  browserLogger.debug({ projectId, operation: 'saveTimeline' }, 'Starting timeline save');

  try {
    // Validate inputs
    if (!projectId) {
      throw new Error('Project ID is required for saving timeline');
    }

    if (!timeline) {
      throw new Error('Timeline data is required for saving');
    }

    // Calculate timeline duration from clips
    const calculatedDuration = timeline.clips.reduce((max, clip) => {
      const clipEnd = clip.timelinePosition + (clip.end - clip.start);
      return Math.max(max, clipEnd);
    }, 0);

    // Log timeline structure for debugging
    const timelineMetadata = {
      projectId,
      tracksCount: timeline.tracks?.length ?? 0,
      totalClips: timeline.clips?.length ?? 0,
      timelineDuration: calculatedDuration,
      hasClips: (timeline.clips?.length ?? 0) > 0,
    };

    browserLogger.debug(timelineMetadata, 'Timeline metadata before save');

    // Serialize timeline to check size
    let timelineJson: string;
    let timelineSizeBytes: number;
    try {
      timelineJson = JSON.stringify(timeline);
      timelineSizeBytes = new Blob([timelineJson]).size;

      browserLogger.debug(
        {
          projectId,
          sizeBytes: timelineSizeBytes,
          sizeKB: Math.round(timelineSizeBytes / 1024),
          sizeMB: (timelineSizeBytes / (1024 * 1024)).toFixed(2),
        },
        'Timeline serialization successful'
      );

      // Warn if timeline is very large (>5MB could cause issues)
      if (timelineSizeBytes > 5 * 1024 * 1024) {
        browserLogger.warn(
          {
            projectId,
            sizeBytes: timelineSizeBytes,
            sizeMB: (timelineSizeBytes / (1024 * 1024)).toFixed(2),
          },
          'Timeline size exceeds 5MB - may cause performance issues'
        );
      }
    } catch (serializationError) {
      browserLogger.error(
        { error: serializationError, projectId },
        'Failed to serialize timeline - possible circular reference'
      );
      throw new Error('Timeline contains non-serializable data (circular reference?)');
    }

    // Create Supabase client
    const supabase = createBrowserSupabaseClient();

    // Check authentication status
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      browserLogger.error(
        { error: authError, projectId },
        'Failed to get authenticated user during timeline save'
      );
      throw new Error(`Authentication error: ${authError.message}`);
    }

    if (!user) {
      browserLogger.error({ projectId }, 'No authenticated user found during timeline save');
      throw new Error('User must be authenticated to save timeline');
    }

    browserLogger.debug(
      { projectId, userId: user.id },
      'User authenticated, proceeding with timeline save'
    );

    // Perform upsert
    const { error, data } = await supabase
      .from('timelines')
      .upsert(
        {
          project_id: projectId,
          timeline_data: timeline,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'project_id' }
      )
      .select();

    if (error) {
      browserLogger.error(
        {
          error,
          projectId,
          userId: user.id,
          errorCode: error.code,
          errorDetails: error.details,
          errorHint: error.hint,
          errorMessage: error.message,
        },
        'Database error during timeline save'
      );
      throw new Error(`Failed to save timeline: ${error.message}`);
    }

    const duration = Date.now() - startTime;

    // NOTE: Double write to projects.timeline_state_jsonb removed (2025-10-23)
    // Analysis showed no code reads from this column - all reads use timelines table
    // The column remains in schema for true backward compatibility but is no longer updated
    // DONE: Migration created to deprecate timeline_state_jsonb column (2025-10-25)
    // See: /supabase/migrations/20251025100000_deprecate_timeline_state_jsonb.sql
    // Docs: /docs/migrations/TIMELINE_STATE_DEPRECATION.md

    browserLogger.info(
      {
        ...timelineMetadata,
        userId: user.id,
        saveDuration: duration,
        sizeKB: Math.round(timelineSizeBytes / 1024),
        recordsAffected: data?.length ?? 0,
      },
      'Timeline saved successfully'
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    browserLogger.error(
      {
        error,
        projectId,
        duration,
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
      },
      'Unexpected error saving timeline'
    );
    // Re-throw to allow caller to handle
    throw error;
  }
}
