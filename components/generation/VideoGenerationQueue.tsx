'use client';

/**
 * VideoGenerationQueue Component
 *
 * Displays the video generation queue in a 2-column grid layout.
 * Shows all queued, generating, completed, and failed videos.
 */

import { VideoQueueItem } from './VideoQueueItem';
import { NUMERIC_LIMITS } from '@/lib/config';
import type { VideoQueueItemData } from '@/lib/utils/videoGenerationUtils';
import { hasCompletedItems } from '@/lib/utils/videoGenerationUtils';

interface VideoGenerationQueueProps {
  /** Array of videos in the queue */
  videoQueue: VideoQueueItemData[];
  /** Callback when a video is removed */
  onRemove: (videoId: string) => void;
  /** Callback when clearing completed videos */
  onClearCompleted: () => void;
}

/**
 * Video generation queue display component
 */
export function VideoGenerationQueue({
  videoQueue,
  onRemove,
  onClearCompleted,
}: VideoGenerationQueueProps): React.ReactElement {
  const showClearButton = hasCompletedItems(videoQueue);

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-900">
          Video Queue ({videoQueue.length}/{NUMERIC_LIMITS.VIDEO_QUEUE_MAX})
        </h2>
        {showClearButton && (
          <button
            onClick={onClearCompleted}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Clear Completed
          </button>
        )}
      </div>

      {/* Queue Grid */}
      <div className="flex-1 overflow-y-auto">
        {videoQueue.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50 p-8">
            <div className="text-center">
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
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <p className="text-sm font-medium text-neutral-900 mb-1">No videos in queue</p>
              <p className="text-xs text-neutral-500">Generate videos to see them appear here</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {videoQueue.map(
              (video): React.ReactElement => (
                <VideoQueueItem key={video.id} {...video} onRemove={onRemove} />
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
