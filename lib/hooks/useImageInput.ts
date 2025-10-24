/**
 * useImageInput Hook
 *
 * Manages image input for video generation, including:
 * - File uploads
 * - Paste from clipboard
 * - Asset library selection
 * - Image preview management
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import type { ImageAsset } from '@/lib/utils/videoGenerationUtils';

export interface UseImageInputReturn {
  /** Currently selected file (from upload or paste) */
  selectedImage: File | null;
  /** Preview URL for the selected/uploaded image */
  imagePreviewUrl: string | null;
  /** Asset ID if selected from library */
  imageAssetId: string | null;
  /** File input ref for triggering file picker */
  fileInputRef: React.RefObject<HTMLInputElement>;
  /** Whether an image is currently being uploaded */
  uploadingImage: boolean;
  /** Handle file input change */
  handleFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Handle asset selection from library */
  handleAssetSelect: (asset: ImageAsset) => void;
  /** Clear the selected image */
  clearImage: () => void;
  /** Upload image to storage and return asset ID */
  uploadImageToStorage: (file: File, projectId: string) => Promise<string>;
  /** Set uploading state */
  setUploadingImage: (uploading: boolean) => void;
}

/**
 * Hook to manage image input for video generation
 */
export function useImageInput(): UseImageInputReturn {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageAssetId, setImageAssetId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null) as React.RefObject<HTMLInputElement>;

  // Clear selected image and preview
  const clearImage = useCallback(() => {
    setSelectedImage(null);
    setImageAssetId(null);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setImagePreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [imagePreviewUrl]);

  // Handle image file (from paste or upload)
  const handleImageFile = useCallback((file: File) => {
    setSelectedImage(file);
    setImageAssetId(null); // Clear asset library selection

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setImagePreviewUrl(previewUrl);
  }, []);

  // Handle paste events for images
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item && item.type.includes('image')) {
          const file = item.getAsFile();
          if (file) {
            handleImageFile(file);
            toast.success('Image pasted from clipboard!');
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handleImageFile]);

  // Handle file input change
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleImageFile(file);
        toast.success('Image selected!');
      }
    },
    [handleImageFile]
  );

  // Handle asset library image selection
  const handleAssetSelect = useCallback((asset: ImageAsset) => {
    setSelectedImage(null); // Clear file upload
    setImageAssetId(asset.id);
    setImagePreviewUrl(asset.metadata?.thumbnail || asset.storage_url);
    toast.success('Image selected from library!');
  }, []);

  // Upload image to Supabase storage
  const uploadImageToStorage = useCallback(
    async (file: File, projectId: string): Promise<string> => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectId', projectId);
      formData.append('type', 'image');

      const uploadRes = await fetch('/api/assets/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        const errorData = await uploadRes.json();
        throw new Error(errorData.error || 'Failed to upload image');
      }

      const { assetId } = await uploadRes.json();
      return assetId;
    },
    []
  );

  return {
    selectedImage,
    imagePreviewUrl,
    imageAssetId,
    fileInputRef,
    uploadingImage,
    handleFileInputChange,
    handleAssetSelect,
    clearImage,
    uploadImageToStorage,
    setUploadingImage,
  };
}
