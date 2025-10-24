'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import toast from 'react-hot-toast';
import { browserLogger } from '@/lib/browserLogger';
import {
  PAGINATION_CONSTANTS,
  ACTIVITY_TIME_RANGES,
  SPINNER_CONSTANTS,
  FILE_SIZE_CONSTANTS,
} from '@/lib/constants/ui';

interface ActivityMetadata {
  duration?: number;
  resolution?: string;
  aspectRatio?: string;
  fileSize?: number;
  mimeType?: string;
}

interface ActivityHistoryEntry {
  id: string;
  activity_type: string;
  title: string | null;
  description: string | null;
  model: string | null;
  metadata: ActivityMetadata;
  created_at: string;
}

const activityTypeIcons: Record<string, string> = {
  video_generation: '🎬',
  audio_generation: '🎵',
  image_upload: '🖼️',
  video_upload: '📹',
  audio_upload: '🎧',
  frame_edit: '✨',
  video_upscale: '📈',
};

const activityTypeLabels: Record<string, string> = {
  video_generation: 'Video Generated',
  audio_generation: 'Audio Generated',
  image_upload: 'Image Uploaded',
  video_upload: 'Video Uploaded',
  audio_upload: 'Audio Uploaded',
  frame_edit: 'Frame Edited',
  video_upscale: 'Video Upscaled',
};

/**
 * Memoized activity history entry component
 */
interface ActivityEntryProps {
  entry: ActivityHistoryEntry;
  formatDate: (dateString: string) => string;
}

const ActivityEntry = React.memo<ActivityEntryProps>(function ActivityEntry({
  entry,
  formatDate,
}): React.ReactElement {
  return (
    <div
      key={entry.id}
      className="flex items-start gap-3 rounded-lg border border-neutral-100 p-3 hover:bg-neutral-50 transition-colors"
    >
      <div className="text-2xl flex-shrink-0">{activityTypeIcons[entry.activity_type] || '📄'}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-neutral-900 truncate">
              {entry.title || activityTypeLabels[entry.activity_type] || 'Activity'}
            </h3>
            {entry.description && (
              <p className="mt-0.5 text-xs text-neutral-600 line-clamp-2">{entry.description}</p>
            )}
            {entry.model && <p className="mt-0.5 text-xs text-neutral-500">Model: {entry.model}</p>}
            {entry.metadata && Object.keys(entry.metadata).length > 0 && (
              <div className="mt-1 flex flex-wrap gap-2">
                {entry.metadata.duration && (
                  <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700">
                    {entry.metadata.duration}s
                  </span>
                )}
                {entry.metadata.resolution && (
                  <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700">
                    {entry.metadata.resolution}
                  </span>
                )}
                {entry.metadata.aspectRatio && (
                  <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700">
                    {entry.metadata.aspectRatio}
                  </span>
                )}
                {entry.metadata.fileSize && (
                  <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700">
                    {(entry.metadata.fileSize / FILE_SIZE_CONSTANTS.BYTES_PER_MB).toFixed(1)} MB
                  </span>
                )}
              </div>
            )}
          </div>
          <span className="text-xs text-neutral-500 whitespace-nowrap">
            {formatDate(entry.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
});

export const ActivityHistory = React.memo(function ActivityHistory(): React.ReactElement {
  const { supabaseClient } = useSupabase();
  const [history, setHistory] = useState<ActivityHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearLoading, setClearLoading] = useState(false);

  const loadHistory = useCallback(async (): Promise<void> => {
    if (!supabaseClient) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/history?limit=${PAGINATION_CONSTANTS.HISTORY_LIMIT}`);

      if (!response.ok) {
        // Don't show error toast for 500 errors (likely table doesn't exist)
        // Just log it and show empty history
        browserLogger.error(
          { status: response.status, statusText: response.statusText },
          'Error loading activity history'
        );
        setHistory([]);
        setLoading(false);
        return;
      }

      const data = await response.json();
      setHistory(data.history || []);
    } catch (error) {
      browserLogger.error({ error }, 'Error loading activity history');
      // Fail silently - just show empty history
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [supabaseClient]);

  const handleClearHistory = useCallback(async (): Promise<void> => {
    const confirmed = confirm(
      'Are you sure you want to clear your entire activity history? This action cannot be undone.'
    );

    if (!confirmed) return;

    setClearLoading(true);

    try {
      const response = await fetch('/api/history', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to clear history');
      }

      setHistory([]);
      toast.success('Activity history cleared');
    } catch (error) {
      browserLogger.error({ error }, 'Error clearing activity history');
      toast.error('Failed to clear activity history');
    } finally {
      setClearLoading(false);
    }
  }, []);

  useEffect((): void => {
    void loadHistory();
  }, [loadHistory]);

  const formatDate = useCallback((dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / ACTIVITY_TIME_RANGES.ONE_MINUTE_MS);
    const diffHours = Math.floor(diffMs / ACTIVITY_TIME_RANGES.ONE_HOUR_MS);
    const diffDays = Math.floor(diffMs / ACTIVITY_TIME_RANGES.ONE_DAY_MS);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  }, []);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-neutral-900">Activity History</h2>
        {history.length > 0 && (
          <button
            onClick={handleClearHistory}
            disabled={clearLoading}
            className="rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {clearLoading ? 'Clearing...' : 'Clear History'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-8 text-center">
          <div
            className={`inline-block h-${SPINNER_CONSTANTS.SPINNER_SIZE_MD} w-${SPINNER_CONSTANTS.SPINNER_SIZE_MD} animate-spin rounded-full border-${SPINNER_CONSTANTS.SPINNER_BORDER_WIDTH} border-purple-200 border-t-purple-600 motion-reduce:animate-none dark:border-purple-800 dark:border-t-purple-400`}
            role="status"
            aria-label="Loading history"
          ></div>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">Loading history...</p>
        </div>
      ) : history.length === 0 ? (
        <div className="py-12 text-center">
          <div className="mb-2 text-4xl">📋</div>
          <p className="text-sm text-neutral-600">No activity yet</p>
          <p className="mt-1 text-xs text-neutral-500">
            Your AI generations and uploads will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="max-h-96 overflow-y-auto">
            {history.map(
              (entry): React.ReactElement => (
                <ActivityEntry key={entry.id} entry={entry} formatDate={formatDate} />
              )
            )}
          </div>
          <div className="pt-2 text-center text-xs text-neutral-500">
            Showing {history.length} {history.length === 1 ? 'entry' : 'entries'}
          </div>
        </div>
      )}
    </div>
  );
});
