/**
 * Frame Utilities
 *
 * Shared utilities for frame extraction, upload, and database operations.
 * Consolidates duplicated logic from keyframe hooks.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { browserLogger } from '@/lib/browserLogger';
import type { BaseAssetRow } from '@/types/assets';

// Re-export for backward compatibility
export type { BaseAssetRow as AssetRow } from '@/types/assets';

/**
 * Frame insertion parameters
 */
export interface FrameInsertParams {
  projectId: string | undefined;
  assetId: string;
  sceneId?: string | null;
  kind: 'custom' | 'scene' | 'generated';
  timeMs: number;
  storagePath: string;
  width: number;
  height: number;
}

/**
 * Creates an asset Map for O(1) lookup performance
 *
 * @param assets - Array of assets to index
 * @returns Map of asset ID to asset object
 */
export function createAssetMap(assets: BaseAssetRow[]): Map<string, BaseAssetRow> {
  return new Map(assets.map((a) => [a.id, a]));
}

/**
 * Inserts a frame record into the scene_frames table
 *
 * @param supabase - Supabase client instance
 * @param params - Frame insertion parameters
 * @returns Promise resolving to void on success
 * @throws Error if insertion fails
 */
export async function insertSceneFrame(
  supabase: SupabaseClient,
  params: FrameInsertParams
): Promise<void> {
  const { error: insertError } = await supabase.from('scene_frames').insert({
    project_id: params.projectId,
    asset_id: params.assetId,
    scene_id: params.sceneId ?? null,
    kind: params.kind,
    t_ms: params.timeMs,
    storage_path: params.storagePath,
    width: params.width,
    height: params.height,
  });

  if (insertError) {
    browserLogger.error({ error: insertError, params }, 'Failed to insert scene frame');
    throw insertError;
  }
}

/**
 * Uploads a blob to the frames storage bucket
 *
 * @param supabase - Supabase client instance
 * @param fileName - Path within the frames bucket
 * @param blob - Blob to upload
 * @param contentType - MIME type of the content
 * @returns Promise resolving to storage path on success
 * @throws Error if upload fails
 */
export async function uploadFrameBlob(
  supabase: SupabaseClient,
  fileName: string,
  blob: Blob,
  contentType: string
): Promise<string> {
  const { error: uploadError } = await supabase.storage.from('frames').upload(fileName, blob, {
    contentType,
    upsert: false,
  });

  if (uploadError) {
    browserLogger.error({ error: uploadError, fileName }, 'Failed to upload frame blob');
    throw uploadError;
  }

  return `supabase://frames/${fileName}`;
}

/**
 * Extracts a frame from a video element to a canvas
 *
 * @param video - Video element to extract from
 * @param canvas - Canvas element to draw to
 * @returns Promise resolving to blob and dimensions on success
 * @throws Error if extraction fails
 */
export async function extractVideoFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement
): Promise<{ blob: Blob; width: number; height: number }> {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Could not get canvas context');
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/png');
  });

  if (!blob) {
    throw new Error('Failed to create image blob');
  }

  return {
    blob,
    width: canvas.width,
    height: canvas.height,
  };
}

/**
 * Loads an image from a File and returns dimensions
 *
 * @param file - Image file to load
 * @returns Promise resolving to image element and dimensions
 * @throws Error if image fails to load
 */
export async function loadImageFromFile(
  file: File
): Promise<{ img: HTMLImageElement; width: number; height: number }> {
  const img = new Image();
  const imageUrl = URL.createObjectURL(file);

  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageUrl;
    });

    return {
      img,
      width: img.width,
      height: img.height,
    };
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

/**
 * Generates a frame filename with timestamp
 *
 * @param assetId - Asset ID for the frame
 * @param suffix - Optional suffix (e.g., 'pasted', '100ms')
 * @returns Generated filename
 */
export function generateFrameFileName(assetId: string, suffix?: string): string {
  const timestamp = Date.now();
  const filenamePart = suffix ? `-${suffix}` : '';
  return `${assetId}/custom/${timestamp}${filenamePart}.png`;
}

/**
 * Complete workflow for extracting and saving a video frame
 *
 * @param supabase - Supabase client
 * @param video - Video element
 * @param canvas - Canvas element
 * @param assetId - Asset ID
 * @param assets - Array of all assets
 * @returns Promise resolving on success
 */
export async function extractAndSaveVideoFrame(
  supabase: SupabaseClient,
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  assetId: string,
  assets: BaseAssetRow[]
): Promise<void> {
  // Extract frame
  const { blob, width, height } = await extractVideoFrame(video, canvas);

  // Generate filename
  const currentTimeMs = Math.round(video.currentTime * 1000);
  const fileName = generateFrameFileName(assetId, `${currentTimeMs}ms`);

  // Upload to storage
  const storagePath = await uploadFrameBlob(supabase, fileName, blob, 'image/png');

  // Get project ID from asset
  const assetMap = createAssetMap(assets);
  const currentAsset = assetMap.get(assetId);

  // Insert database record
  await insertSceneFrame(supabase, {
    projectId: currentAsset?.metadata?.project_id as string | undefined,
    assetId,
    kind: 'custom',
    timeMs: currentTimeMs,
    storagePath,
    width,
    height,
  });
}

/**
 * Complete workflow for uploading and saving an image file as a frame
 *
 * @param supabase - Supabase client
 * @param file - Image file
 * @param assetId - Asset ID
 * @param assets - Array of all assets
 * @param timeMs - Optional time in milliseconds (defaults to 0)
 * @returns Promise resolving on success
 */
export async function uploadAndSaveImageFrame(
  supabase: SupabaseClient,
  file: File,
  assetId: string,
  assets: BaseAssetRow[],
  timeMs = 0
): Promise<void> {
  // Load image and get dimensions
  const { width, height } = await loadImageFromFile(file);

  // Generate filename
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
  const fileName = generateFrameFileName(assetId, baseName);

  // Upload to storage
  const storagePath = await uploadFrameBlob(supabase, fileName, file, file.type);

  // Get project ID from asset
  const assetMap = createAssetMap(assets);
  const currentAsset = assetMap.get(assetId);

  // Insert database record
  await insertSceneFrame(supabase, {
    projectId: currentAsset?.metadata?.project_id as string | undefined,
    assetId,
    kind: 'custom',
    timeMs,
    storagePath,
    width,
    height,
  });
}
