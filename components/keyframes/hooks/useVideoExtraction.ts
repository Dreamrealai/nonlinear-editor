import { useState, useEffect, useRef, useCallback } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { browserLogger } from '@/lib/browserLogger';

interface AssetRow {
  id: string;
  title?: string | null;
  storage_url: string;
  metadata: Record<string, unknown> | null;
}

export function useVideoExtraction(
  supabase: SupabaseClient,
  assets: AssetRow[],
  selectedAssetId: string | null,
  signStoragePath: (path: string) => Promise<string | null>,
  onFrameExtracted: () => void
) {
  const [assetVideoUrl, setAssetVideoUrl] = useState<string | null>(null);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isExtractingFrame, setIsExtractingFrame] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleExtractFrame = async () => {
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

      onFrameExtracted();
      setShowVideoPlayer(false);
    } catch (error) {
      browserLogger.error({ error, selectedAssetId }, 'Failed to extract frame');
      alert('Failed to extract frame. Please try again.');
    } finally {
      setIsExtractingFrame(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

      onFrameExtracted();

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      browserLogger.error({ error, fileName: file.name, selectedAssetId }, 'Failed to upload image');
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const uploadPastedImage = useCallback(async (file: File) => {
    if (!selectedAssetId) return;

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

      onFrameExtracted();
    } catch (error) {
      browserLogger.error({ error, selectedAssetId }, 'Failed to upload pasted image');
      alert('Failed to upload pasted image. Please try again.');
    } finally {
      setIsUploadingImage(false);
    }
  }, [selectedAssetId, assets, supabase, onFrameExtracted]);

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
    uploadPastedImage,
  };
}
