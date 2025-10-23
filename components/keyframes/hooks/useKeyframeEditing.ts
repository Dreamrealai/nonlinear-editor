import { useState, useCallback } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

type Mode = 'global' | 'crop';

interface CropState {
  x: number;
  y: number;
  size: number;
}

interface RefImage {
  id: string;
  file: File;
  previewUrl: string;
  uploading: boolean;
  uploadedUrl?: string;
}

interface UseKeyframeEditingProps {
  supabase: SupabaseClient;
  selectedFrameId: string | null;
  selectedAssetId: string | null;
  mode: Mode;
  crop: CropState;
  feather: number;
  signStoragePath: (storagePath: string, expiresIn?: number) => Promise<string | null>;
  onRefreshNeeded: () => void;
}

interface UseKeyframeEditingReturn {
  prompt: string;
  setPrompt: (prompt: string) => void;
  isSubmitting: boolean;
  submitError: string | null;
  refImages: RefImage[];
  handleSubmit: () => Promise<void>;
  handleRefImageSelect: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleRemoveRefImage: (id: string) => void;
  handlePaste: (event: ClipboardEvent) => Promise<void>;
}

export function useKeyframeEditing({
  supabase,
  selectedFrameId,
  selectedAssetId,
  mode,
  crop,
  feather,
  signStoragePath,
  onRefreshNeeded,
}: UseKeyframeEditingProps): UseKeyframeEditingReturn {
  const [prompt, setPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [refImages, setRefImages] = useState<RefImage[]>([]);

  const handleSubmit = useCallback(async () => {
    if (!selectedFrameId) return;
    if (!prompt.trim()) {
      setSubmitError('Prompt is required.');
      return;
    }

    // Check if any reference images are still uploading
    const uploadingImages = refImages.filter((img) => img.uploading);
    if (uploadingImages.length > 0) {
      setSubmitError('Please wait for all reference images to finish uploading.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const refImageUrls = refImages.filter((img) => img.uploadedUrl).map((img) => img.uploadedUrl!);

      const response = await fetch(`/api/frames/${selectedFrameId}/edit`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          mode,
          prompt,
          crop: mode === 'crop' ? crop : undefined,
          featherPx: mode === 'crop' ? feather : undefined,
          refImages: refImageUrls,
          numVariations: 4,
        }),
      });

      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.error ?? 'Failed to run edit');
      }

      setPrompt('');
      refImages.forEach((img) => URL.revokeObjectURL(img.previewUrl));
      setRefImages([]);
      onRefreshNeeded();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedFrameId, prompt, refImages, mode, crop, feather, onRefreshNeeded]);

  const handleRefImageSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
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
          console.error('Failed to upload reference image:', error);
          setRefImages((prev) => prev.filter((item) => item.id !== img.id));
          alert(`Failed to upload ${img.file.name}. Please try again.`);
        }
      }
    },
    [selectedAssetId, supabase, signStoragePath]
  );

  const handleRemoveRefImage = useCallback((id: string) => {
    setRefImages((prev) => {
      const image = prev.find((img) => img.id === id);
      if (image) {
        URL.revokeObjectURL(image.previewUrl);
      }
      return prev.filter((img) => img.id !== id);
    });
  }, []);

  const handlePaste = useCallback(
    async (event: ClipboardEvent) => {
      if (!selectedAssetId) return;

      const items = event.clipboardData?.items;
      if (!items) return;

      const imageItems = Array.from(items).filter((item) => item.type.startsWith('image/'));
      if (imageItems.length === 0) return;

      event.preventDefault();

      for (const item of imageItems) {
        const file = item.getAsFile();
        if (!file) continue;

        const target = event.target as HTMLElement;
        const isPastingIntoPrompt = target.tagName === 'TEXTAREA';

        if (isPastingIntoPrompt) {
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
            console.error('Failed to upload pasted image:', error);
            setRefImages((prev) => prev.filter((item) => item.id !== newImage.id));
            alert('Failed to upload pasted image. Please try again.');
          }
        }
      }
    },
    [selectedAssetId, supabase, signStoragePath]
  );

  return {
    prompt,
    setPrompt,
    isSubmitting,
    submitError,
    refImages,
    handleSubmit,
    handleRefImageSelect,
    handleRemoveRefImage,
    handlePaste,
  };
}
