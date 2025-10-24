/**
 * AssetPanel Component
 *
 * Displays and manages assets (videos, images, audio) for a project.
 * Provides upload, delete, search, filter, sort, and organization functionality with tabbed interface.
 */
'use client';

import { type ChangeEvent, useRef, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { AssetRow } from '@/types/assets';
import { DragDropZone } from '@/components/ui/DragDropZone';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { AssetVersionHistory } from '@/components/editor/AssetVersionHistory';

type SortOption = 'name' | 'date' | 'size' | 'type';
type SortDirection = 'asc' | 'desc';
type UsageFilter = 'all' | 'used' | 'unused';

interface AssetPanelProps {
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
  /** Set of asset IDs that are currently used in the timeline */
  usedAssetIds?: Set<string>;
}

/**
 * Extracts the file name from a storage URL.
 */
const extractFileName = (storageUrl: string) => {
  const normalized = storageUrl.replace(/^supabase:\/\//, '').replace(/^\/+/, '');
  const segments = normalized.split('/');
  return segments[segments.length - 1] ?? normalized;
};

/**
 * Formats file size in human-readable format
 */
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

export function AssetPanel({
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
  currentPage = 0,
  totalPages = 1,
  totalCount = 0,
  hasNextPage = false,
  hasPreviousPage = false,
  onNextPage,
  onPreviousPage,
  usedAssetIds = new Set(),
}: AssetPanelProps) {
  const uploadInputRef = useRef<HTMLInputElement>(null);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [usageFilter, setUsageFilter] = useState<UsageFilter>('all');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  // Version history state
  const [versionHistoryAsset, setVersionHistoryAsset] = useState<AssetRow | null>(null);

  // Extract all available tags from assets
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    assets.forEach((asset) => {
      asset.tags?.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [assets]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return searchQuery.trim() !== '' || usageFilter !== 'all' || selectedTags.size > 0;
  }, [searchQuery, usageFilter, selectedTags]);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setSearchQuery('');
    setUsageFilter('all');
    setSelectedTags(new Set());
  }, []);

  // Filter, search, and sort assets
  const filteredAssets = useMemo(() => {
    let filtered = assets.filter((a) =>
      activeTab === 'video'
        ? a.type === 'video'
        : activeTab === 'image'
          ? a.type === 'image'
          : a.type === 'audio'
    );

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((asset) => {
        const filename = (
          asset.metadata?.filename || extractFileName(asset.storage_url)
        ).toLowerCase();
        const type = asset.type.toLowerCase();
        const tags = asset.tags?.join(' ').toLowerCase() || '';
        return filename.includes(query) || type.includes(query) || tags.includes(query);
      });
    }

    // Apply usage filter
    if (usageFilter !== 'all') {
      filtered = filtered.filter((asset) => {
        const isUsed = usedAssetIds.has(asset.id);
        return usageFilter === 'used' ? isUsed : !isUsed;
      });
    }

    // Apply tag filter
    if (selectedTags.size > 0) {
      filtered = filtered.filter((asset) => {
        if (!asset.tags || asset.tags.length === 0) return false;
        return Array.from(selectedTags).some((tag) => asset.tags?.includes(tag));
      });
    }

    // Sort assets
    filtered.sort((a, b) => {
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
          const sizeA = a.metadata?.size || a.metadata?.fileSize || 0;
          const sizeB = b.metadata?.size || b.metadata?.fileSize || 0;
          comparison = sizeA - sizeB;
          break;
        }
        case 'type': {
          comparison = a.type.localeCompare(b.type);
          break;
        }
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [
    assets,
    activeTab,
    searchQuery,
    sortBy,
    sortDirection,
    usageFilter,
    usedAssetIds,
    selectedTags,
  ]);

  /**
   * Handle files from drag-and-drop zone
   * Converts File[] to ChangeEvent to work with existing upload handler
   */
  const handleDragDropFiles = async (files: File[]) => {
    if (files.length === 0) return;

    // Create a synthetic ChangeEvent to pass to existing handler
    const dataTransfer = new DataTransfer();
    files.forEach((file) => dataTransfer.items.add(file));

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

  return (
    <aside className="flex flex-col gap-4 overflow-hidden rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
      <div className="flex items-center justify-between gap-2">
        <h2
          className="text-sm font-semibold text-neutral-900 dark:text-neutral-100"
          id="asset-panel-title"
        >
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
            onClick={() => setShowFilters(!showFilters)}
            className="rounded-lg bg-neutral-100 dark:bg-neutral-800 px-3 py-1.5 text-xs font-semibold text-neutral-900 dark:text-neutral-100 shadow hover:bg-neutral-200 dark:hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
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
          </button>
          <button
            type="button"
            onClick={() => uploadInputRef.current?.click()}
            disabled={uploadPending}
            aria-label={uploadPending ? 'Uploading files' : `Upload ${activeTab} files`}
            aria-busy={uploadPending}
            className="rounded-lg bg-neutral-900 dark:bg-neutral-700 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-neutral-700 dark:hover:bg-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-75"
          >
            {uploadPending ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </div>

      {/* Search and Filter Controls */}
      {showFilters && (
        <div className="space-y-3 pb-3 border-b border-neutral-200 dark:border-neutral-700">
          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab}s...`}
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
                onClick={() => setSearchQuery('')}
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

          {/* Sort Controls */}
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="flex-1 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="date">Sort by Date</option>
              <option value="name">Sort by Name</option>
              <option value="size">Sort by Size</option>
              <option value="type">Sort by Type</option>
            </select>
            <button
              type="button"
              onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
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

          {/* Usage Filter */}
          <div>
            <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5 block">
              Usage Status
            </label>
            <div className="flex gap-2">
              {(['all', 'used', 'unused'] as UsageFilter[]).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setUsageFilter(filter)}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    usageFilter === filter
                      ? 'bg-purple-500 text-white'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                  }`}
                >
                  {filter === 'all'
                    ? 'All Assets'
                    : filter === 'used'
                      ? 'Used in Timeline'
                      : 'Unused'}
                </button>
              ))}
            </div>
          </div>

          {/* Tag Filter */}
          {availableTags.length > 0 && (
            <div>
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5 block">
                Filter by Tags
              </label>
              <div className="flex flex-wrap gap-1.5">
                {availableTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      const newTags = new Set(selectedTags);
                      if (newTags.has(tag)) {
                        newTags.delete(tag);
                      } else {
                        newTags.add(tag);
                      }
                      setSelectedTags(newTags);
                    }}
                    className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                      selectedTags.has(tag)
                        ? 'bg-purple-500 text-white'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="w-full rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
              Clear All Filters
            </button>
          )}

          {/* Results Count */}
          {hasActiveFilters && (
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Found {filteredAssets.length} {filteredAssets.length === 1 ? 'result' : 'results'}
            </p>
          )}
        </div>
      )}

      {/* Tabs */}
      <div
        className="flex gap-2 border-b border-neutral-200"
        role="tablist"
        aria-label="Asset types"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'video'}
          aria-controls="video-tabpanel"
          onClick={() => onTabChange('video')}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') {
              e.preventDefault();
              onTabChange('image');
            }
          }}
          className={`px-3 py-2 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-t ${
            activeTab === 'video'
              ? 'border-b-2 border-neutral-900 text-neutral-900'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          Videos
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'image'}
          aria-controls="image-tabpanel"
          onClick={() => onTabChange('image')}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') {
              e.preventDefault();
              onTabChange('video');
            } else if (e.key === 'ArrowRight') {
              e.preventDefault();
              onTabChange('audio');
            }
          }}
          className={`px-3 py-2 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-t ${
            activeTab === 'image'
              ? 'border-b-2 border-neutral-900 text-neutral-900'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          Images
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'audio'}
          aria-controls="audio-tabpanel"
          onClick={() => onTabChange('audio')}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') {
              e.preventDefault();
              onTabChange('image');
            }
          }}
          className={`px-3 py-2 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-t ${
            activeTab === 'audio'
              ? 'border-b-2 border-neutral-900 text-neutral-900'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          Audio
        </button>
      </div>

      {/* Video Tab Buttons */}
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

      {/* Images Tab Buttons */}
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

      {/* Audio Tab Buttons */}
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
          className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600"
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
              <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                Loading assets...
              </span>
            </div>
            <div className="space-y-3">
              <SkeletonCard
                variant="branded"
                showImage={true}
                showTitle={false}
                descriptionLines={1}
              />
              <SkeletonCard
                variant="branded"
                showImage={true}
                showTitle={false}
                descriptionLines={1}
              />
              <SkeletonCard
                variant="branded"
                showImage={true}
                showTitle={false}
                descriptionLines={1}
              />
            </div>
          </div>
        )}
        {!loadingAssets && filteredAssets.length === 0 && (
          <div
            className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-700"
            role="status"
          >
            {activeTab === 'video'
              ? 'No video assets yet. Upload video to begin editing.'
              : activeTab === 'image'
                ? 'No image assets yet. Upload images.'
                : 'No audio assets yet. Upload or generate audio.'}
          </div>
        )}
        {filteredAssets.map((asset) => (
          <div key={asset.id} className="group relative flex flex-col gap-2">
            <button
              type="button"
              onClick={() => void onAssetAdd(asset)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  void onAssetAdd(asset);
                }
              }}
              aria-label={`Add ${asset.metadata?.filename ?? asset.type} to timeline`}
              className="flex w-full items-center gap-3 rounded-lg border border-transparent bg-neutral-50 px-3 py-2 text-left transition hover:border-neutral-200 hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {asset.metadata?.thumbnail ? (
                <Image
                  src={asset.metadata.thumbnail}
                  alt={asset.metadata?.filename ?? `${asset.type} asset`}
                  title={asset.metadata?.filename}
                  width={112}
                  height={64}
                  className="h-16 w-28 rounded-md object-cover transition-opacity duration-300"
                  unoptimized
                  loading="lazy"
                  placeholder="blur"
                  blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTEyIiBoZWlnaHQ9IjY0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMTIiIGhlaWdodD0iNjQiIGZpbGw9IiNlNWU3ZWIiLz48L3N2Zz4="
                />
              ) : (
                <div className="flex h-16 w-28 items-center justify-center rounded-md bg-neutral-200 dark:bg-neutral-700 text-xs text-neutral-600 dark:text-neutral-400 animate-pulse">
                  {asset.type.toUpperCase()}
                </div>
              )}
              <div className="flex-1 text-xs">
                <p className="font-medium text-neutral-900 dark:text-neutral-100">
                  {asset.metadata?.filename ?? extractFileName(asset.storage_url)}
                </p>
                {/* Asset size badge */}
                {(asset.metadata?.size || asset.metadata?.fileSize) && (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {formatFileSize(asset.metadata.size || asset.metadata.fileSize || 0)}
                  </p>
                )}
                {/* Usage indicator */}
                {usedAssetIds.has(asset.id) && (
                  <span className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    In Timeline
                  </span>
                )}
              </div>
            </button>

            {/* Action buttons */}
            <div className="absolute right-2 top-1 z-10 flex gap-1">
              {/* Version history button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setVersionHistoryAsset(asset);
                }}
                aria-label={`View version history for ${asset.metadata?.filename ?? asset.type}`}
                className="rounded-md bg-purple-500 p-1 text-white shadow-lg transition-all hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                title="Version history"
              >
                <svg
                  className="h-3 w-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
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
                onClick={(e) => {
                  e.stopPropagation();
                  void onAssetDelete(asset);
                }}
                aria-label={`Delete ${asset.metadata?.filename ?? asset.type}`}
                className="rounded-md bg-red-500 p-1 text-white shadow-lg transition-all hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                title="Delete asset"
              >
                <svg
                  className="h-3 w-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <nav
          className="flex items-center justify-between border-t border-neutral-200 pt-3 text-xs"
          aria-label="Asset pagination"
        >
          <div className="text-neutral-700" aria-live="polite" aria-atomic="true">
            Page {currentPage + 1} of {totalPages} ({totalCount} total)
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onPreviousPage?.()}
              disabled={!hasPreviousPage || loadingAssets}
              aria-label="Go to previous page"
              className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 font-medium text-neutral-700 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => onNextPage?.()}
              disabled={!hasNextPage || loadingAssets}
              aria-label="Go to next page"
              className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 font-medium text-neutral-700 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
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
          onClose={() => setVersionHistoryAsset(null)}
          onReverted={() => {
            // Optionally reload assets or show a success message
            setVersionHistoryAsset(null);
          }}
        />
      )}
    </aside>
  );
}
