import { useState, useEffect, useRef, useCallback } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { browserLogger } from '@/lib/browserLogger';
import toast from 'react-hot-toast';
import {
  extractAndSaveVideoFrame,
  uploadAndSaveImageFrame,
  createAssetMap,
  type AssetRow,
} from '@/lib/utils/frameUtils';

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
    const assetMap = createAssetMap(assets);
    const asset = assetMap.get(selectedAssetId);
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
      await extractAndSaveVideoFrame(
        supabase,
        videoRef.current,
        canvasRef.current,
        selectedAssetId,
        assets
      );

      onFrameExtracted();
      setShowVideoPlayer(false);
    } catch (error) {
      browserLogger.error({ error, selectedAssetId }, 'Failed to extract frame');
      toast.error('Failed to extract frame. Please try again.');
    } finally {
      setIsExtractingFrame(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedAssetId) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setIsUploadingImage(true);
    try {
      await uploadAndSaveImageFrame(supabase, file, selectedAssetId, assets, 0);

      onFrameExtracted();

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      browserLogger.error(
        { error, fileName: file.name, selectedAssetId },
        'Failed to upload image'
      );
      toast.error('Failed to upload image. Please try again.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const uploadPastedImage = useCallback(
    async (file: File) => {
      if (!selectedAssetId) return;

      setIsUploadingImage(true);
      try {
        await uploadAndSaveImageFrame(supabase, file, selectedAssetId, assets, 0);
        onFrameExtracted();
      } catch (error) {
        browserLogger.error({ error, selectedAssetId }, 'Failed to upload pasted image');
        toast.error('Failed to upload pasted image. Please try again.');
      } finally {
        setIsUploadingImage(false);
      }
    },
    [selectedAssetId, assets, supabase, onFrameExtracted]
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
    uploadPastedImage,
  };
}
