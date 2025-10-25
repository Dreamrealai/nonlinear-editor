import { useCallback, useEffect, useState, useRef } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { browserLogger } from '@/lib/browserLogger';
import toast from 'react-hot-toast';
import {
  extractAndSaveVideoFrame,
  uploadAndSaveImageFrame,
  createAssetMap,
  type AssetRow,
} from '@/lib/utils/frameUtils';

export interface UseImageUploadProps {
  supabase: SupabaseClient;
  selectedAssetId: string | null;
  assets: AssetRow[];
  signStoragePath: (storagePath: string, expiresIn?: number) => Promise<string | null>;
  onRefreshNeeded: () => void;
}

export interface UseImageUploadReturn {
  assetVideoUrl: string | null;
  showVideoPlayer: boolean;
  setShowVideoPlayer: (show: boolean) => void;
  isVideoReady: boolean;
  isExtractingFrame: boolean;
  isUploadingImage: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleExtractFrame: () => Promise<void>;
  handleImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handlePasteAsKeyframe: (event: ClipboardEvent) => Promise<void>;
}

export function useImageUpload({
  supabase,
  selectedAssetId,
  assets,
  signStoragePath,
  onRefreshNeeded,
}: UseImageUploadProps): UseImageUploadReturn {
  const [assetVideoUrl, setAssetVideoUrl] = useState<string | null>(null);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isExtractingFrame, setIsExtractingFrame] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load video URL when asset is selected
  useEffect((): void => {
    if (!selectedAssetId) {
      setAssetVideoUrl(null);
      return;
    }
    const assetMap = createAssetMap(assets);
    const asset = assetMap.get(selectedAssetId);
    if (asset) {
      void signStoragePath(asset.storage_url).then(setAssetVideoUrl);
    }
  }, [selectedAssetId, assets, signStoragePath]);

  // Track video readiness
  useEffect((): (() => void) | undefined => {
    const video = videoRef.current;
    if (!video || !showVideoPlayer) {
      setIsVideoReady(false);
      return;
    }

    const handleLoadedMetadata = (): void => {
      setIsVideoReady(true);
    };

    if (video.readyState >= 1) {
      setIsVideoReady(true);
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    return (): void => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [showVideoPlayer, assetVideoUrl]);

  const handleExtractFrame = useCallback(async (): Promise<void> => {
    if (!videoRef.current || !canvasRef.current || !selectedAssetId) return;

    setIsExtractingFrame(true);
    try {
      await extractAndSaveVideoFrame(
        supabase,
        videoRef.current,
        canvasRef.current,
        selectedAssetId,
        assets
      );

      onRefreshNeeded();
      setShowVideoPlayer(false);
    } catch (error) {
      browserLogger.error({ error, selectedAssetId }, 'Failed to extract frame');
      toast.error('Failed to extract frame. Please try again.');
    } finally {
      setIsExtractingFrame(false);
    }
  }, [selectedAssetId, assets, supabase, onRefreshNeeded]);

  const handleImageUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
      const file = event.target.files?.[0];
      if (!file || !selectedAssetId) return;

      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      setIsUploadingImage(true);
      try {
        await uploadAndSaveImageFrame(supabase, file, selectedAssetId, assets, 0);

        onRefreshNeeded();

        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
        browserLogger.error({ error, selectedAssetId }, 'Failed to upload image');
        toast.error('Failed to upload image. Please try again.');
      } finally {
        setIsUploadingImage(false);
      }
    },
    [selectedAssetId, assets, supabase, onRefreshNeeded]
  );

  const handlePasteAsKeyframe = useCallback(
    async (event: ClipboardEvent): Promise<void> => {
      if (!selectedAssetId) return;

      const items = event.clipboardData?.items;
      if (!items) return;

      const imageItems = Array.from(items).filter((item): boolean =>
        item.type.startsWith('image/')
      );
      if (imageItems.length === 0) return;

      const target = event.target as HTMLElement;
      const isPastingIntoPrompt = target.tagName === 'TEXTAREA';

      // Only handle non-prompt pastes here
      if (isPastingIntoPrompt) return;

      event.preventDefault();

      for (const item of imageItems) {
        const file = item.getAsFile();
        if (!file) continue;

        setIsUploadingImage(true);
        try {
          await uploadAndSaveImageFrame(supabase, file, selectedAssetId, assets, 0);
          onRefreshNeeded();
        } catch (error) {
          browserLogger.error({ error, selectedAssetId }, 'Failed to upload pasted image');
          toast.error('Failed to upload pasted image. Please try again.');
        } finally {
          setIsUploadingImage(false);
        }
      }
    },
    [selectedAssetId, assets, supabase, onRefreshNeeded]
  );

  return {
    assetVideoUrl,
    showVideoPlayer,
    setShowVideoPlayer,
    isVideoReady,
    isExtractingFrame,
    isUploadingImage,
    videoRef: videoRef as React.RefObject<HTMLVideoElement>,
    canvasRef: canvasRef as React.RefObject<HTMLCanvasElement>,
    fileInputRef: fileInputRef as React.RefObject<HTMLInputElement>,
    handleExtractFrame,
    handleImageUpload,
    handlePasteAsKeyframe,
  };
}
