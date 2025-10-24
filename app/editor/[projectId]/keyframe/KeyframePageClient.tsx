'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import { EditorHeader } from '@/components/EditorHeader';
import { KeyframeEditorShell } from '@/components/keyframes/KeyframeEditorShell';
import { browserLogger } from '@/lib/browserLogger';
import type { BaseAssetRow } from '@/types/assets';

interface KeyframePageClientProps {
  projectId: string;
}

export default function KeyframePageClient({ projectId }: KeyframePageClientProps) {
  const { supabaseClient } = useSupabase();
  const [assets, setAssets] = useState<BaseAssetRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAssets = useCallback(async () => {
    if (!supabaseClient) return;

    try {
      const { data, error } = await supabaseClient
        .from('assets')
        .select('id, storage_url, metadata')
        .eq('project_id', projectId)
        .eq('type', 'video')
        .order('created_at', { ascending: false });

      if (error) {
        browserLogger.error({ error, projectId }, 'Failed to load assets');
        return;
      }

      if (data) {
        setAssets(data as BaseAssetRow[]);
      }
    } catch (error) {
      browserLogger.error({ error, projectId }, 'Error loading assets');
    } finally {
      setLoading(false);
    }
  }, [supabaseClient, projectId]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  if (loading) {
    return (
      <div className="flex h-full flex-col">
        <EditorHeader projectId={projectId} currentTab="image-editor" />
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-neutral-900 mx-auto" />
            <p className="mt-4 text-sm text-neutral-600">Loading assets...</p>
          </div>
        </div>
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <EditorHeader projectId={projectId} currentTab="image-editor" />
        <div className="flex h-full items-center justify-center bg-neutral-50">
          <div className="text-center max-w-md">
            <div className="mb-4 flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-blue-100">
              <svg
                className="h-8 w-8 text-purple-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-neutral-900 mb-2">No Video Assets</h2>
            <p className="text-sm text-neutral-600 mb-4">
              Upload video assets in the Video Editor first, then return here to extract and edit
              keyframes.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <EditorHeader projectId={projectId} currentTab="image-editor" />
      <KeyframeEditorShell assets={assets} />
    </div>
  );
}
