/**
 * useAssetManager Hook (Composition)
 *
 * Manages asset loading, uploading, and deletion for a project.
 * Handles asset thumbnail generation and metadata parsing.
 *
 * This is a composition hook that combines smaller, focused hooks
 * for better maintainability while maintaining backward compatibility.
 */
'use client';

import { useCallback } from 'react';
import { useAssetList } from './useAssetList';
import { useAssetUpload } from './useAssetUpload';
import { useAssetDeletion } from './useAssetDeletion';
import { useAssetThumbnails } from './useAssetThumbnails';
import { ASSET_PAGINATION_CONSTANTS } from '@/lib/constants';
import type { AssetRow } from '@/components/editor/AssetPanel';

const { DEFAULT_PAGE_SIZE } = ASSET_PAGINATION_CONSTANTS;

export interface UseAssetManagerReturn {
  /** List of all assets */
  assets: AssetRow[];
  /** Whether assets are currently loading */
  loadingAssets: boolean;
  /** Error message if loading failed */
  assetError: string | null;
  /** Whether assets have been loaded at least once */
  assetsLoaded: boolean;
  /** Upload a new asset */
  uploadAsset: (file: File) => Promise<void>;
  /** Delete an asset */
  deleteAsset: (
    asset: AssetRow,
    timeline: { clips: Array<{ assetId: string }> } | null,
    setTimeline: (timeline: { clips: Array<{ assetId: string }> }) => void
  ) => Promise<void>;
  /** Reload assets from database */
  reloadAssets: () => Promise<void>;
  /** Current page number (0-indexed) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Total number of assets */
  totalCount: number;
  /** Whether there is a next page */
  hasNextPage: boolean;
  /** Whether there is a previous page */
  hasPreviousPage: boolean;
  /** Load next page */
  loadNextPage: () => Promise<void>;
  /** Load previous page */
  loadPreviousPage: () => Promise<void>;
  /** Go to specific page */
  goToPage: (page: number) => Promise<void>;
}

/**
 * Hook to manage assets for a project.
 *
 * This hook composes smaller, focused hooks to provide a complete
 * asset management solution with loading, uploading, deletion,
 * thumbnail generation, and pagination.
 */
export function useAssetManager(
  projectId: string,
  pageSize: number = DEFAULT_PAGE_SIZE
): UseAssetManagerReturn {
  // Asset listing and pagination
  const {
    assets,
    loadingAssets,
    assetError,
    assetsLoaded,
    reloadAssets,
    currentPage,
    totalPages,
    totalCount,
    hasNextPage,
    hasPreviousPage,
    loadNextPage,
    loadPreviousPage,
    goToPage,
    updateAsset,
    removeAsset,
  } = useAssetList(projectId, pageSize);

  // Asset upload
  const { uploadAsset } = useAssetUpload(projectId, async () => {
    // Reload the current page to show the new asset
    await reloadAssets();
  });

  // Asset deletion
  const { deleteAsset } = useAssetDeletion(projectId, (assetId: string) => {
    removeAsset(assetId);
  });

  // Automatic thumbnail generation
  const handleAssetUpdate = useCallback(
    (assetId: string, thumbnail: string) => {
      updateAsset(assetId, (asset) => ({
        ...asset,
        metadata: {
          ...(asset.metadata ?? {}),
          thumbnail,
        },
      }));
    },
    [updateAsset]
  );

  useAssetThumbnails(assets, assetsLoaded, handleAssetUpdate);

  return {
    assets,
    loadingAssets,
    assetError,
    assetsLoaded,
    uploadAsset,
    deleteAsset,
    reloadAssets,
    currentPage,
    totalPages,
    totalCount,
    hasNextPage,
    hasPreviousPage,
    loadNextPage,
    loadPreviousPage,
    goToPage,
  };
}
