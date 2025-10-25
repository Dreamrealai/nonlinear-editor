import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';

export interface SceneFrameRow {
  id: string;
  scene_id: string;
  kind: 'first' | 'middle' | 'last' | 'custom';
  t_ms: number;
  storage_path: string;
  width: number | null;
  height: number | null;
}

export type Mode = 'global' | 'crop';

export interface CropState {
  x: number;
  y: number;
  size: number;
}

export interface UseKeyframeSelectionProps {
  frames: SceneFrameRow[];
  frameUrls: Record<string, string>;
  signStoragePath: (storagePath: string, expiresIn?: number) => Promise<string | null>;
}

export interface UseKeyframeSelectionReturn {
  selectedFrameId: string | null;
  selectedFrameUrl: string | null;
  selectedFrame: SceneFrameRow | null;
  mode: Mode;
  crop: CropState;
  feather: number;
  cropOverlayStyle: CSSProperties | undefined;
  setMode: (mode: Mode) => void;
  setCrop: React.Dispatch<React.SetStateAction<CropState>>;
  setFeather: (feather: number) => void;
  handleFrameSelect: (frame: SceneFrameRow) => Promise<void>;
  handleImageClick: (event: React.MouseEvent<HTMLImageElement>) => void;
  clampCrop: (next: CropState, frame: SceneFrameRow | null) => CropState;
}

const defaultCrop = (width?: number | null, height?: number | null): CropState => {
  const size = Math.min(width ?? 512, height ?? 512, 512);
  return { x: 0, y: 0, size: size > 0 ? size : 256 };
};

export function useKeyframeSelection({
  frames,
  frameUrls,
  signStoragePath,
}: UseKeyframeSelectionProps): UseKeyframeSelectionReturn {
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);
  const [selectedFrameUrl, setSelectedFrameUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('global');
  const [crop, setCrop] = useState<CropState>(defaultCrop());
  const [feather, setFeather] = useState<number>(24);

  const selectedFrame = useMemo(
    (): SceneFrameRow | null =>
      frames.find((frame): boolean => frame.id === selectedFrameId) ?? null,
    [frames, selectedFrameId]
  );

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

  const handleFrameSelect = useCallback(
    async (frame: SceneFrameRow): Promise<void> => {
      setSelectedFrameId(frame.id);
      const url = frameUrls[frame.id] ?? (await signStoragePath(frame.storage_path));
      setSelectedFrameUrl(url);
      setCrop(clampCrop(defaultCrop(frame.width, frame.height), frame));
    },
    [frameUrls, signStoragePath, clampCrop]
  );

  const handleImageClick = useCallback(
    (event: React.MouseEvent<HTMLImageElement>): void => {
      if (mode !== 'crop' || !selectedFrame) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const scaleX = (selectedFrame.width ?? rect.width) / rect.width;
      const scaleY = (selectedFrame.height ?? rect.height) / rect.height;
      const clickX = (event.clientX - rect.left) * scaleX;
      const clickY = (event.clientY - rect.top) * scaleY;
      const half = crop.size / 2;
      const next: CropState = {
        x: Math.round(clickX - half),
        y: Math.round(clickY - half),
        size: crop.size,
      };
      setCrop(clampCrop(next, selectedFrame));
    },
    [mode, selectedFrame, crop.size, clampCrop]
  );

  const cropOverlayStyle = useMemo(():
    | { left: string; top: string; width: string; height: string }
    | undefined => {
    if (mode !== 'crop' || !selectedFrame || !selectedFrameUrl) return undefined;
    const displayWidth = selectedFrame.width ?? 1;
    const displayHeight = selectedFrame.height ?? 1;
    return {
      left: `${(crop.x / displayWidth) * 100}%`,
      top: `${(crop.y / displayHeight) * 100}%`,
      width: `${(crop.size / displayWidth) * 100}%`,
      height: `${(crop.size / displayHeight) * 100}%`,
    } satisfies CSSProperties;
  }, [crop, mode, selectedFrame, selectedFrameUrl]);

  // Auto-select first middle frame when frames change
  useEffect((): void => {
    if (!selectedFrameId && frames.length > 0) {
      const preferredFrame = frames.find((f): boolean => f.kind === 'middle') ?? frames[0];
      if (preferredFrame) {
        setSelectedFrameId(preferredFrame.id);
        const url = frameUrls[preferredFrame.id] ?? null;
        setSelectedFrameUrl(url);
        setCrop(
          clampCrop(defaultCrop(preferredFrame.width, preferredFrame.height), preferredFrame)
        );
      }
    }
  }, [frames, frameUrls, selectedFrameId, clampCrop]);

  // Reset mode when frame changes
  useEffect((): void => {
    setMode('global');
  }, [selectedFrameId]);

  return {
    selectedFrameId,
    selectedFrameUrl,
    selectedFrame,
    mode,
    crop,
    feather,
    cropOverlayStyle,
    setMode,
    setCrop,
    setFeather,
    handleFrameSelect,
    handleImageClick,
    clampCrop,
  };
}
