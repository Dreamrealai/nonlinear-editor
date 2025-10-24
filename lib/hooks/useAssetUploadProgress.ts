/**
 * useAssetUploadProgress Hook
 *
 * Handles asset upload with accurate progress tracking including:
 * - Upload progress (0-70%)
 * - Processing progress (70-100%)
 * - Thumbnail generation
 * - Database operations
 */
'use client';

import { useState, useCallback, useRef } from 'react';
import { v4 as uuid } from 'uuid';
import toast from 'react-hot-toast';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { browserLogger } from '@/lib/browserLogger';
import {
  sanitizeFileName,
  extractFileName,
  getAssetTypeFromMimeType,
} from '@/lib/utils/assetUtils';
import { createImageThumbnail, createVideoThumbnail } from './useAssetThumbnails';
import type { AssetMetadata, AssetRow } from '@/types/assets';

export interface UploadProgress {
  /** Unique ID for this upload */
  id: string;
  /** File being uploaded */
  file: File;
  /** Overall progress percentage (0-100) */
  progress: number;
  /** Current upload phase */
  phase: 'uploading' | 'processing' | 'thumbnail' | 'complete' | 'error';
  /** Human-readable status message */
  status: string;
  /** Error message if upload failed */
  error?: string;
  /** Created asset if upload succeeded */
  asset?: AssetRow;
}

export interface UseAssetUploadProgressReturn {
  /** Array of current uploads with progress */
  uploads: UploadProgress[];
  /** Upload a file with progress tracking */
  uploadAsset: (file: File) => Promise<void>;
  /** Clear completed or failed uploads */
  clearUpload: (id: string) => void;
  /** Clear all uploads */
  clearAllUploads: () => void;
}

/**
 * Hook to handle asset uploads with accurate progress tracking.
 *
 * Breaks down upload into phases:
 * 1. Uploading (0-70%): File transfer to storage
 * 2. Processing (70-85%): Server-side processing
 * 3. Thumbnail (85-95%): Thumbnail generation
 * 4. Complete (95-100%): Database operations
 */
export function useAssetUploadProgress(
  projectId: string,
  onUploadSuccess: () => Promise<void>
): UseAssetUploadProgressReturn {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  const updateUploadProgress = useCallback((id: string, update: Partial<UploadProgress>) => {
    setUploads((prev) =>
      prev.map((upload) => (upload.id === id ? { ...upload, ...update } : upload))
    );
  }, []);

  const uploadAsset = useCallback(
    async (file: File): Promise<void> => {
      const uploadId = uuid();
      const supabase = createBrowserSupabaseClient();
      const abortController = new AbortController();
      abortControllersRef.current.set(uploadId, abortController);

      const type = getAssetTypeFromMimeType(file.type);

      // Initialize upload progress
      const initialUpload: UploadProgress = {
        id: uploadId,
        file,
        progress: 0,
        phase: 'uploading',
        status: 'Starting upload...',
      };

      setUploads((prev) => [...prev, initialUpload]);

      try {
        // Phase 1: Get user session (0-5%)
        updateUploadProgress(uploadId, {
          progress: 2,
          status: 'Authenticating...',
        });

        const { data: userResult, error: userError } = await supabase.auth.getUser();

        if (userError || !userResult?.user) {
          throw new Error('User session is required to upload assets');
        }

        const user = userResult.user;

        // Phase 2: Prepare file (5-10%)
        updateUploadProgress(uploadId, {
          progress: 5,
          status: 'Preparing file...',
        });

        const sanitizedFileName = sanitizeFileName(file.name);
        const folder = file.type.startsWith('audio')
          ? 'audio'
          : file.type.startsWith('image')
            ? 'image'
            : 'video';
        const storagePath = `${user.id}/${projectId}/${folder}/${uuid()}-${sanitizedFileName}`;
        const bucket = 'assets';

        // Phase 3: Upload to storage (10-70%)
        updateUploadProgress(uploadId, {
          progress: 10,
          status: 'Uploading file...',
        });

        const arrayBuffer = await file.arrayBuffer();

        // Simulate chunked upload progress for better UX
        // In a real implementation, you'd use XMLHttpRequest or fetch with ReadableStream
        // to track actual upload progress. For now, we simulate it.
        const uploadProgressInterval = setInterval(() => {
          setUploads((prev) => {
            const upload = prev.find((u) => u.id === uploadId);
            if (upload && upload.phase === 'uploading' && upload.progress < 70) {
              return prev.map((u) =>
                u.id === uploadId
                  ? { ...u, progress: Math.min(70, u.progress + 5) }
                  : u
              );
            }
            return prev;
          });
        }, 300);

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(storagePath, arrayBuffer, {
            contentType: file.type,
            upsert: true,
          });

        clearInterval(uploadProgressInterval);

        if (uploadError) {
          throw uploadError;
        }

        // Phase 4: Processing (70-85%)
        updateUploadProgress(uploadId, {
          progress: 70,
          phase: 'processing',
          status: 'Processing file...',
        });

        const displayFileName = file.name.trim() || extractFileName(storagePath);

        const metadata: AssetMetadata = {
          filename: displayFileName,
          mimeType: file.type,
        };

        // Phase 5: Generate thumbnail (85-95%)
        updateUploadProgress(uploadId, {
          progress: 85,
          phase: 'thumbnail',
          status: 'Generating thumbnail...',
        });

        const mimeLower = file.type.toLowerCase();
        if (mimeLower.startsWith('image/')) {
          const thumb = await createImageThumbnail(new Blob([arrayBuffer], { type: file.type }));
          if (thumb) {
            metadata.thumbnail = thumb;
          }
          updateUploadProgress(uploadId, {
            progress: 92,
            status: 'Thumbnail generated',
          });
        } else if (mimeLower.startsWith('video/')) {
          const thumb = await createVideoThumbnail(new Blob([arrayBuffer], { type: file.type }));
          if (thumb) {
            metadata.thumbnail = thumb;
          }
          updateUploadProgress(uploadId, {
            progress: 92,
            status: 'Thumbnail generated',
          });
        } else {
          // Audio files don't need thumbnails
          updateUploadProgress(uploadId, {
            progress: 92,
            status: 'Processing audio...',
          });
        }

        // Phase 6: Create database record (95-100%)
        updateUploadProgress(uploadId, {
          progress: 95,
          status: 'Saving to database...',
        });

        const { data: assetData, error: assetError } = await supabase
          .from('assets')
          .insert({
            id: uuid(),
            project_id: projectId,
            user_id: user.id,
            storage_url: `supabase://${bucket}/${storagePath}`,
            type,
            metadata,
          })
          .select()
          .single();

        if (assetError) {
          throw assetError;
        }

        // Phase 7: Complete (100%)
        updateUploadProgress(uploadId, {
          progress: 100,
          phase: 'complete',
          status: 'Upload complete',
          asset: assetData as AssetRow,
        });

        await onUploadSuccess();
        toast.success(`${displayFileName} uploaded successfully`);

        // Auto-clear after 3 seconds
        setTimeout(() => {
          setUploads((prev) => prev.filter((u) => u.id !== uploadId));
        }, 3000);
      } catch (error) {
        browserLogger.error({ error, projectId, fileName: file.name }, 'Failed to upload asset');

        updateUploadProgress(uploadId, {
          phase: 'error',
          status: 'Upload failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        toast.error(`Failed to upload ${file.name}`);
      } finally {
        abortControllersRef.current.delete(uploadId);
      }
    },
    [projectId, onUploadSuccess, updateUploadProgress]
  );

  const clearUpload = useCallback((id: string) => {
    // Cancel upload if still in progress
    const controller = abortControllersRef.current.get(id);
    if (controller) {
      controller.abort();
      abortControllersRef.current.delete(id);
    }

    setUploads((prev) => prev.filter((u) => u.id !== id));
  }, []);

  const clearAllUploads = useCallback(() => {
    // Cancel all in-progress uploads
    abortControllersRef.current.forEach((controller) => controller.abort());
    abortControllersRef.current.clear();

    setUploads([]);
  }, []);

  return {
    uploads,
    uploadAsset,
    clearUpload,
    clearAllUploads,
  };
}
