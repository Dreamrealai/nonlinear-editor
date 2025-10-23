/**
 * VideoQueueItem Component
 *
 * Displays a single video in the generation queue.
 * Shows status, preview, and allows removal from queue.
 */
'use client';

import { useState } from 'react';

interface VideoQueueItemProps {
  id: string;
  prompt: string;
  operationName: string | null;
  status: 'queued' | 'generating' | 'completed' | 'failed';
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: string;
  onRemove: (id: string) => void;
}

export default function VideoQueueItem({
  id,
  prompt,
  status,
  videoUrl,
  thumbnailUrl,
  error,
  onRemove,
}: VideoQueueItemProps) {
  const [videoLoading, setVideoLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);

  return (
    <div className="group relative flex flex-col rounded-lg border border-neutral-200 bg-white shadow-sm overflow-hidden">
      {/* Video Preview */}
      <div className="relative aspect-video bg-neutral-100">
        {status === 'completed' && videoUrl ? (
          <>
            {/* Loading overlay */}
            {videoLoading && !videoError && (
              <div className="absolute inset-0 flex items-center justify-center bg-neutral-100 z-10">
                <div className="text-center">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-blue-600" />
                  <p className="mt-2 text-xs text-neutral-600">Loading video...</p>
                </div>
              </div>
            )}

            <video
              src={videoUrl}
              controls
              preload="auto"
              playsInline
              className="h-full w-full object-contain bg-black"
              poster={thumbnailUrl}
              onLoadStart={() => {
                console.log('Video loading started:', videoUrl);
                setVideoLoading(true);
                setVideoError(false);
              }}
              onLoadedData={() => {
                console.log('Video data loaded:', videoUrl);
                setVideoLoading(false);
              }}
              onCanPlay={() => {
                console.log('Video can play:', videoUrl);
                setVideoLoading(false);
              }}
              onError={(e) => {
                console.error('Video load error for:', videoUrl, e);
                setVideoLoading(false);
                setVideoError(true);
              }}
            >
              <track kind="captions" />
              Your browser does not support the video tag.
            </video>

            {/* Error state */}
            {videoError && (
              <div className="absolute inset-0 flex items-center justify-center bg-neutral-100">
                <div className="text-center p-4">
                  <svg className="mx-auto h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="mt-2 text-xs text-red-600">Failed to load video</p>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            {status === 'queued' && (
              <div className="text-center">
                <div className="mx-auto h-8 w-8 rounded-full border-4 border-neutral-300 border-t-neutral-600" />
                <p className="mt-2 text-xs text-neutral-600">Queued</p>
              </div>
            )}
            {status === 'generating' && (
              <div className="text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-purple-600" />
                <p className="mt-2 text-xs text-neutral-600">Generating...</p>
              </div>
            )}
            {status === 'failed' && (
              <div className="text-center p-4">
                <svg className="mx-auto h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="mt-2 text-xs text-red-600">Failed</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Video Info */}
      <div className="p-3">
        <p className="text-xs text-neutral-700 line-clamp-2 mb-2">
          {prompt}
        </p>

        {error && (
          <p className="text-xs text-red-600 mb-2">
            {error}
          </p>
        )}

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            status === 'completed' ? 'bg-green-100 text-green-700' :
            status === 'generating' ? 'bg-blue-100 text-blue-700' :
            status === 'failed' ? 'bg-red-100 text-red-700' :
            'bg-neutral-100 text-neutral-700'
          }`}>
            {status === 'completed' ? 'Completed' :
             status === 'generating' ? 'Generating' :
             status === 'failed' ? 'Failed' :
             'Queued'}
          </span>
        </div>
      </div>

      {/* Remove Button */}
      <button
        onClick={() => onRemove(id)}
        className="absolute right-2 top-2 z-10 rounded-md bg-black/50 p-1.5 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
        title="Remove from queue"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
