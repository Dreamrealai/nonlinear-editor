import { useState, useEffect, useCallback } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { browserLogger } from '@/lib/browserLogger';

export interface FrameEditRow {
  id: string;
  frame_id: string;
  version: number;
  output_storage_path: string;
  created_at: string;
  prompt: string;
}

export function useFrameEdits(
  supabase: SupabaseClient,
  selectedFrameId: string | null,
  refreshToken: number,
  signStoragePath: (path: string) => Promise<string | null>
) {
  const [edits, setEdits] = useState<Array<FrameEditRow & { url: string | null }>>([]);

  const loadFrameEdits = useCallback(
    async (frameId: string | null) => {
      if (!frameId) {
        setEdits([]);
        return;
      }
      const { data, error } = await supabase
        .from('frame_edits')
        .select('id, frame_id, version, output_storage_path, created_at, prompt')
        .eq('frame_id', frameId)
        .order('version', { ascending: false });
      if (error) {
        browserLogger.error({ error, frameId }, 'Failed to load frame edits');
        setEdits([]);
        return;
      }
      const editsWithUrls = await Promise.all(
        (data ?? []).map(async (row) => ({
          ...row,
          url: await signStoragePath(row.output_storage_path),
        }))
      );
      setEdits(editsWithUrls);
    },
    [signStoragePath, supabase]
  );

  useEffect(() => {
    void loadFrameEdits(selectedFrameId);
  }, [loadFrameEdits, selectedFrameId, refreshToken]);

  return { edits };
}
