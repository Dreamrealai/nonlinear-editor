/**
 * useAssetUploadProgress Hook
 *
 * Handles asset upload with accurate progress tracking including:
 * - Upload progress (0-80%) - File transfer to server
 * - Processing progress (80-100%) - Server-side processing (optimization, thumbnails, waveforms)
 *
 * Uses XMLHttpRequest for accurate upload progress tracking.
 * Server-side processing is synchronous, so progress jumps from 80% to 100% upon completion.
 */
'use client';

import { useState, useCallback, useRef } from 'react';
import { v4 as uuid } from 'uuid';
import toast from 'react-hot-toast';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { browserLogger } from '@/lib/browserLogger';
import { getAssetTypeFromMimeType } from '@/lib/utils/assetUtils';
import type { AssetRow } from '@/types/assets';

export interface UploadProgress {
  /** Unique ID for this upload */
  id: string;
  /** File being uploaded */
  file: File;
  /** Overall progress percentage (0-100) */
  progress: number;
  /** Current upload phase */
  phase: 'uploading' | 'processing' | 'complete' | 'error';
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
 * 1. Uploading (0-80%): File transfer to server via API
 * 2. Processing (80-100%): Server-side processing (optimization, thumbnails, waveforms, database)
 */
export function useAssetUploadProgress(
  projectId: string,
  onUploadSuccess: () => Promise<void>
): UseAssetUploadProgressReturn {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const xhrRef = useRef<Map<string, XMLHttpRequest>>(new Map());

  const updateUploadProgress = useCallback((id: string, update: Partial<UploadProgress>): void => {
    setUploads((prev): UploadProgress[] =>
      prev.map((upload): UploadProgress => (upload.id === id ? { ...upload, ...update } : upload))
    );
  }, []);

  const uploadAsset = useCallback(
    async (file: File): Promise<void> => {
      const uploadId = uuid();
      const type = getAssetTypeFromMimeType(file.type);

      // Initialize upload progress
      const initialUpload: UploadProgress = {
        id: uploadId,
        file,
        progress: 0,
        phase: 'uploading',
        status: 'Starting upload...',
      };

      setUploads((prev): UploadProgress[] => [...prev, initialUpload]);

      try {
        // Phase 1: Upload file (0-80%)
        const formData = new FormData();
        formData.append('file', file);
        formData.append('projectId', projectId);
        formData.append('type', type);

        // Use XMLHttpRequest for accurate upload progress
        const uploadResult = await new Promise<{ assetId: string; success: boolean }>(
          (resolve, reject): void => {
            const xhr = new XMLHttpRequest();
            xhrRef.current.set(uploadId, xhr);

            // Track upload progress (0-80%)
            xhr.upload.addEventListener('progress', (event): void => {
              if (event.lengthComputable) {
                const percentComplete = Math.round((event.loaded / event.total) * 80); // 0-80%
                updateUploadProgress(uploadId, {
                  progress: percentComplete,
                  status: 'Uploading...',
                  phase: 'uploading',
                });
              }
            });

            // Upload complete - server processing starts
            xhr.upload.addEventListener('load', (): void => {
              updateUploadProgress(uploadId, {
                progress: 80,
                phase: 'processing',
                status: 'Processing...',
              });
            });

            xhr.addEventListener('load', (): void => {
              if (xhr.status >= 200 && xhr.status < 300) {
                try {
                  const result = JSON.parse(xhr.responseText);
                  resolve(result);
                } catch (error) {
                  reject(new Error('Failed to parse upload response'));
                }
              } else {
                try {
                  const errorData = JSON.parse(xhr.responseText);
                  reject(new Error(errorData.error || `Upload failed with status ${xhr.status}`));
                } catch {
                  reject(new Error(`Upload failed with status ${xhr.status}`));
                }
              }
            });

            xhr.addEventListener('error', (): void => {
              reject(new Error('Upload failed - network error'));
            });

            xhr.addEventListener('abort', (): void => {
              reject(new Error('Upload cancelled'));
            });

            xhr.open('POST', '/api/assets/upload');
            xhr.send(formData);
          }
        );

        // Phase 2: Fetch asset to verify completion (80-100%)
        updateUploadProgress(uploadId, {
          progress: 90,
          phase: 'processing',
          status: 'Processing...',
        });

        const supabase = createBrowserSupabaseClient();
        const { data: assetData, error: assetError } = await supabase
          .from('assets')
          .select('*')
          .eq('id', uploadResult.assetId)
          .single();

        if (assetError || !assetData) {
          throw new Error('Failed to fetch uploaded asset');
        }

        // Complete (100%)
        updateUploadProgress(uploadId, {
          progress: 100,
          phase: 'complete',
          status: 'Complete',
          asset: assetData as AssetRow,
        });

        await onUploadSuccess();
        toast.success(`${file.name} uploaded successfully`);

        // Auto-clear after 3 seconds
        setTimeout((): void => {
          setUploads((prev): UploadProgress[] => prev.filter((u): boolean => u.id !== uploadId));
        }, 3000);
      } catch (error) {
        browserLogger.error({ error, projectId, fileName: file.name }, 'Failed to upload asset');

        updateUploadProgress(uploadId, {
          phase: 'error',
          status: 'Failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        toast.error(`Failed to upload ${file.name}`);
      } finally {
        xhrRef.current.delete(uploadId);
      }
    },
    [projectId, onUploadSuccess, updateUploadProgress]
  );

  const clearUpload = useCallback((id: string): void => {
    // Cancel upload if still in progress
    const xhr = xhrRef.current.get(id);
    if (xhr) {
      xhr.abort();
      xhrRef.current.delete(id);
    }

    setUploads((prev): UploadProgress[] => prev.filter((u): boolean => u.id !== id));
  }, []);

  const clearAllUploads = useCallback((): void => {
    // Cancel all in-progress uploads
    xhrRef.current.forEach((xhr): void => xhr.abort());
    xhrRef.current.clear();

    setUploads([]);
  }, []);

  return {
    uploads,
    uploadAsset,
    clearUpload,
    clearAllUploads,
  };
}
