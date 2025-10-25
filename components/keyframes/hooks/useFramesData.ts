import { useState, useEffect, useCallback, useMemo } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { browserLogger } from '@/lib/browserLogger';

export interface SceneRow {
  id: string;
  start_ms: number;
  end_ms: number;
}

export interface SceneFrameRow {
  id: string;
  scene_id: string;
  kind: 'first' | 'middle' | 'last' | 'custom';
  t_ms: number;
  storage_path: string;
  width: number | null;
  height: number | null;
}

interface CropState {
  x: number;
  y: number;
  size: number;
}

const defaultCrop = (width?: number | null, height?: number | null): CropState => {
  const size = Math.min(width ?? 512, height ?? 512, 512);
  return { x: 0, y: 0, size: size > 0 ? size : 256 };
};

export function useFramesData(
  supabase: SupabaseClient,
  selectedAssetId: string | null,
  refreshToken: number,
  signStoragePath: (path: string) => Promise<string | null>
) {
  const [scenes, setScenes] = useState<SceneRow[]>([]);
  const [frames, setFrames] = useState<SceneFrameRow[]>([]);
  const [frameUrls, setFrameUrls] = useState<Record<string, string>>({});
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);
  const [selectedFrameUrl, setSelectedFrameUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState<CropState>(defaultCrop());

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

  const clampCrop = useCallback((next: CropState, frame: SceneFrameRow | null): CropState => {
    if (!frame) return next;
    const maxSize = Math.min(frame.width ?? next.size, frame.height ?? next.size);
    const size = Math.min(next.size, maxSize);
    const maxX = Math.max(0, (frame.width ?? size) - size);
    const maxY = Math.max(0, (frame.height ?? size) - size);
    return {
      size,
      x: Math.max(0, Math.min(next.x, maxX)),
      y: Math.max(0, Math.min(next.y, maxY)),
    };
  }, []);

  const loadScenesAndFrames = useCallback(
    async (assetId: string | null): Promise<void> => {
      if (!assetId) {
        setScenes([]);
        setFrames([]);
        setFrameUrls({});
        setSelectedFrameId(null);
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
        browserLogger.error({ error: scenesError, assetId }, 'Failed to load scenes');
      }
      if (framesError) {
        browserLogger.error({ error: framesError, assetId }, 'Failed to load frames');
      }

      setScenes(sceneRows ?? []);
      setFrames(frameRows ?? []);

      if (frameRows?.length) {
        const urls = Object.fromEntries(
          await Promise.all(
            frameRows.map(async (frame): Promise<readonly [string, string]> => {
              const url = await signStoragePath(frame.storage_path);
              return [frame.id, url ?? ''] as const;
            })
          )
        );
        setFrameUrls(urls);

        const preferredFrame = frameRows.find((f): boolean => f.kind === 'middle') ?? frameRows[0];
        if (preferredFrame) {
          setSelectedFrameId(preferredFrame.id);
          setSelectedFrameUrl(urls[preferredFrame.id] ?? null);
          setCrop(
            clampCrop(defaultCrop(preferredFrame.width, preferredFrame.height), preferredFrame)
          );
        }
      } else {
        setFrameUrls({});
        setSelectedFrameId(null);
        setSelectedFrameUrl(null);
      }
    },
    [clampCrop, signStoragePath, supabase]
  );

  useEffect((): void => {
    void loadScenesAndFrames(selectedAssetId);
  }, [loadScenesAndFrames, selectedAssetId, refreshToken]);

  const selectedFrame = useMemo(
    (): SceneFrameRow | null =>
      frames.find((frame): boolean => frame.id === selectedFrameId) ?? null,
    [frames, selectedFrameId]
  );

  const handleFrameSelect = async (frame: SceneFrameRow): Promise<void> => {
    setSelectedFrameId(frame.id);
    const url = frameUrls[frame.id] ?? (await signStoragePath(frame.storage_path));
    setSelectedFrameUrl(url);
    setCrop(clampCrop(defaultCrop(frame.width, frame.height), frame));
  };

  return {
    scenes,
    frames,
    frameUrls,
    selectedFrameId,
    selectedFrameUrl,
    selectedFrame,
    crop,
    setCrop,
    groupedFrames,
    clampCrop,
    handleFrameSelect,
    defaultCrop,
  };
}
