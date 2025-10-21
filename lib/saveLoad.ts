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

export async function saveTimeline(
  projectId: string,
  timeline: Timeline,
): Promise<void> {
  try {
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase
      .from('timelines')
      .upsert(
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

    // Also update the project's timeline_state_jsonb for backward compatibility
    const { error: projectError } = await supabase
      .from('projects')
      .update({
        timeline_state_jsonb: timeline,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId);

    if (projectError) {
      browserLogger.error({ error: projectError, projectId }, 'Failed to update project timeline');
    }
  } catch (error) {
    browserLogger.error({ error, projectId }, 'Unexpected error saving timeline');
  }
}
