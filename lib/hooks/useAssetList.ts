/**
 * useAssetList Hook
 *
 * Handles asset listing, pagination, and data fetching from database.
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { browserLogger } from '@/lib/browserLogger';
import { mapAssetRow } from '@/lib/utils/assetUtils';
import { ASSET_PAGINATION_CONSTANTS } from '@/lib/constants';
import type { AssetRow } from '@/types/assets';

const { DEFAULT_PAGE_SIZE } = ASSET_PAGINATION_CONSTANTS;

export interface UseAssetListReturn {
  /** List of all assets for current page */
  assets: AssetRow[];
  /** Whether assets are currently loading */
  loadingAssets: boolean;
  /** Error message if loading failed */
  assetError: string | null;
  /** Whether assets have been loaded at least once */
  assetsLoaded: boolean;
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
  /** Update a specific asset in the list */
  updateAsset: (assetId: string, updater: (asset: AssetRow) => AssetRow) => void;
  /** Remove an asset from the list */
  removeAsset: (assetId: string) => void;
}

/**
 * Hook to manage asset listing and pagination.
 *
 * Fetches assets from database, handles pagination,
 * and provides methods to update the asset list.
 */
export function useAssetList(
  projectId: string,
  pageSize: number = DEFAULT_PAGE_SIZE
): UseAssetListReturn {
  const supabase = createBrowserSupabaseClient();
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [assetError, setAssetError] = useState<string | null>(null);
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const loadAssets = useCallback(
    async (page: number = 0) => {
      setLoadingAssets(true);
      setAssetError(null);
      try {
        const rangeStart = page * pageSize;
        const rangeEnd = rangeStart + pageSize - 1;

        const { data, error, count } = await supabase
          .from('assets')
          .select('*', { count: 'exact' })
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })
          .range(rangeStart, rangeEnd);

        if (error) {
          throw error;
        }

        const mapped = (data ?? [])
          .map((row) => mapAssetRow(row as Record<string, unknown>))
          .filter((asset): asset is AssetRow => Boolean(asset));

        setAssets(mapped);
        setCurrentPage(page);
        const total = count ?? 0;
        setTotalCount(total);
        setTotalPages(Math.ceil(total / pageSize));
      } catch (error) {
        browserLogger.error({ error, projectId }, 'Failed to load assets');
        setAssetError('Failed to load assets. Please try again later.');
      } finally {
        setLoadingAssets(false);
        setAssetsLoaded(true);
      }
    },
    [projectId, supabase, pageSize]
  );

  useEffect(() => {
    void loadAssets(0);
  }, [loadAssets]);

  const loadNextPage = useCallback(async () => {
    if (currentPage < totalPages - 1) {
      await loadAssets(currentPage + 1);
    }
  }, [currentPage, totalPages, loadAssets]);

  const loadPreviousPage = useCallback(async () => {
    if (currentPage > 0) {
      await loadAssets(currentPage - 1);
    }
  }, [currentPage, loadAssets]);

  const goToPage = useCallback(
    async (page: number) => {
      if (page >= 0 && page < totalPages) {
        await loadAssets(page);
      }
    },
    [totalPages, loadAssets]
  );

  const reloadAssets = useCallback(async () => {
    await loadAssets(currentPage);
  }, [currentPage, loadAssets]);

  const updateAsset = useCallback((assetId: string, updater: (asset: AssetRow) => AssetRow) => {
    setAssets((prev) => prev.map((asset) => (asset.id === assetId ? updater(asset) : asset)));
  }, []);

  const removeAsset = useCallback((assetId: string) => {
    setAssets((prev) => prev.filter((asset) => asset.id !== assetId));
  }, []);

  const hasNextPage = currentPage < totalPages - 1;
  const hasPreviousPage = currentPage > 0;

  return {
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
  };
}
