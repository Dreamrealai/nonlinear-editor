import { useCallback, useEffect, useState, useRef } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

interface AssetRow {
  id: string;
  title?: string | null;
  storage_url: string;
  metadata: Record<string, unknown> | null;
}

interface UseImageUploadProps {
  supabase: SupabaseClient;
  selectedAssetId: string | null;
  assets: AssetRow[];
  signStoragePath: (storagePath: string, expiresIn?: number) => Promise<string | null>;
  onRefreshNeeded: () => void;
}

interface UseImageUploadReturn {
  assetVideoUrl: string | null;
  showVideoPlayer: boolean;
  setShowVideoPlayer: (show: boolean) => void;
  isVideoReady: boolean;
  isExtractingFrame: boolean;
  isUploadingImage: boolean;
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  fileInputRef: React.RefObject<HTMLInputElement>;
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
  useEffect(() => {
    if (!selectedAssetId) {
      setAssetVideoUrl(null);
      return;
    }
    const asset = assets.find((a) => a.id === selectedAssetId);
    if (asset) {
      void signStoragePath(asset.storage_url).then(setAssetVideoUrl);
    }
  }, [selectedAssetId, assets, signStoragePath]);

  // Track video readiness
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !showVideoPlayer) {
      setIsVideoReady(false);
      return;
    }

    const handleLoadedMetadata = () => {
      setIsVideoReady(true);
    };

    if (video.readyState >= 1) {
      setIsVideoReady(true);
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [showVideoPlayer, assetVideoUrl]);

  const handleExtractFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !selectedAssetId) return;

    setIsExtractingFrame(true);
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Could not get canvas context');

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/png');
      });
      if (!blob) throw new Error('Failed to create image blob');

      const currentTimeMs = Math.round(video.currentTime * 1000);
      const fileName = `${selectedAssetId}/custom/${Date.now()}-${currentTimeMs}ms.png`;
      const { error: uploadError } = await supabase.storage
        .from('frames')
        .upload(fileName, blob, {
          contentType: 'image/png',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const storagePath = `supabase://frames/${fileName}`;
      const { error: insertError } = await supabase
        .from('scene_frames')
        .insert({
          project_id: assets.find((a) => a.id === selectedAssetId)?.metadata?.project_id,
          asset_id: selectedAssetId,
          scene_id: null,
          kind: 'custom',
          t_ms: currentTimeMs,
          storage_path: storagePath,
          width: canvas.width,
          height: canvas.height,
        });

      if (insertError) throw insertError;

      onRefreshNeeded();
      setShowVideoPlayer(false);
    } catch (error) {
      console.error('Failed to extract frame:', error);
      alert('Failed to extract frame. Please try again.');
    } finally {
      setIsExtractingFrame(false);
    }
  }, [selectedAssetId, assets, supabase, onRefreshNeeded]);

  const handleImageUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !selectedAssetId) return;

      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      setIsUploadingImage(true);
      try {
        const img = new Image();
        const imageUrl = URL.createObjectURL(file);
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = imageUrl;
        });
        URL.revokeObjectURL(imageUrl);

        const fileName = `${selectedAssetId}/custom/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('frames')
          .upload(fileName, file, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const storagePath = `supabase://frames/${fileName}`;
        const { error: insertError } = await supabase
          .from('scene_frames')
          .insert({
            project_id: assets.find((a) => a.id === selectedAssetId)?.metadata?.project_id,
            asset_id: selectedAssetId,
            scene_id: null,
            kind: 'custom',
            t_ms: 0,
            storage_path: storagePath,
            width: img.width,
            height: img.height,
          });

        if (insertError) throw insertError;

        onRefreshNeeded();

        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
        console.error('Failed to upload image:', error);
        alert('Failed to upload image. Please try again.');
      } finally {
        setIsUploadingImage(false);
      }
    },
    [selectedAssetId, assets, supabase, onRefreshNeeded]
  );

  const handlePasteAsKeyframe = useCallback(
    async (event: ClipboardEvent) => {
      if (!selectedAssetId) return;

      const items = event.clipboardData?.items;
      if (!items) return;

      const imageItems = Array.from(items).filter((item) => item.type.startsWith('image/'));
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
          const img = new Image();
          const imageUrl = URL.createObjectURL(file);
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = imageUrl;
          });
          URL.revokeObjectURL(imageUrl);

          const fileName = `${selectedAssetId}/custom/${Date.now()}-pasted.png`;
          const { error: uploadError } = await supabase.storage
            .from('frames')
            .upload(fileName, file, {
              contentType: file.type,
              upsert: false,
            });

          if (uploadError) throw uploadError;

          const storagePath = `supabase://frames/${fileName}`;
          const { error: insertError } = await supabase
            .from('scene_frames')
            .insert({
              project_id: assets.find((a) => a.id === selectedAssetId)?.metadata?.project_id,
              asset_id: selectedAssetId,
              scene_id: null,
              kind: 'custom',
              t_ms: 0,
              storage_path: storagePath,
              width: img.width,
              height: img.height,
            });

          if (insertError) throw insertError;

          onRefreshNeeded();
        } catch (error) {
          console.error('Failed to upload pasted image:', error);
          alert('Failed to upload pasted image. Please try again.');
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
    videoRef,
    canvasRef,
    fileInputRef,
    handleExtractFrame,
    handleImageUpload,
    handlePasteAsKeyframe,
  };
}
