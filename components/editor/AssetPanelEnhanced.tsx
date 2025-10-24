/**
 * Enhanced AssetPanel Component
 *
 * Displays and manages assets with comprehensive search, filter, sort, and tagging functionality.
 * This is an enhancement of the original AssetPanel with advanced organization features.
 */
'use client';

import React, {  type ChangeEvent, useRef, useState, useMemo, useCallback  } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { AssetRow } from '@/types/assets';
import { DragDropZone } from '@/components/ui/DragDropZone';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { AssetVersionHistory } from '@/components/editor/AssetVersionHistory';

type SortOption = 'name' | 'date' | 'size' | 'type' | 'usage' | 'recent';
type SortDirection = 'asc' | 'desc';
type FilterPreset = 'all' | 'favorites' | 'unused' | 'recent' | 'tagged';

interface AssetPanelEnhancedProps {
  /** List of all assets */
  assets: AssetRow[];
  /** ID of the current project */
  projectId: string;
  /** Whether assets are currently loading */
  loadingAssets: boolean;
  /** Error message if asset loading failed */
  assetError: string | null;
  /** Whether an upload is in progress */
  uploadPending: boolean;
  /** Current active tab */
  activeTab: 'video' | 'audio' | 'image';
  /** Callback when tab changes */
  onTabChange: (tab: 'video' | 'audio' | 'image') => void;
  /** Callback when file is selected for upload */
  onFileSelect: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  /** Callback when asset is clicked to add to timeline */
  onAssetAdd: (asset: AssetRow) => Promise<void>;
  /** Callback when asset delete is requested */
  onAssetDelete: (asset: AssetRow) => Promise<void>;
  /** Callback when asset tags are updated */
  onAssetTagsUpdate?: (assetId: string, tags: string[]) => Promise<void>;
  /** Callback when asset favorite status changes */
  onAssetFavoriteToggle?: (assetId: string, isFavorite: boolean) => Promise<void>;
  /** Current page number (0-indexed) */
  currentPage?: number;
  /** Total number of pages */
  totalPages?: number;
  /** Total number of assets */
  totalCount?: number;
  /** Whether there is a next page */
  hasNextPage?: boolean;
  /** Whether there is a previous page */
  hasPreviousPage?: boolean;
  /** Load next page */
  onNextPage?: () => Promise<void>;
  /** Load previous page */
  onPreviousPage?: () => Promise<void>;
}

/**
 * Extracts the file name from a storage URL.
 */
const extractFileName = (storageUrl: string): string => {
  const normalized = storageUrl.replace(/^supabase:\/\//, '').replace(/^\/+/, '');
  const segments = normalized.split('/');
  return segments[segments.length - 1] ?? normalized;
};

/**
 * Formats file size in human-readable format
 */
const formatFileSize = (bytes: number | undefined): string => {
  if (!bytes) return 'Unknown';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

export function AssetPanelEnhanced({
  assets,
  projectId,
  loadingAssets,
  assetError,
  uploadPending,
  activeTab,
  onTabChange,
  onFileSelect,
  onAssetAdd,
  onAssetDelete,
  onAssetTagsUpdate,
  onAssetFavoriteToggle,
  currentPage = 0,
  totalPages = 1,
  totalCount = 0,
  hasNextPage = false,
  hasPreviousPage = false,
  onNextPage,
  onPreviousPage,
}: AssetPanelEnhancedProps): React.ReactElement {
  const uploadInputRef = useRef<HTMLInputElement>(null);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [filterPreset, setFilterPreset] = useState<FilterPreset>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Tag editing state
  const [editingTagsForAsset, setEditingTagsForAsset] = useState<string | null>(null);
  const [newTag, setNewTag] = useState('');

  // Version history state
  const [versionHistoryAsset, setVersionHistoryAsset] = useState<AssetRow | null>(null);

  // Extract all unique tags from assets
  const allTags = useMemo((): string[] => {
    const tagSet = new Set<string>();
    assets.forEach((asset): void => {
      asset.tags?.forEach((tag): Set<string> => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [assets]);

  // Toggle tag selection
  const toggleTagFilter = useCallback((tag: string): void => {
    setSelectedTags((prev): string[] =>
      prev.includes(tag) ? prev.filter((t): boolean => t !== tag) : [...prev, tag]
    );
  }, []);

  // Clear all filters
  const clearFilters = useCallback((): void => {
    setSearchQuery('');
    setFilterPreset('all');
    setSelectedTags([]);
    setDateFrom('');
    setDateTo('');
  }, []);

  // Filter, search, and sort assets
  const filteredAssets = useMemo((): AssetRow[] => {
    let filtered = assets.filter((a): boolean =>
      activeTab === 'video'
        ? a.type === 'video'
        : activeTab === 'image'
          ? a.type === 'image'
          : a.type === 'audio'
    );

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((asset): boolean | undefined => {
        const filename = (asset.metadata?.filename || extractFileName(asset.storage_url)).toLowerCase();
        const type = asset.type.toLowerCase();
        const tagsMatch = asset.tags?.some((tag): boolean => tag.toLowerCase().includes(query));
        return filename.includes(query) || type.includes(query) || tagsMatch;
      });
    }

    // Apply filter preset
    if (filterPreset === 'favorites') {
      filtered = filtered.filter((a): boolean | undefined => a.is_favorite);
    } else if (filterPreset === 'unused') {
      filtered = filtered.filter((a): boolean => !a.usage_count || a.usage_count === 0);
    } else if (filterPreset === 'recent') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      filtered = filtered.filter((a): boolean => {
        if (!a.last_used_at) return false;
        return new Date(a.last_used_at) >= sevenDaysAgo;
      });
    } else if (filterPreset === 'tagged') {
      filtered = filtered.filter((a): boolean | undefined => a.tags && a.tags.length > 0);
    }

    // Apply tag filters
    if (selectedTags.length > 0) {
      filtered = filtered.filter((a): boolean =>
        selectedTags.every((tag): boolean | undefined => a.tags?.includes(tag))
      );
    }

    // Apply date range filter
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      filtered = filtered.filter((a): boolean => {
        if (!a.created_at) return false;
        return new Date(a.created_at) >= fromDate;
      });
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999); // End of day
      filtered = filtered.filter((a): boolean => {
        if (!a.created_at) return false;
        return new Date(a.created_at) <= toDate;
      });
    }

    // Sort assets
    filtered.sort((a, b): number => {
      let comparison = 0;

      switch (sortBy) {
        case 'name': {
          const nameA = (a.metadata?.filename || extractFileName(a.storage_url)).toLowerCase();
          const nameB = (b.metadata?.filename || extractFileName(b.storage_url)).toLowerCase();
          comparison = nameA.localeCompare(nameB);
          break;
        }
        case 'date': {
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          comparison = dateA - dateB;
          break;
        }
        case 'size': {
          const sizeA = a.metadata?.fileSize || 0;
          const sizeB = b.metadata?.fileSize || 0;
          comparison = sizeA - sizeB;
          break;
        }
        case 'type': {
          comparison = a.type.localeCompare(b.type);
          break;
        }
        case 'usage': {
          const usageA = a.usage_count || 0;
          const usageB = b.usage_count || 0;
          comparison = usageA - usageB;
          break;
        }
        case 'recent': {
          const recentA = a.last_used_at ? new Date(a.last_used_at).getTime() : 0;
          const recentB = b.last_used_at ? new Date(b.last_used_at).getTime() : 0;
          comparison = recentA - recentB;
          break;
        }
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [assets, activeTab, searchQuery, sortBy, sortDirection, filterPreset, selectedTags, dateFrom, dateTo]);

  // Handle adding tags to an asset
  const handleAddTag = useCallback(async (assetId: string, tag: string): Promise<void> => {
    if (!tag.trim() || !onAssetTagsUpdate) return;

    const asset = assets.find((a): boolean => a.id === assetId);
    if (!asset) return;

    const currentTags = asset.tags || [];
    if (currentTags.includes(tag.trim())) return; // Tag already exists

    const newTags = [...currentTags, tag.trim()];
    await onAssetTagsUpdate(assetId, newTags);
    setNewTag('');
  }, [assets, onAssetTagsUpdate]);

  // Handle removing a tag from an asset
  const handleRemoveTag = useCallback(async (assetId: string, tagToRemove: string): Promise<void> => {
    if (!onAssetTagsUpdate) return;

    const asset = assets.find((a): boolean => a.id === assetId);
    if (!asset) return;

    const newTags = (asset.tags || []).filter((tag): boolean => tag !== tagToRemove);
    await onAssetTagsUpdate(assetId, newTags);
  }, [assets, onAssetTagsUpdate]);

  // Handle favorite toggle
  const handleFavoriteToggle = useCallback(async (assetId: string): Promise<void> => {
    if (!onAssetFavoriteToggle) return;

    const asset = assets.find((a): boolean => a.id === assetId);
    if (!asset) return;

    await onAssetFavoriteToggle(assetId, !asset.is_favorite);
  }, [assets, onAssetFavoriteToggle]);

  /**
   * Handle files from drag-and-drop zone
   * Converts File[] to ChangeEvent to work with existing upload handler
   */
  const handleDragDropFiles = async (files: File[]): Promise<void> => {
    if (files.length === 0) return;

    // Create a synthetic ChangeEvent to pass to existing handler
    const dataTransfer = new DataTransfer();
    files.forEach((file): DataTransferItem | null => dataTransfer.items.add(file));

    const event = {
      target: {
        files: dataTransfer.files,
      },
    } as ChangeEvent<HTMLInputElement>;

    await onFileSelect(event);
  };

  /**
   * Get accepted file types based on active tab
   */
  const getAcceptedTypes = (): string => {
    switch (activeTab) {
      case 'video':
        return 'video/*';
      case 'image':
        return 'image/*';
      case 'audio':
        return 'audio/*';
      default:
        return 'video/*,image/*,audio/*';
    }
  };

  const activeFiltersCount = [
    searchQuery ? 1 : 0,
    filterPreset !== 'all' ? 1 : 0,
    selectedTags.length,
    dateFrom ? 1 : 0,
    dateTo ? 1 : 0,
  ].reduce((sum, count): number => sum + count, 0);

  return (
    <aside className="flex flex-col gap-4 overflow-hidden rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100" id="asset-panel-title">
          Assets
        </h2>
        <div className="flex items-center gap-2">
          <input
            ref={uploadInputRef}
            type="file"
            multiple
            accept={
              activeTab === 'video' ? 'video/*' : activeTab === 'image' ? 'image/*' : 'audio/*'
            }
            className="hidden"
            onChange={onFileSelect}
            aria-label={`Upload ${activeTab} files`}
          />
          <button
            type="button"
            onClick={(): void => setShowFilters(!showFilters)}
            className="relative rounded-lg bg-neutral-100 dark:bg-neutral-800 px-3 py-1.5 text-xs font-semibold text-neutral-900 dark:text-neutral-100 shadow hover:bg-neutral-200 dark:hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Toggle filters"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            {activeFiltersCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-purple-500 text-xs text-white">
                {activeFiltersCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={(): void | undefined => uploadInputRef.current?.click()}
            disabled={uploadPending}
            aria-label={uploadPending ? 'Uploading files' : `Upload ${activeTab} files`}
            aria-busy={uploadPending}
            className="rounded-lg bg-neutral-900 dark:bg-neutral-700 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-neutral-700 dark:hover:bg-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-75"
          >
            {uploadPending ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </div>

      {/* Advanced Search and Filter Controls */}
      {showFilters && (
        <div className="space-y-3 pb-3 border-b border-neutral-200 dark:border-neutral-700">
          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e): void => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab}s, tags...`}
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 pl-9 text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-500 dark:placeholder-neutral-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500 dark:text-neutral-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {searchQuery && (
              <button
                onClick={(): void => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                aria-label="Clear search"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Filter Presets */}
          <div className="flex flex-wrap gap-2">
            {(['all', 'favorites', 'unused', 'recent', 'tagged'] as FilterPreset[]).map((preset): React.ReactElement => (
              <button
                key={preset}
                onClick={(): void => setFilterPreset(preset)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                  filterPreset === preset
                    ? 'bg-purple-600 text-white'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
              >
                {preset === 'all' && 'All'}
                {preset === 'favorites' && '★ Favorites'}
                {preset === 'unused' && 'Unused'}
                {preset === 'recent' && 'Recently Used'}
                {preset === 'tagged' && 'Tagged'}
              </button>
            ))}
          </div>

          {/* Tag Filters */}
          {allTags.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Filter by Tags:
              </label>
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag): React.ReactElement => (
                  <button
                    key={tag}
                    onClick={(): void => toggleTagFilter(tag)}
                    className={`px-2 py-1 text-xs font-medium rounded-md transition ${
                      selectedTags.includes(tag)
                        ? 'bg-purple-500 text-white'
                        : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-600'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Date Range Filter */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">From:</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e): void => setDateFrom(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-2 py-1.5 text-xs text-neutral-900 dark:text-neutral-100 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">To:</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e): void => setDateTo(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-2 py-1.5 text-xs text-neutral-900 dark:text-neutral-100 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Sort Controls */}
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e): void => setSortBy(e.target.value as SortOption)}
              className="flex-1 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="date">Sort by Date</option>
              <option value="name">Sort by Name</option>
              <option value="size">Sort by Size</option>
              <option value="type">Sort by Type</option>
              <option value="usage">Sort by Usage</option>
              <option value="recent">Sort by Recent Use</option>
            </select>
            <button
              type="button"
              onClick={(): void => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
              className="rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              aria-label={`Sort ${sortDirection === 'asc' ? 'ascending' : 'descending'}`}
            >
              <svg
                className={`h-4 w-4 transition-transform ${sortDirection === 'desc' ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 15l7-7 7 7"
                />
              </svg>
            </button>
          </div>

          {/* Clear Filters Button */}
          {activeFiltersCount > 0 && (
            <button
              onClick={clearFilters}
              className="w-full rounded-lg bg-neutral-200 dark:bg-neutral-700 px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-600"
            >
              Clear All Filters
            </button>
          )}

          {/* Results Count */}
          <p className="text-xs text-neutral-600 dark:text-neutral-400">
            Showing {filteredAssets.length} of {totalCount} {filteredAssets.length === 1 ? 'asset' : 'assets'}
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-neutral-200 dark:border-neutral-700" role="tablist" aria-label="Asset types">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'video'}
          aria-controls="video-tabpanel"
          onClick={(): void => onTabChange('video')}
          className={`px-3 py-2 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-t ${
            activeTab === 'video'
              ? 'border-b-2 border-neutral-900 dark:border-neutral-100 text-neutral-900 dark:text-neutral-100'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
          }`}
        >
          Videos
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'image'}
          aria-controls="image-tabpanel"
          onClick={(): void => onTabChange('image')}
          className={`px-3 py-2 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-t ${
            activeTab === 'image'
              ? 'border-b-2 border-neutral-900 dark:border-neutral-100 text-neutral-900 dark:text-neutral-100'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
          }`}
        >
          Images
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'audio'}
          aria-controls="audio-tabpanel"
          onClick={(): void => onTabChange('audio')}
          className={`px-3 py-2 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-t ${
            activeTab === 'audio'
              ? 'border-b-2 border-neutral-900 dark:border-neutral-100 text-neutral-900 dark:text-neutral-100'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
          }`}
        >
          Audio
        </button>
      </div>

      {/* Tab Content: Drag-Drop Zone and Generation Links */}
      {activeTab === 'video' && (
        <div className="flex flex-col gap-2">
          <DragDropZone
            onFilesSelected={handleDragDropFiles}
            accept={getAcceptedTypes()}
            multiple={true}
            maxFileSize={200 * 1024 * 1024}
            disabled={uploadPending}
            description={uploadPending ? 'Uploading files...' : 'or click to browse'}
            showPreviews={false}
            className="min-h-[120px]"
          />
          <Link
            href={`/video-gen?projectId=${projectId}`}
            className="group w-full rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-3 text-xs font-semibold text-white text-center shadow-md transition-all hover:from-purple-600 hover:to-pink-600 hover:shadow-lg"
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                />
              </svg>
              Generate Video with AI
            </div>
          </Link>
        </div>
      )}

      {activeTab === 'image' && (
        <div className="flex flex-col gap-2">
          <DragDropZone
            onFilesSelected={handleDragDropFiles}
            accept={getAcceptedTypes()}
            multiple={true}
            maxFileSize={100 * 1024 * 1024}
            disabled={uploadPending}
            description={uploadPending ? 'Uploading files...' : 'or click to browse'}
            showPreviews={false}
            className="min-h-[120px]"
          />
          <Link
            href={`/image-gen?projectId=${projectId}`}
            className="group w-full rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-3 text-xs font-semibold text-white text-center shadow-md transition-all hover:from-purple-600 hover:to-pink-600 hover:shadow-lg"
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              Generate Images with AI
            </div>
          </Link>
        </div>
      )}

      {activeTab === 'audio' && (
        <div className="flex flex-col gap-2">
          <DragDropZone
            onFilesSelected={handleDragDropFiles}
            accept={getAcceptedTypes()}
            multiple={true}
            maxFileSize={100 * 1024 * 1024}
            disabled={uploadPending}
            description={uploadPending ? 'Uploading files...' : 'or click to browse'}
            showPreviews={false}
            className="min-h-[120px]"
          />
          <Link
            href={`/audio-gen?projectId=${projectId}`}
            className="group w-full rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-3 text-xs font-semibold text-white text-center shadow-md transition-all hover:from-purple-600 hover:to-pink-600 hover:shadow-lg"
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                />
              </svg>
              Generate Audio with AI
            </div>
          </Link>
        </div>
      )}

      {assetError && (
        <div
          className="rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs text-red-600 dark:text-red-400"
          role="alert"
          aria-live="assertive"
        >
          {assetError}
        </div>
      )}

      <div
        className="flex-1 overflow-y-auto space-y-3"
        role="tabpanel"
        id={`${activeTab}-tabpanel`}
        aria-labelledby={`${activeTab}-tab`}
      >
        {loadingAssets && (
          <div role="status" aria-live="polite" aria-label="Loading assets">
            <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <LoadingSpinner size={16} variant="branded" />
              <span className="text-xs font-medium text-purple-700 dark:text-purple-300">Loading assets...</span>
            </div>
            <div className="space-y-3">
              <SkeletonCard variant="branded" showImage={true} showTitle={false} descriptionLines={1} />
              <SkeletonCard variant="branded" showImage={true} showTitle={false} descriptionLines={1} />
              <SkeletonCard variant="branded" showImage={true} showTitle={false} descriptionLines={1} />
            </div>
          </div>
        )}
        {!loadingAssets && filteredAssets.length === 0 && (
          <div
            className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 px-3 py-2 text-xs text-neutral-700 dark:text-neutral-300"
            role="status"
          >
            {activeTab === 'video'
              ? 'No video assets yet. Upload video to begin editing.'
              : activeTab === 'image'
                ? 'No image assets yet. Upload images.'
                : 'No audio assets yet. Upload or generate audio.'}
          </div>
        )}
        {filteredAssets.map((asset): React.ReactElement => (
          <div key={asset.id} className="group relative flex flex-col gap-2">
            <button
              type="button"
              onClick={(): undefined => void onAssetAdd(asset)}
              aria-label={`Add ${asset.metadata?.filename ?? asset.type} to timeline`}
              className="flex w-full items-start gap-3 rounded-lg border border-transparent bg-neutral-50 dark:bg-neutral-800/50 px-3 py-2 text-left transition hover:border-neutral-200 dark:hover:border-neutral-700 hover:bg-white dark:hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {asset.metadata?.thumbnail ? (
                <Image
                  src={asset.metadata.thumbnail}
                  alt={asset.metadata?.filename ?? `${asset.type} asset`}
                  title={asset.metadata?.filename}
                  width={112}
                  height={64}
                  className="h-16 w-28 rounded-md object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-16 w-28 items-center justify-center rounded-md bg-neutral-200 dark:bg-neutral-700 text-xs text-neutral-600 dark:text-neutral-400">
                  {asset.type.toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0 text-xs space-y-1">
                <p className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
                  {asset.metadata?.filename ?? extractFileName(asset.storage_url)}
                </p>
                <div className="flex flex-wrap gap-2 text-neutral-600 dark:text-neutral-400">
                  {asset.metadata?.fileSize && (
                    <span>{formatFileSize(asset.metadata.fileSize)}</span>
                  )}
                  {asset.usage_count !== undefined && asset.usage_count > 0 && (
                    <span className="text-purple-600 dark:text-purple-400">
                      Used {asset.usage_count}x
                    </span>
                  )}
                </div>
                {/* Tags Display */}
                {asset.tags && asset.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {asset.tags.map((tag): React.ReactElement => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </button>

            {/* Action buttons */}
            <div className="absolute right-2 top-1 z-10 flex gap-1">
              {/* Favorite button */}
              {onAssetFavoriteToggle && (
                <button
                  onClick={(e): void => {
                    e.stopPropagation();
                    void handleFavoriteToggle(asset.id);
                  }}
                  aria-label={asset.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                  className={`rounded-md p-1 text-white shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    asset.is_favorite
                      ? 'bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-500'
                      : 'bg-neutral-500 hover:bg-neutral-600 focus:ring-neutral-500'
                  }`}
                  title={asset.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <svg className="h-3 w-3" fill={asset.is_favorite ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                    />
                  </svg>
                </button>
              )}

              {/* Tags button */}
              {onAssetTagsUpdate && (
                <button
                  onClick={(e): void => {
                    e.stopPropagation();
                    setEditingTagsForAsset(editingTagsForAsset === asset.id ? null : asset.id);
                  }}
                  aria-label="Manage tags"
                  className="rounded-md bg-blue-500 p-1 text-white shadow-lg transition-all hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  title="Manage tags"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                    />
                  </svg>
                </button>
              )}

              {/* Version history button */}
              <button
                onClick={(e): void => {
                  e.stopPropagation();
                  setVersionHistoryAsset(asset);
                }}
                aria-label={`View version history for ${asset.metadata?.filename ?? asset.type}`}
                className="rounded-md bg-purple-500 p-1 text-white shadow-lg transition-all hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                title="Version history"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </button>

              {/* Delete button */}
              <button
                onClick={(e): void => {
                  e.stopPropagation();
                  void onAssetDelete(asset);
                }}
                aria-label={`Delete ${asset.metadata?.filename ?? asset.type}`}
                className="rounded-md bg-red-500 p-1 text-white shadow-lg transition-all hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                title="Delete asset"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>

            {/* Tag Editor Dropdown */}
            {editingTagsForAsset === asset.id && onAssetTagsUpdate && (
              <div
                className="absolute top-full left-0 right-0 z-20 mt-1 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-3 shadow-lg"
                onClick={(e): void => e.stopPropagation()}
              >
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e): void => setNewTag(e.target.value)}
                      onKeyDown={(e): void => {
                        if (e.key === 'Enter') {
                          void handleAddTag(asset.id, newTag);
                        }
                      }}
                      placeholder="Add tag..."
                      className="flex-1 rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-2 py-1 text-xs text-neutral-900 dark:text-neutral-100 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                    <button
                      onClick={(): undefined => void handleAddTag(asset.id, newTag)}
                      className="rounded-md bg-purple-500 px-3 py-1 text-xs font-medium text-white hover:bg-purple-600"
                    >
                      Add
                    </button>
                  </div>
                  {asset.tags && asset.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {asset.tags.map((tag): React.ReactElement => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs"
                        >
                          {tag}
                          <button
                            onClick={(): undefined => void handleRemoveTag(asset.id, tag)}
                            className="hover:text-purple-900 dark:hover:text-purple-100"
                            aria-label={`Remove tag ${tag}`}
                          >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <nav
          className="flex items-center justify-between border-t border-neutral-200 dark:border-neutral-700 pt-3 text-xs"
          aria-label="Asset pagination"
        >
          <div className="text-neutral-700 dark:text-neutral-300" aria-live="polite" aria-atomic="true">
            Page {currentPage + 1} of {totalPages} ({totalCount} total)
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={(): Promise<void> | undefined => onPreviousPage?.()}
              disabled={!hasPreviousPage || loadingAssets}
              aria-label="Go to previous page"
              className="rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-1.5 font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={(): Promise<void> | undefined => onNextPage?.()}
              disabled={!hasNextPage || loadingAssets}
              aria-label="Go to next page"
              className="rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-1.5 font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </nav>
      )}

      {/* Version History Dialog */}
      {versionHistoryAsset && (
        <AssetVersionHistory
          assetId={versionHistoryAsset.id}
          assetType={versionHistoryAsset.type}
          isOpen={!!versionHistoryAsset}
          onClose={(): void => setVersionHistoryAsset(null)}
          onReverted={(): void => {
            setVersionHistoryAsset(null);
          }}
        />
      )}
    </aside>
  );
}
