'use client';

import type { Timeline } from '@/types/timeline';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { browserLogger } from '@/lib/browserLogger';

export async function loadTimeline(projectId: string): Promise<Timeline | null> {
  try {
    const supabase = createBrowserSupabaseClient();
    const { data, error } = await supabase
      .from('timelines')
      .select('timeline_data')
      .eq('project_id', projectId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      browserLogger.error({ error, projectId }, 'Failed to load timeline');
      return null;
    }

    return (data?.timeline_data as Timeline) ?? null;
  } catch (error) {
    browserLogger.error({ error, projectId }, 'Unexpected error loading timeline');
    return null;
  }
}

export async function saveTimeline(projectId: string, timeline: Timeline): Promise<void> {
  try {
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.from('timelines').upsert(
      {
        project_id: projectId,
        timeline_data: timeline,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'project_id' }
    );

    if (error) {
      browserLogger.error({ error, projectId }, 'Failed to save timeline');
      return;
    }

    // NOTE: Double write to projects.timeline_state_jsonb removed (2025-10-23)
    // Analysis showed no code reads from this column - all reads use timelines table
    // The column remains in schema for true backward compatibility but is no longer updated
    // DONE: Migration created to deprecate timeline_state_jsonb column (2025-10-25)
    // See: /supabase/migrations/20251025100000_deprecate_timeline_state_jsonb.sql
    // Docs: /docs/migrations/TIMELINE_STATE_DEPRECATION.md

    browserLogger.info({ projectId }, 'Timeline saved successfully');
  } catch (error) {
    browserLogger.error({ error, projectId }, 'Unexpected error saving timeline');
  }
}
