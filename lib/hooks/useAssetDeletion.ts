/**
 * useAssetDeletion Hook
 *
 * Handles asset deletion including confirmation dialogs,
 * timeline cleanup, and error handling.
 */
'use client';

import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { browserLogger } from '@/lib/browserLogger';
import type { AssetRow } from '@/types/assets';

export interface UseAssetDeletionReturn {
  /** Delete an asset with confirmation */
  deleteAsset: (
    asset: AssetRow,
    timeline: { clips: Array<{ assetId: string }> } | null,
    setTimeline: (timeline: { clips: Array<{ assetId: string }> }) => void
  ) => Promise<void>;
}

/**
 * Hook to handle asset deletion.
 *
 * Prompts for confirmation, deletes from database,
 * removes from timeline if necessary, and shows appropriate feedback.
 */
export function useAssetDeletion(
  projectId: string,
  onDeleteSuccess: (assetId: string) => void
): UseAssetDeletionReturn {
  const supabase = createBrowserSupabaseClient();

  const handleAssetDelete = useCallback(
    async (
      asset: AssetRow,
      timeline: { clips: Array<{ assetId: string }> } | null,
      setTimeline: (timeline: { clips: Array<{ assetId: string }> }) => void
    ): Promise<void> => {
      if (!confirm(`Delete "${asset.metadata?.filename ?? asset.id}"?`)) {
        return;
      }

      try {
        const { error } = await supabase
          .from('assets')
          .delete()
          .eq('id', asset.id)
          .eq('project_id', projectId);

        if (error) {
          browserLogger.error({ error, assetId: asset.id }, 'Failed to delete asset');
          toast.error('Failed to delete asset');
          return;
        }

        onDeleteSuccess(asset.id);

        if (timeline) {
          const updatedClips = timeline.clips.filter((clip): boolean => clip.assetId !== asset.id);
          if (updatedClips.length !== timeline.clips.length) {
            setTimeline({ ...timeline, clips: updatedClips });
            toast.success('Asset deleted from library and timeline');
          } else {
            toast.success('Asset deleted');
          }
        } else {
          toast.success('Asset deleted');
        }
      } catch (error) {
        browserLogger.error({ error, assetId: asset.id }, 'Error deleting asset');
        toast.error('Failed to delete asset');
      }
    },
    [projectId, supabase, onDeleteSuccess]
  );

  return {
    deleteAsset: handleAssetDelete,
  };
}
