import { useState, useCallback, useRef } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { browserLogger } from '@/lib/browserLogger';

interface RefImage {
  id: string;
  file: File;
  previewUrl: string;
  uploading: boolean;
  uploadedUrl?: string;
}

export function useReferenceImages(
  supabase: SupabaseClient,
  selectedAssetId: string | null,
  signStoragePath: (path: string, ttl?: number) => Promise<string | null>
) {
  const [refImages, setRefImages] = useState<RefImage[]>([]);
  const refImageInputRef = useRef<HTMLInputElement>(null);

  const handleRefImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !selectedAssetId) return;

    const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      alert('Please select image files');
      return;
    }

    const newImages = imageFiles.map((file) => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      previewUrl: URL.createObjectURL(file),
      uploading: false,
    }));

    setRefImages((prev) => [...prev, ...newImages]);

    for (const img of newImages) {
      setRefImages((prev) =>
        prev.map((item) => (item.id === img.id ? { ...item, uploading: true } : item))
      );

      try {
        const fileName = `${selectedAssetId}/refs/${Date.now()}-${img.file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('frames')
          .upload(fileName, img.file, {
            contentType: img.file.type,
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const storagePath = `supabase://frames/${fileName}`;
        const signedUrl = await signStoragePath(storagePath, 3600);

        setRefImages((prev) =>
          prev.map((item) =>
            item.id === img.id
              ? { ...item, uploading: false, uploadedUrl: signedUrl ?? undefined }
              : item
          )
        );
      } catch (error) {
        browserLogger.error({ error, fileName: img.file.name, selectedAssetId }, 'Failed to upload reference image');
        setRefImages((prev) => prev.filter((item) => item.id !== img.id));
        alert(`Failed to upload ${img.file.name}. Please try again.`);
      }
    }

    if (refImageInputRef.current) {
      refImageInputRef.current.value = '';
    }
  };

  const handleRemoveRefImage = (id: string) => {
    setRefImages((prev) => {
      const image = prev.find((img) => img.id === id);
      if (image) {
        URL.revokeObjectURL(image.previewUrl);
      }
      return prev.filter((img) => img.id !== id);
    });
  };

  const clearRefImages = useCallback(() => {
    refImages.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    setRefImages([]);
  }, [refImages]);

  const addRefImage = useCallback(async (file: File) => {
    if (!selectedAssetId) return;

    const newImage = {
      id: `${Date.now()}-${Math.random()}`,
      file,
      previewUrl: URL.createObjectURL(file),
      uploading: false,
    };

    setRefImages((prev) => [...prev, newImage]);

    setRefImages((prev) =>
      prev.map((item) => (item.id === newImage.id ? { ...item, uploading: true } : item))
    );

    try {
      const fileName = `${selectedAssetId}/refs/${Date.now()}-pasted.png`;
      const { error: uploadError } = await supabase.storage
        .from('frames')
        .upload(fileName, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const storagePath = `supabase://frames/${fileName}`;
      const signedUrl = await signStoragePath(storagePath, 3600);

      setRefImages((prev) =>
        prev.map((item) =>
          item.id === newImage.id
            ? { ...item, uploading: false, uploadedUrl: signedUrl ?? undefined }
            : item
        )
      );
    } catch (error) {
      browserLogger.error({ error, selectedAssetId }, 'Failed to upload pasted image');
      setRefImages((prev) => prev.filter((item) => item.id !== newImage.id));
      alert('Failed to upload pasted image. Please try again.');
    }
  }, [selectedAssetId, supabase, signStoragePath]);

  return {
    refImages,
    refImageInputRef,
    handleRefImageSelect,
    handleRemoveRefImage,
    clearRefImages,
    addRefImage,
  };
}
