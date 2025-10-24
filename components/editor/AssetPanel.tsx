/**
 * AssetPanel Component
 *
 * Displays and manages assets (videos, images, audio) for a project.
 * Provides upload, delete, and organization functionality with tabbed interface.
 */
'use client';

import { type ChangeEvent, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { AssetRow } from '@/types/assets';
import { DragDropZone } from '@/components/ui/DragDropZone';

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
}

/**
 * Extracts the file name from a storage URL.
 */
const extractFileName = (storageUrl: string) => {
  const normalized = storageUrl.replace(/^supabase:\/\//, '').replace(/^\/+/, '');
  const segments = normalized.split('/');
  return segments[segments.length - 1] ?? normalized;
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
}: AssetPanelProps) {
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const filteredAssets = assets.filter((a) =>
    activeTab === 'video'
      ? a.type === 'video'
      : activeTab === 'image'
        ? a.type === 'image'
        : a.type === 'audio'
  );

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
    <aside className="flex flex-col gap-4 overflow-hidden rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-neutral-900" id="asset-panel-title">
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
            onClick={() => uploadInputRef.current?.click()}
            disabled={uploadPending}
            aria-label={uploadPending ? 'Uploading files' : `Upload ${activeTab} files`}
            aria-busy={uploadPending}
            className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-75"
          >
            {uploadPending ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-neutral-200" role="tablist" aria-label="Asset types">
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
          <div
            className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-700"
            role="status"
            aria-live="polite"
          >
            Loading assets…
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
                  className="h-16 w-28 rounded-md object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-16 w-28 items-center justify-center rounded-md bg-neutral-200 text-xs text-neutral-600">
                  {asset.type.toUpperCase()}
                </div>
              )}
              <div className="flex-1 text-xs">
                <p className="font-medium text-neutral-900">
                  {asset.metadata?.filename ?? extractFileName(asset.storage_url)}
                </p>
              </div>
            </button>

            {/* Delete button - always visible */}
            <button
              onClick={() => void onAssetDelete(asset)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  void onAssetDelete(asset);
                }
              }}
              aria-label={`Delete ${asset.metadata?.filename ?? asset.type}`}
              className="absolute right-2 top-1 z-10 rounded-md bg-red-500 p-1 text-white shadow-lg transition-all hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
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
    </aside>
  );
}
