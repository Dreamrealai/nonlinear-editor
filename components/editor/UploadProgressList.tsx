/**
 * UploadProgressList Component
 *
 * Displays upload progress for multiple files with detailed status.
 */
'use client';

import React from 'react';
import type { UploadProgress } from '@/lib/hooks/useAssetUploadProgress';

interface UploadProgressListProps {
  uploads: UploadProgress[];
  onClearUpload?: (id: string) => void;
}

/**
 * Displays a list of active uploads with progress bars and status.
 */
export function UploadProgressList({ uploads, onClearUpload }: UploadProgressListProps) {
  if (uploads.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {uploads.map((upload) => (
        <div
          key={upload.id}
          className="rounded-lg border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-700 dark:bg-neutral-800"
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                {upload.file.name}
              </p>
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                {upload.status}
              </p>
            </div>

            {upload.phase === 'complete' || upload.phase === 'error' ? (
              <button
                onClick={() => onClearUpload?.(upload.id)}
                className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition"
                aria-label="Dismiss"
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
            ) : null}
          </div>

          {/* Progress Bar */}
          <div className="relative h-2 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
            <div
              className={`absolute left-0 top-0 h-full transition-all duration-300 ease-out ${
                upload.phase === 'error'
                  ? 'bg-red-500'
                  : upload.phase === 'complete'
                    ? 'bg-green-500'
                    : 'bg-purple-500'
              }`}
              style={{ width: `${upload.progress}%` }}
            />
          </div>

          {/* Progress Percentage and Phase */}
          <div className="flex items-center justify-between mt-2 text-xs">
            <span className="text-neutral-600 dark:text-neutral-400">
              {upload.phase === 'uploading' && upload.progress < 80 && 'Uploading...'}
              {upload.phase === 'uploading' && upload.progress >= 80 && 'Upload complete'}
              {upload.phase === 'processing' && 'Processing...'}
              {upload.phase === 'complete' && 'Complete'}
              {upload.phase === 'error' && 'Failed'}
            </span>
            <span
              className={`font-medium ${
                upload.phase === 'error'
                  ? 'text-red-600 dark:text-red-400'
                  : upload.phase === 'complete'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-purple-600 dark:text-purple-400'
              }`}
            >
              {upload.progress}%
            </span>
          </div>

          {/* Error Message */}
          {upload.error && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-2">{upload.error}</p>
          )}
        </div>
      ))}
    </div>
  );
}
