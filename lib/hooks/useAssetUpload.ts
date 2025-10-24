/**
 * useAssetUpload Hook
 *
 * Handles asset upload operations including validation,
 * thumbnail generation, and database record creation.
 */
'use client';

import { useCallback } from 'react';
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
import type { AssetMetadata, AssetRow } from '@/components/editor/AssetPanel';

/**
 * Uploads a media file to Supabase storage and creates a database record.
 */
async function uploadAssetToStorage(
  file: File,
  projectId: string,
  assetType: AssetRow['type']
): Promise<AssetRow> {
  const supabase = createBrowserSupabaseClient();
  const { data: userResult, error: userError } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  const user = userResult?.user;

  if (!user) {
    throw new Error('User session is required to upload assets');
  }

  const sanitizedFileName = sanitizeFileName(file.name);
  const folder = file.type.startsWith('audio')
    ? 'audio'
    : file.type.startsWith('image')
      ? 'image'
      : 'video';
  const defaultPath = `${user.id}/${projectId}/${folder}/${uuid()}-${sanitizedFileName}`;
  const bucket = 'assets';
  const path = defaultPath;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, arrayBuffer, {
    contentType: file.type,
    upsert: true,
  });

  if (uploadError) {
    throw uploadError;
  }

  const displayFileName = file.name.trim() || extractFileName(path);

  const metadata: AssetMetadata = {
    filename: displayFileName,
    mimeType: file.type,
  };

  const mimeLower = file.type.toLowerCase();
  if (mimeLower.startsWith('image/')) {
    const thumb = await createImageThumbnail(new Blob([arrayBuffer], { type: file.type }));
    if (thumb) {
      metadata.thumbnail = thumb;
    }
  } else if (mimeLower.startsWith('video/')) {
    const thumb = await createVideoThumbnail(new Blob([arrayBuffer], { type: file.type }));
    if (thumb) {
      metadata.thumbnail = thumb;
    }
  }

  const { data: assetData, error: assetError } = await supabase
    .from('assets')
    .insert({
      id: uuid(),
      project_id: projectId,
      user_id: user.id,
      storage_url: `supabase://${bucket}/${path}`,
      type: assetType,
      metadata,
    })
    .select()
    .single();

  if (assetError) {
    throw assetError;
  }

  return assetData as AssetRow;
}

export interface UseAssetUploadReturn {
  /** Upload a file as an asset */
  uploadAsset: (file: File) => Promise<void>;
}

/**
 * Hook to handle asset uploads.
 *
 * Validates files, uploads to storage, generates thumbnails,
 * and creates database records.
 */
export function useAssetUpload(
  projectId: string,
  onUploadSuccess: () => Promise<void>
): UseAssetUploadReturn {
  const handleAssetUpload = useCallback(
    async (file: File) => {
      const type = getAssetTypeFromMimeType(file.type);

      try {
        await uploadAssetToStorage(file, projectId, type);
        await onUploadSuccess();
        toast.success('Asset uploaded');
      } catch (error) {
        browserLogger.error({ error, projectId, fileName: file.name }, 'Failed to upload asset');
        toast.error('Failed to upload asset');
      }
    },
    [projectId, onUploadSuccess]
  );

  return {
    uploadAsset: handleAssetUpload,
  };
}
