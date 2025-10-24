/**
 * AssetLibraryModal Component
 *
 * Modal dialog for selecting images from the asset library.
 * Used for selecting reference images for video generation.
 */
'use client';

import React, {  useState, useEffect  } from 'react';
import Image from 'next/image';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface ImageAsset {
  id: string;
  storage_url: string;
  metadata?: {
    thumbnail?: string;
  };
  created_at: string;
}

interface AssetLibraryModalProps {
  projectId: string;
  onSelect: (asset: ImageAsset) => void;
  onClose: () => void;
}

export function AssetLibraryModal({ projectId, onSelect, onClose }: AssetLibraryModalProps): React.ReactElement {
  const [assets, setAssets] = useState<ImageAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  useEffect((): void => {
    const fetchAssets = async (): Promise<void> => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/assets?projectId=${projectId}&type=image&page=${currentPage}&pageSize=${pageSize}`
        );
        if (!res.ok) {
          throw new Error('Failed to fetch assets');
        }
        const data = await res.json();
        setAssets(data.assets || []);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages);
          setTotalCount(data.pagination.totalCount);
        }
      } catch (err) {
        const { browserLogger } = await import('@/lib/browserLogger');
        browserLogger.error({ error: err, projectId }, 'Error fetching assets');
        setError(err instanceof Error ? err.message : 'Failed to load assets');
      } finally {
        setLoading(false);
      }
    };

    fetchAssets();
  }, [projectId, currentPage]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-4xl rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 p-6">
          <h2 className="text-xl font-semibold text-neutral-900">Select Image from Library</h2>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-neutral-500 hover:bg-neutral-100 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : error ? (
            <div className="rounded-lg bg-red-50 p-4 text-center">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          ) : assets.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-neutral-400 mb-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="text-sm font-medium text-neutral-900 mb-1">No images found</p>
              <p className="text-xs text-neutral-500">Upload an image to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {assets.map((asset): React.ReactElement => (
                <button
                  key={asset.id}
                  onClick={(): void => onSelect(asset)}
                  className="group relative aspect-square overflow-hidden rounded-lg border-2 border-neutral-200 hover:border-blue-500 transition-colors"
                >
                  <Image
                    src={asset.metadata?.thumbnail || asset.storage_url}
                    alt="Asset"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-200 p-6">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              Cancel
            </button>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center gap-4">
                <div className="text-xs text-neutral-600">
                  Page {currentPage + 1} of {totalPages} ({totalCount} total)
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={(): void => setCurrentPage((prev): number => Math.max(0, prev - 1))}
                    disabled={currentPage === 0 || loading}
                    className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={(): void => setCurrentPage((prev): number => Math.min(totalPages - 1, prev + 1))}
                    disabled={currentPage >= totalPages - 1 || loading}
                    className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
