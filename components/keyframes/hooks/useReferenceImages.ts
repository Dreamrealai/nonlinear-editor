import { useState, useCallback, useRef, useEffect } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { browserLogger } from '@/lib/browserLogger';
import toast from 'react-hot-toast';

export interface RefImage {
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

  // CRITICAL FIX: Cleanup blob URLs on unmount to prevent memory leaks
  useEffect((): () => void => {
    return (): void => {
      refImages.forEach((img): void => URL.revokeObjectURL(img.previewUrl));
    };
  }, [refImages]);

  const handleRefImageSelect = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const files = event.target.files;
    if (!files || !selectedAssetId) return;

    const imageFiles = Array.from(files).filter((file): boolean => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      toast.error('Please select image files');
      return;
    }

    const newImages = imageFiles.map((file): { id: string; file: File; previewUrl: string; uploading: boolean; } => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      previewUrl: URL.createObjectURL(file),
      uploading: false,
    }));

    setRefImages((prev): { id: string; file: File; previewUrl: string; uploading: boolean; }[] => [...prev, ...newImages]);

    for (const img of newImages) {
      setRefImages((prev): RefImage[] =>
        prev.map((item): RefImage => (item.id === img.id ? { ...item, uploading: true } : item))
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

        setRefImages((prev): RefImage[] =>
          prev.map((item): RefImage =>
            item.id === img.id
              ? { ...item, uploading: false, uploadedUrl: signedUrl ?? undefined }
              : item
          )
        );
      } catch (error) {
        browserLogger.error(
          { error, fileName: img.file.name, selectedAssetId },
          'Failed to upload reference image'
        );
        setRefImages((prev): RefImage[] => prev.filter((item): boolean => item.id !== img.id));
        toast.error(`Failed to upload ${img.file.name}. Please try again.`);
      }
    }

    if (refImageInputRef.current) {
      refImageInputRef.current.value = '';
    }
  };

  const handleRemoveRefImage = (id: string): void => {
    setRefImages((prev): RefImage[] => {
      const image = prev.find((img): boolean => img.id === id);
      if (image) {
        URL.revokeObjectURL(image.previewUrl);
      }
      return prev.filter((img): boolean => img.id !== id);
    });
  };

  const clearRefImages = useCallback((): void => {
    refImages.forEach((img): void => URL.revokeObjectURL(img.previewUrl));
    setRefImages([]);
  }, [refImages]);

  const addRefImage = useCallback(
    async (file: File): Promise<void> => {
      if (!selectedAssetId) return;

      const newImage = {
        id: `${Date.now()}-${Math.random()}`,
        file,
        previewUrl: URL.createObjectURL(file),
        uploading: false,
      };

      setRefImages((prev): { id: string; file: File; previewUrl: string; uploading: boolean; }[] => [...prev, newImage]);

      setRefImages((prev): RefImage[] =>
        prev.map((item): RefImage => (item.id === newImage.id ? { ...item, uploading: true } : item))
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

        setRefImages((prev): RefImage[] =>
          prev.map((item): RefImage =>
            item.id === newImage.id
              ? { ...item, uploading: false, uploadedUrl: signedUrl ?? undefined }
              : item
          )
        );
      } catch (error) {
        browserLogger.error({ error, selectedAssetId }, 'Failed to upload pasted image');
        setRefImages((prev): RefImage[] => prev.filter((item): boolean => item.id !== newImage.id));
        toast.error('Failed to upload pasted image. Please try again.');
      }
    },
    [selectedAssetId, supabase, signStoragePath]
  );

  return {
    refImages,
    refImageInputRef,
    handleRefImageSelect,
    handleRemoveRefImage,
    clearRefImages,
    addRefImage,
  };
}
