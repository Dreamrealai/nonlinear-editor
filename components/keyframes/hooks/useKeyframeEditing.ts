import { useState, useCallback } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { browserLogger } from '@/lib/browserLogger';
import toast from 'react-hot-toast';

export type Mode = 'global' | 'crop';

export interface CropState {
  x: number;
  y: number;
  size: number;
}

export interface RefImage {
  id: string;
  file: File;
  previewUrl: string;
  uploading: boolean;
  uploadedUrl?: string;
}

export interface UseKeyframeEditingProps {
  supabase: SupabaseClient;
  selectedFrameId: string | null;
  selectedAssetId: string | null;
  mode: Mode;
  crop: CropState;
  feather: number;
  signStoragePath: (storagePath: string, expiresIn?: number) => Promise<string | null>;
  onRefreshNeeded: () => void;
}

export interface UseKeyframeEditingReturn {
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

  const handleSubmit = useCallback(async (): Promise<void> => {
    if (!selectedFrameId) return;
    if (!prompt.trim()) {
      setSubmitError('Prompt is required.');
      return;
    }

    // Check if any reference images are still uploading
    const uploadingImages = refImages.filter((img): boolean => img.uploading);
    if (uploadingImages.length > 0) {
      setSubmitError('Please wait for all reference images to finish uploading.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const refImageUrls = refImages
        .filter((img): string | undefined => img.uploadedUrl)
        .map((img): string => img.uploadedUrl!);

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
      refImages.forEach((img): void => URL.revokeObjectURL(img.previewUrl));
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
    async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
      const files = event.target.files;
      if (!files || !selectedAssetId) return;

      const imageFiles = Array.from(files).filter((file): boolean =>
        file.type.startsWith('image/')
      );
      if (imageFiles.length === 0) {
        toast.error('Please select image files');
        return;
      }

      const newImages = imageFiles.map(
        (file): { id: string; file: File; previewUrl: string; uploading: boolean } => ({
          id: `${Date.now()}-${Math.random()}`,
          file,
          previewUrl: URL.createObjectURL(file),
          uploading: false,
        })
      );

      setRefImages((prev): { id: string; file: File; previewUrl: string; uploading: boolean }[] => [
        ...prev,
        ...newImages,
      ]);

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
            prev.map(
              (item): RefImage =>
                item.id === img.id
                  ? { ...item, uploading: false, uploadedUrl: signedUrl ?? undefined }
                  : item
            )
          );
        } catch (error) {
          browserLogger.error(
            { error, selectedAssetId, fileName: img.file.name },
            'Failed to upload reference image'
          );
          setRefImages((prev): RefImage[] => prev.filter((item): boolean => item.id !== img.id));
          toast.error(`Failed to upload ${img.file.name}. Please try again.`);
        }
      }
    },
    [selectedAssetId, supabase, signStoragePath]
  );

  const handleRemoveRefImage = useCallback((id: string): void => {
    setRefImages((prev): RefImage[] => {
      const image = prev.find((img): boolean => img.id === id);
      if (image) {
        URL.revokeObjectURL(image.previewUrl);
      }
      return prev.filter((img): boolean => img.id !== id);
    });
  }, []);

  const handlePaste = useCallback(
    async (event: ClipboardEvent): Promise<void> => {
      if (!selectedAssetId) return;

      const items = event.clipboardData?.items;
      if (!items) return;

      const imageItems = Array.from(items).filter((item): boolean =>
        item.type.startsWith('image/')
      );
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

          setRefImages(
            (prev): { id: string; file: File; previewUrl: string; uploading: boolean }[] => [
              ...prev,
              newImage,
            ]
          );

          setRefImages((prev): RefImage[] =>
            prev.map(
              (item): RefImage => (item.id === newImage.id ? { ...item, uploading: true } : item)
            )
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
              prev.map(
                (item): RefImage =>
                  item.id === newImage.id
                    ? { ...item, uploading: false, uploadedUrl: signedUrl ?? undefined }
                    : item
              )
            );
          } catch (error) {
            browserLogger.error({ error, selectedAssetId }, 'Failed to upload pasted image');
            setRefImages((prev): RefImage[] =>
              prev.filter((item): boolean => item.id !== newImage.id)
            );
            toast.error('Failed to upload pasted image. Please try again.');
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
