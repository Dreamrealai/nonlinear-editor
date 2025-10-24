/**
 * useAssetThumbnails Hook
 *
 * Handles thumbnail generation, caching, and updating for assets.
 */
'use client';

import { useEffect, useRef } from 'react';
import { browserLogger } from '@/lib/browserLogger';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { safeArrayFirst } from '@/lib/utils/arrayUtils';
import { THUMBNAIL_WIDTH } from '@/lib/utils/assetUtils';
import type { AssetRow } from '@/components/editor/AssetPanel';

/**
 * Creates a thumbnail from an image blob.
 */
export const createImageThumbnail = (blob: Blob): Promise<string | null> =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, THUMBNAIL_WIDTH / Math.max(1, img.width));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve(dataUrl);
      } catch (error) {
        browserLogger.error({ error }, 'Failed to create image thumbnail');
        resolve(null);
      } finally {
        URL.revokeObjectURL(url);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };

    img.src = url;
  });

/**
 * Creates a thumbnail from a video blob.
 */
export const createVideoThumbnail = (blob: Blob): Promise<string | null> =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const video = document.createElement('video');
    let resolved = false;

    const cleanup = (value: string | null) => {
      if (resolved) return;
      resolved = true;
      video.pause();
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(url);
      resolve(value);
    };

    const captureFrame = () => {
      video.removeEventListener('seeked', captureFrame);
      try {
        if (video.videoWidth === 0 || video.videoHeight === 0) {
          cleanup(null);
          return;
        }
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, THUMBNAIL_WIDTH / Math.max(1, video.videoWidth));
        const width = Math.max(1, Math.round(video.videoWidth * scale));
        const height = Math.max(1, Math.round(video.videoHeight * scale));
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          cleanup(null);
          return;
        }
        ctx.drawImage(video, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        cleanup(dataUrl);
      } catch (error) {
        browserLogger.error({ error }, 'Failed to capture video thumbnail');
        cleanup(null);
      }
    };

    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';

    video.addEventListener('error', () => cleanup(null));
    video.addEventListener('seeked', captureFrame);
    video.addEventListener('loadedmetadata', () => {
      try {
        const duration = Number.isFinite(video.duration) ? video.duration : 0;
        if (duration > 1) {
          const target = Math.min(Math.max(duration / 2, 0.5), duration - 0.1);
          video.currentTime = target;
        } else {
          video.currentTime = 0.1;
        }
      } catch (error) {
        browserLogger.error({ error }, 'Failed to seek video for thumbnail');
        cleanup(null);
      }
    });

    video.src = url;
  });

export interface UseAssetThumbnailsReturn {
  /** Ref to track processed thumbnail IDs to prevent duplicate processing */
  processedThumbnailIdsRef: React.MutableRefObject<Set<string>>;
}

/**
 * Hook to manage automatic thumbnail generation for assets.
 *
 * Automatically generates thumbnails for assets that don't have them,
 * updates the database, and manages memory by cleaning up blob URLs.
 */
export function useAssetThumbnails(
  assets: AssetRow[],
  assetsLoaded: boolean,
  onAssetUpdate: (assetId: string, thumbnail: string) => void
): UseAssetThumbnailsReturn {
  const supabase = createBrowserSupabaseClient();
  const processedThumbnailIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!assetsLoaded) {
      return;
    }

    const missingThumbnails = assets.filter((asset) => {
      if (processedThumbnailIdsRef.current.has(asset.id)) {
        return false;
      }
      processedThumbnailIdsRef.current.add(asset.id);
      return !asset.metadata?.thumbnail && asset.type !== 'audio';
    });

    if (!missingThumbnails.length) {
      return;
    }

    // CRITICAL FIX: Track blob URLs for cleanup to prevent memory leaks
    const blobUrls: string[] = [];

    void (async () => {
      for (const asset of missingThumbnails) {
        try {
          // Safely extract bucket from storage URL
          const urlParts = asset.storage_url.replace('supabase://', '').split('/');
          const bucket = safeArrayFirst(urlParts);
          if (!bucket) {
            browserLogger.error(
              { storageUrl: asset.storage_url, assetId: asset.id },
              'Invalid storage URL format'
            );
            continue;
          }

          const signedUrlResponse = await supabase.storage.from(bucket).createSignedUrl(
            asset.storage_url
              .replace(/^supabase:\/\//, '')
              .split('/')
              .slice(1)
              .join('/'),
            600
          );

          if (!signedUrlResponse.data?.signedUrl) {
            continue;
          }

          const response = await fetch(signedUrlResponse.data.signedUrl);
          const blob = await response.blob();

          // CRITICAL FIX: Track the blob URL so we can clean it up later
          const blobUrl = URL.createObjectURL(blob);
          blobUrls.push(blobUrl);

          let thumbnail: string | null = null;
          if (asset.type === 'image') {
            thumbnail = await createImageThumbnail(blob);
          } else if (asset.type === 'video') {
            thumbnail = await createVideoThumbnail(blob);
          }

          // CRITICAL FIX: Revoke blob URL immediately after thumbnail generation
          URL.revokeObjectURL(blobUrl);
          const index = blobUrls.indexOf(blobUrl);
          if (index > -1) {
            blobUrls.splice(index, 1);
          }

          if (!thumbnail) continue;

          await supabase
            .from('assets')
            .update({
              metadata: {
                ...(asset.metadata ?? {}),
                thumbnail,
              },
            })
            .eq('id', asset.id);

          onAssetUpdate(asset.id, thumbnail);
        } catch (error) {
          browserLogger.error({ error, assetId: asset.id }, 'Failed to generate thumbnail');
        }
      }

      // CRITICAL FIX: Clean up any remaining blob URLs
      blobUrls.forEach((url) => URL.revokeObjectURL(url));
    })();

    // CRITICAL FIX: Cleanup on unmount
    return () => {
      blobUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [assets, assetsLoaded, supabase, onAssetUpdate]);

  return {
    processedThumbnailIdsRef,
  };
}
