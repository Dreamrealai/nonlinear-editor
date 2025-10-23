/**
 * useImageUpload Hook
 *
 * Consolidated hook for handling image uploads in the keyframe editor.
 * Supports uploading to Supabase storage and creating frame records.
 */
'use client';

import { useState, useCallback } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface ImageUploadParams {
  /** File to upload */
  file: File;
  /** Asset ID for organizing uploaded images */
  assetId: string;
  /** Project ID from asset metadata */
  projectId: string | null | undefined;
  /** Storage subfolder (e.g., 'custom' or 'refs') */
  subfolder: 'custom' | 'refs';
  /** Whether to create a frame record in the database */
  createFrameRecord?: boolean;
  /** Optional scene ID for the frame */
  sceneId?: string | null;
  /** Optional timestamp for the frame in milliseconds */
  timeMs?: number;
}

export interface UploadResult {
  /** Storage path in format supabase://bucket/path */
  storagePath: string;
  /** Width of the uploaded image */
  width: number;
  /** Height of the uploaded image */
  height: number;
  /** Signed URL for accessing the image (if requested) */
  signedUrl?: string;
}

export interface UseImageUploadReturn {
  /** Whether an upload is in progress */
  isUploading: boolean;
  /** Upload an image file */
  uploadImage: (params: ImageUploadParams) => Promise<UploadResult>;
  /** Upload an image and get its signed URL */
  uploadImageWithUrl: (params: ImageUploadParams, signStoragePath: (path: string, ttl: number) => Promise<string | null>) => Promise<UploadResult>;
}

/**
 * Hook to manage image uploads for keyframe editing.
 */
export function useImageUpload(supabase: SupabaseClient): UseImageUploadReturn {
  const [isUploading, setIsUploading] = useState(false);

  const uploadImage = useCallback(async (params: ImageUploadParams): Promise<UploadResult> => {
    const { file, assetId, projectId, subfolder, createFrameRecord = false, sceneId = null, timeMs = 0 } = params;

    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }

    setIsUploading(true);
    try {
      // Create an image to get dimensions
      const img = new Image();
      const imageUrl = URL.createObjectURL(file);
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = imageUrl;
      });
      URL.revokeObjectURL(imageUrl);

      // Upload the image to Supabase storage
      const fileName = `${assetId}/${subfolder}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('frames')
        .upload(fileName, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const storagePath = `supabase://frames/${fileName}`;

      // Create a frame record if requested
      if (createFrameRecord) {
        const { error: insertError } = await supabase
          .from('scene_frames')
          .insert({
            project_id: projectId,
            asset_id: assetId,
            scene_id: sceneId,
            kind: 'custom',
            t_ms: timeMs,
            storage_path: storagePath,
            width: img.width,
            height: img.height,
          });

        if (insertError) {
          throw insertError;
        }
      }

      return {
        storagePath,
        width: img.width,
        height: img.height,
      };
    } finally {
      setIsUploading(false);
    }
  }, [supabase]);

  const uploadImageWithUrl = useCallback(async (
    params: ImageUploadParams,
    signStoragePath: (path: string, ttl: number) => Promise<string | null>
  ): Promise<UploadResult> => {
    const result = await uploadImage(params);
    const signedUrl = await signStoragePath(result.storagePath, 3600);

    return {
      ...result,
      signedUrl: signedUrl ?? undefined,
    };
  }, [uploadImage]);

  return {
    isUploading,
    uploadImage,
    uploadImageWithUrl,
  };
}
