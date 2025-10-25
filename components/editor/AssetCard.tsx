/**
 * AssetCard - Enhanced asset card with error handling and loading states
 *
 * Wraps asset display with error boundaries, fallback handling, and
 * graceful degradation for loading failures.
 *
 * @module components/editor/AssetCard
 */
'use client';

import Image from 'next/image';
import type { AssetRow } from '@/types/assets';
import { AssetErrorBoundary } from '@/components/AssetErrorBoundary';
import { useAssetWithFallback } from '@/lib/hooks/useAssetWithFallback';

interface AssetCardProps {
  asset: AssetRow;
  usedInTimeline?: boolean;
  onAdd: (asset: AssetRow) => Promise<void>;
  onDelete: (asset: AssetRow) => Promise<void>;
  onViewVersions?: (asset: AssetRow) => void;
}

/**
 * Extract filename from storage URL
 */
function extractFileName(storageUrl: string): string {
  const normalized = storageUrl.replace(/^supabase:\/\//, '').replace(/^\/+/, '');
  const segments = normalized.split('/');
  return segments[segments.length - 1] ?? normalized;
}

/**
 * Format file size
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Asset thumbnail with loading and error states
 */
function AssetThumbnail({ asset }: { asset: AssetRow }) {
  const { url, state, error, isFallback, retry } = useAssetWithFallback(asset, {
    enableFallback: true,
    enableRetry: true,
  });

  // Loading state
  if (state === 'loading') {
    return (
      <div className="flex h-16 w-28 items-center justify-center rounded-md bg-neutral-200 dark:bg-neutral-700 animate-pulse">
        <svg
          className="h-6 w-6 text-neutral-400 dark:text-neutral-500 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
    );
  }

  // Error state
  if (state === 'error' || !url) {
    return (
      <div className="flex h-16 w-28 flex-col items-center justify-center rounded-md bg-orange-100 dark:bg-orange-900/30 p-2">
        <svg
          className="h-5 w-5 text-orange-600 dark:text-orange-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        {error?.canRetry && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              retry();
            }}
            className="mt-1 text-xs text-orange-600 dark:text-orange-400 hover:underline"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  // Success state - show thumbnail
  const thumbnailUrl = asset.metadata?.thumbnail || url;

  if (thumbnailUrl) {
    return (
      <div className="relative">
        <Image
          src={thumbnailUrl}
          alt={asset.metadata?.filename ?? `${asset.type} asset`}
          title={asset.metadata?.filename}
          width={112}
          height={64}
          className="h-16 w-28 rounded-md object-cover"
          unoptimized
          loading="lazy"
          placeholder="blur"
          blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTEyIiBoZWlnaHQ9IjY0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMTIiIGhlaWdodD0iNjQiIGZpbGw9IiNlNWU3ZWIiLz48L3N2Zz4="
        />
        {isFallback && (
          <div
            className="absolute bottom-0 right-0 rounded-tl bg-yellow-500 px-1 py-0.5"
            title="Using fallback URL"
          >
            <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}
      </div>
    );
  }

  // Fallback placeholder
  return (
    <div className="flex h-16 w-28 items-center justify-center rounded-md bg-neutral-200 dark:bg-neutral-700 text-xs text-neutral-600 dark:text-neutral-400">
      {asset.type.toUpperCase()}
    </div>
  );
}

/**
 * Asset card component with error boundary
 */
export function AssetCard({
  asset,
  usedInTimeline = false,
  onAdd,
  onDelete,
  onViewVersions,
}: AssetCardProps) {
  return (
    <AssetErrorBoundary
      assetId={asset.id}
      assetName={asset.metadata?.filename}
      onRetry={() => {
        // Retry will be handled by component re-render
      }}
      onSkip={() => {
        // Skip - do nothing, let user continue
      }}
    >
      <div className="group relative flex flex-col gap-2">
        <button
          type="button"
          onClick={(): undefined => void onAdd(asset)}
          onKeyDown={(e): void => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              void onAdd(asset);
            }
          }}
          aria-label={`Add ${asset.metadata?.filename ?? asset.type} to timeline`}
          className="flex w-full items-center gap-3 rounded-lg border border-transparent bg-neutral-50 dark:bg-neutral-800 px-3 py-2 text-left transition hover:border-neutral-200 dark:hover:border-neutral-600 hover:bg-white dark:hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <AssetThumbnail asset={asset} />

          <div className="flex-1 text-xs">
            <p className="font-medium text-neutral-900 dark:text-neutral-100">
              {asset.metadata?.filename ?? extractFileName(asset.storage_url)}
            </p>

            {/* Asset size badge */}
            {(asset.metadata?.size || asset.metadata?.fileSize) && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {formatFileSize(Number(asset.metadata.size || asset.metadata.fileSize || 0))}
              </p>
            )}

            {/* Usage indicator */}
            {usedInTimeline && (
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
          {onViewVersions && (
            <button
              onClick={(e): void => {
                e.stopPropagation();
                onViewVersions(asset);
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
          )}

          {/* Delete button */}
          <button
            onClick={(e): void => {
              e.stopPropagation();
              void onDelete(asset);
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
    </AssetErrorBoundary>
  );
}
