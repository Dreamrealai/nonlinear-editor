/**
 * Generation Dashboard Component
 *
 * Unified dashboard for tracking all AI generation jobs (video, audio, image)
 * Provides real-time updates, filtering, and management of generation jobs
 */
'use client';

import React, { useState } from 'react';
import { X, Video, Music, Image as ImageIcon, Filter, Trash2, RefreshCw, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';
import { useGenerationDashboard, type GenerationType, type GenerationJob } from '@/lib/hooks/useGenerationDashboard';
import { GenerationProgress } from '@/components/ui/GenerationProgress';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface GenerationDashboardProps {
  /** Project ID to filter jobs */
  projectId?: string;
  /** Whether the dashboard is open */
  isOpen: boolean;
  /** Callback when dashboard should close */
  onClose: () => void;
  /** Variant: modal (overlay) or sidebar (embedded) */
  variant?: 'modal' | 'sidebar';
}

type FilterType = 'all' | GenerationType;
type StatusFilter = 'all' | 'active' | 'completed' | 'failed';

/**
 * Get icon for generation type
 */
function getTypeIcon(type: GenerationType): React.ReactNode {
  switch (type) {
    case 'video':
      return <Video className="w-4 h-4" />;
    case 'audio':
      return <Music className="w-4 h-4" />;
    case 'image':
      return <ImageIcon className="w-4 h-4" />;
  }
}

/**
 * Get status icon
 */
function getStatusIcon(status: GenerationJob['status']): React.ReactNode {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    case 'failed':
      return <XCircle className="w-4 h-4 text-red-600" />;
    case 'processing':
      return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
    case 'queued':
      return <Clock className="w-4 h-4 text-yellow-600" />;
  }
}

/**
 * Format duration
 */
function formatDuration(startedAt: Date, completedAt?: Date): string {
  const end = completedAt || new Date();
  const durationMs = end.getTime() - startedAt.getTime();
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Job Card Component
 */
function JobCard({ job, onRemove }: { job: GenerationJob; onRemove: (id: string) => void }): React.JSX.Element {
  const isActive = job.status === 'processing' || job.status === 'queued';

  return (
    <div
      className={cn(
        'rounded-lg border p-4 transition-all',
        job.status === 'completed' && 'border-green-200 bg-green-50',
        job.status === 'failed' && 'border-red-200 bg-red-50',
        job.status === 'processing' && 'border-blue-200 bg-blue-50',
        job.status === 'queued' && 'border-yellow-200 bg-yellow-50'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className={cn(
            'flex-shrink-0 rounded-full p-2',
            job.status === 'completed' && 'bg-green-100',
            job.status === 'failed' && 'bg-red-100',
            job.status === 'processing' && 'bg-blue-100',
            job.status === 'queued' && 'bg-yellow-100'
          )}>
            {getTypeIcon(job.type)}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm text-neutral-900 truncate">{job.title}</h4>
            <p className="text-xs text-neutral-600">
              {job.model && <span className="capitalize">{job.model}</span>}
              {job.model && ' • '}
              {formatDuration(job.startedAt, job.completedAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusIcon(job.status)}
          <button
            onClick={() => onRemove(job.id)}
            className="text-neutral-400 hover:text-neutral-600 transition-colors"
            aria-label="Remove job"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Prompt (if available) */}
      {job.prompt && (
        <p className="text-xs text-neutral-600 mb-3 line-clamp-2">
          {job.prompt}
        </p>
      )}

      {/* Progress Bar (for active jobs) */}
      {isActive && (
        <GenerationProgress
          progress={job.progress}
          currentAttempt={1}
          maxAttempts={10}
          generationType={job.type}
          variant="compact"
          showCancel={false}
          className="mb-0"
        />
      )}

      {/* Error Message */}
      {job.status === 'failed' && job.error && (
        <div className="mt-3 p-2 bg-red-100 border border-red-200 rounded text-xs text-red-800">
          {job.error}
        </div>
      )}

      {/* Success Message with Asset Link */}
      {job.status === 'completed' && (
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-green-700 font-medium">Generation completed!</span>
          {job.assetId && (
            <button className="text-xs text-blue-600 hover:text-blue-800 font-medium">
              View Asset
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Generation Dashboard Component
 */
export function GenerationDashboard({
  projectId,
  isOpen,
  onClose,
  variant = 'modal',
}: GenerationDashboardProps): React.JSX.Element | null {
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const {
    jobs,
    videoJobs,
    audioJobs,
    imageJobs,
    activeJobs,
    completedJobs,
    failedJobs,
    removeJob,
    clearCompleted,
    clearFailed,
    clearAll,
    refresh,
    isLoading,
  } = useGenerationDashboard({
    projectId,
    enabled: isOpen,
    pollingInterval: 10000, // Poll every 10 seconds
    autoRemoveCompletedAfter: 300000, // Auto-remove after 5 minutes
  });

  // Filter jobs
  const filteredJobs = jobs.filter((job) => {
    // Type filter
    if (typeFilter !== 'all' && job.type !== typeFilter) {
      return false;
    }

    // Status filter
    if (statusFilter === 'active' && job.status !== 'processing' && job.status !== 'queued') {
      return false;
    }
    if (statusFilter === 'completed' && job.status !== 'completed') {
      return false;
    }
    if (statusFilter === 'failed' && job.status !== 'failed') {
      return false;
    }

    return true;
  });

  if (!isOpen) return null;

  const content = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-200">
        <div>
          <h2 className="text-lg font-bold text-neutral-900">Generation Dashboard</h2>
          <p className="text-xs text-neutral-600 mt-0.5">
            {activeJobs.length} active • {completedJobs.length} completed • {failedJobs.length} failed
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            disabled={isLoading}
            className="p-2 rounded-lg hover:bg-neutral-100 transition-colors disabled:opacity-50"
            aria-label="Refresh"
          >
            <RefreshCw className={cn('w-4 h-4 text-neutral-600', isLoading && 'animate-spin')} />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-neutral-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-neutral-600" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-neutral-200 space-y-3">
        {/* Type Filter */}
        <div>
          <label className="text-xs font-semibold text-neutral-700 mb-2 block">Type</label>
          <div className="flex gap-2">
            <Button
              variant={typeFilter === 'all' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setTypeFilter('all')}
            >
              All ({jobs.length})
            </Button>
            <Button
              variant={typeFilter === 'video' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setTypeFilter('video')}
            >
              <Video className="w-3 h-3 mr-1" />
              Video ({videoJobs.length})
            </Button>
            <Button
              variant={typeFilter === 'audio' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setTypeFilter('audio')}
            >
              <Music className="w-3 h-3 mr-1" />
              Audio ({audioJobs.length})
            </Button>
            <Button
              variant={typeFilter === 'image' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setTypeFilter('image')}
            >
              <ImageIcon className="w-3 h-3 mr-1" />
              Image ({imageJobs.length})
            </Button>
          </div>
        </div>

        {/* Status Filter */}
        <div>
          <label className="text-xs font-semibold text-neutral-700 mb-2 block">Status</label>
          <div className="flex gap-2">
            <Button
              variant={statusFilter === 'all' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setStatusFilter('all')}
            >
              All
            </Button>
            <Button
              variant={statusFilter === 'active' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setStatusFilter('active')}
            >
              Active ({activeJobs.length})
            </Button>
            <Button
              variant={statusFilter === 'completed' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setStatusFilter('completed')}
            >
              Completed ({completedJobs.length})
            </Button>
            <Button
              variant={statusFilter === 'failed' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setStatusFilter('failed')}
            >
              Failed ({failedJobs.length})
            </Button>
          </div>
        </div>

        {/* Actions */}
        {(completedJobs.length > 0 || failedJobs.length > 0 || jobs.length > 0) && (
          <div className="flex gap-2">
            {completedJobs.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={clearCompleted}
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Clear Completed
              </Button>
            )}
            {failedJobs.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={clearFailed}
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Clear Failed
              </Button>
            )}
            {jobs.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={clearAll}
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Clear All
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Jobs List */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <Filter className="w-12 h-12 text-neutral-300 mb-3" />
            <h3 className="text-sm font-semibold text-neutral-900 mb-1">No generations found</h3>
            <p className="text-xs text-neutral-600">
              {jobs.length === 0
                ? 'Start generating videos, audio, or images to see them here'
                : 'Try adjusting your filters'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredJobs.map((job) => (
              <JobCard key={job.id} job={job} onRemove={removeJob} />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Render as modal or sidebar
  if (variant === 'modal') {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {content}
        </div>
      </div>
    );
  }

  // Sidebar variant
  return (
    <div className="h-full bg-white border-l border-neutral-200 shadow-lg">
      {content}
    </div>
  );
}

/**
 * Hook to manage dashboard state
 */
export function useGenerationDashboardModal(): {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
} {
  const [isOpen, setIsOpen] = useState(false);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((prev) => !prev),
  };
}
