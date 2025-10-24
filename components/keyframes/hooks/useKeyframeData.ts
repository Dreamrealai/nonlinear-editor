import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

interface SceneRow {
  id: string;
  start_ms: number;
  end_ms: number;
}

interface SceneFrameRow {
  id: string;
  scene_id: string;
  kind: 'first' | 'middle' | 'last' | 'custom';
  t_ms: number;
  storage_path: string;
  width: number | null;
  height: number | null;
}

interface FrameEditRow {
  id: string;
  frame_id: string;
  version: number;
  output_storage_path: string;
  created_at: string;
  prompt: string;
}

export interface UseKeyframeDataProps {
  supabase: SupabaseClient;
  selectedAssetId: string | null;
  refreshToken: number;
  signStoragePath: (storagePath: string, expiresIn?: number) => Promise<string | null>;
}

export interface UseKeyframeDataReturn {
  scenes: SceneRow[];
  frames: SceneFrameRow[];
  frameUrls: Record<string, string>;
  groupedFrames: Map<string, SceneFrameRow[]>;
  loadScenesAndFrames: (assetId: string | null) => Promise<void>;
}

export function useKeyframeData({
  supabase,
  selectedAssetId,
  refreshToken,
  signStoragePath,
}: UseKeyframeDataProps): UseKeyframeDataReturn {
  const [scenes, setScenes] = useState<SceneRow[]>([]);
  const [frames, setFrames] = useState<SceneFrameRow[]>([]);
  const [frameUrls, setFrameUrls] = useState<Record<string, string>>({});

  const groupedFrames = useMemo((): Map<string, SceneFrameRow[]> => {
    const byScene = new Map<string, SceneFrameRow[]>();
    for (const frame of frames) {
      const existing = byScene.get(frame.scene_id) ?? [];
      existing.push(frame);
      byScene.set(frame.scene_id, existing);
    }
    for (const frameList of byScene.values()) {
      frameList.sort((a, b): number => {
        const order: Record<SceneFrameRow['kind'], number> = {
          first: 0,
          middle: 1,
          last: 2,
          custom: 3,
        };
        return order[a.kind] - order[b.kind];
      });
    }
    return byScene;
  }, [frames]);

  const loadScenesAndFrames = useCallback(
    async (assetId: string | null): Promise<void> => {
      if (!assetId) {
        setScenes([]);
        setFrames([]);
        setFrameUrls({});
        return;
      }

      const [{ data: sceneRows, error: scenesError }, { data: frameRows, error: framesError }] =
        await Promise.all([
          supabase
            .from('scenes')
            .select('id, start_ms, end_ms')
            .eq('asset_id', assetId)
            .order('start_ms', { ascending: true }),
          supabase
            .from('scene_frames')
            .select('id, scene_id, kind, t_ms, storage_path, width, height')
            .eq('asset_id', assetId),
        ]);

      if (scenesError) {
        const { browserLogger } = await import('@/lib/browserLogger');
        browserLogger.error({ error: scenesError }, 'Failed to load scenes');
      }
      if (framesError) {
        const { browserLogger } = await import('@/lib/browserLogger');
        browserLogger.error({ error: framesError }, 'Failed to load frames');
      }

      setScenes(sceneRows ?? []);
      setFrames(frameRows ?? []);

      if (frameRows?.length) {
        const urls = Object.fromEntries(
          await Promise.all(
            frameRows.map(async (frame): Promise<readonly [any, string]> => {
              const url = await signStoragePath(frame.storage_path);
              return [frame.id, url ?? ''] as const;
            })
          )
        );
        setFrameUrls(urls);
      } else {
        setFrameUrls({});
      }
    },
    [signStoragePath, supabase]
  );

  useEffect((): void => {
    void loadScenesAndFrames(selectedAssetId);
  }, [loadScenesAndFrames, selectedAssetId, refreshToken]);

  return {
    scenes,
    frames,
    frameUrls,
    groupedFrames,
    loadScenesAndFrames,
  };
}

export interface UseFrameEditsProps {
  supabase: SupabaseClient;
  selectedFrameId: string | null;
  refreshToken: number;
  signStoragePath: (storagePath: string, expiresIn?: number) => Promise<string | null>;
}

export interface UseFrameEditsReturn {
  edits: Array<FrameEditRow & { url: string | null }>;
  loadFrameEdits: (frameId: string | null) => Promise<void>;
}

export function useFrameEdits({
  supabase,
  selectedFrameId,
  refreshToken,
  signStoragePath,
}: UseFrameEditsProps): UseFrameEditsReturn {
  const [edits, setEdits] = useState<Array<FrameEditRow & { url: string | null }>>([]);

  const loadFrameEdits = useCallback(
    async (frameId: string | null): Promise<void> => {
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
        const { browserLogger } = await import('@/lib/browserLogger');
        browserLogger.error({ error, frameId }, 'Failed to load frame edits');
        setEdits([]);
        return;
      }
      const editsWithUrls = await Promise.all(
        (data ?? []).map(async (row): Promise<{ url: string | null; id: any; frame_id: any; version: any; output_storage_path: any; created_at: any; prompt: any; }> => ({
          ...row,
          url: await signStoragePath(row.output_storage_path),
        }))
      );
      setEdits(editsWithUrls);
    },
    [signStoragePath, supabase]
  );

  useEffect((): void => {
    void loadFrameEdits(selectedFrameId);
  }, [loadFrameEdits, selectedFrameId, refreshToken]);

  return {
    edits,
    loadFrameEdits,
  };
}
