/**
 * RenderQueuePanel Component
 *
 * Displays and manages the video export render queue
 * - Shows all active and completed export jobs
 * - Supports pause/resume/cancel operations
 * - Priority management
 * - Progress tracking
 * - Auto-refreshing status
 */
'use client';

import { useState } from 'react';
import { useRenderQueue } from '@/lib/hooks/useRenderQueue';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import {
  Play,
  Pause,
  X,
  ChevronUp,
  ChevronDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/lib/utils/timeFormatting';
import toast from 'react-hot-toast';

export interface RenderQueuePanelProps {
  className?: string;
}

export function RenderQueuePanel({ className }: RenderQueuePanelProps) {
  const { jobs, activeJobs, completedJobs, isLoading, error, refetch, cancelJob, pauseJob, resumeJob, updatePriority } = useRenderQueue({
    autoRefresh: true,
    refreshInterval: 3000, // Refresh every 3 seconds
    includeCompleted: true,
  });

  const [showCompleted, setShowCompleted] = useState(false);
  const [actioningJobId, setActioningJobId] = useState<string | null>(null);

  const handleCancel = async (jobId: string) => {
    setActioningJobId(jobId);
    try {
      await cancelJob(jobId);
      toast.success('Export cancelled');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel export');
    } finally {
      setActioningJobId(null);
    }
  };

  const handlePause = async (jobId: string) => {
    setActioningJobId(jobId);
    try {
      await pauseJob(jobId);
      toast.success('Export paused');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to pause export');
    } finally {
      setActioningJobId(null);
    }
  };

  const handleResume = async (jobId: string) => {
    setActioningJobId(jobId);
    try {
      await resumeJob(jobId);
      toast.success('Export resumed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to resume export');
    } finally {
      setActioningJobId(null);
    }
  };

  const handleIncreasePriority = async (jobId: string, currentPriority: number) => {
    setActioningJobId(jobId);
    try {
      await updatePriority(jobId, currentPriority + 1);
      toast.success('Priority increased');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update priority');
    } finally {
      setActioningJobId(null);
    }
  };

  const handleDecreasePriority = async (jobId: string, currentPriority: number) => {
    setActioningJobId(jobId);
    try {
      await updatePriority(jobId, Math.max(0, currentPriority - 1));
      toast.success('Priority decreased');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update priority');
    } finally {
      setActioningJobId(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled':
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Queued';
      case 'processing':
        return 'Rendering';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();

    if (diffMs < 60000) {
      return 'Just now';
    } else if (diffMs < 3600000) {
      const minutes = Math.floor(diffMs / 60000);
      return `${minutes}m ago`;
    } else if (diffMs < 86400000) {
      const hours = Math.floor(diffMs / 3600000);
      return `${hours}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (isLoading && jobs.length === 0) {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <LoadingSpinner size={32} />
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Render Queue</h2>
          <p className="text-sm text-muted-foreground">
            {activeJobs.length} active {activeJobs.length === 1 ? 'export' : 'exports'}
            {completedJobs.length > 0 && ` • ${completedJobs.length} completed`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Active Jobs */}
      {activeJobs.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Active Exports</h3>
          {activeJobs.map((job) => (
            <Card key={job.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(job.status)}
                      <CardTitle className="text-base">
                        {job.metadata.resolution} • {job.metadata.fps}fps • {job.metadata.format.toUpperCase()}
                      </CardTitle>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {job.metadata.clipCount} {job.metadata.clipCount === 1 ? 'clip' : 'clips'} •
                      Priority: {job.priority} •
                      {formatTimestamp(job.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Priority controls */}
                    {job.status === 'pending' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleIncreasePriority(job.id, job.priority)}
                          disabled={actioningJobId === job.id}
                          title="Increase priority"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDecreasePriority(job.id, job.priority)}
                          disabled={actioningJobId === job.id || job.priority === 0}
                          title="Decrease priority"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {/* Pause/Resume button */}
                    {job.status === 'processing' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePause(job.id)}
                        disabled={actioningJobId === job.id}
                        title="Pause export"
                      >
                        <Pause className="h-4 w-4" />
                      </Button>
                    )}
                    {job.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleResume(job.id)}
                        disabled={actioningJobId === job.id}
                        title="Resume export"
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                    {/* Cancel button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCancel(job.id)}
                      disabled={actioningJobId === job.id}
                      title="Cancel export"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Progress bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{getStatusLabel(job.status)}</span>
                    <span className="font-medium">{job.progress}%</span>
                  </div>
                  <ProgressBar progress={job.progress} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state for active jobs */}
      {activeJobs.length === 0 && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <Clock className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-sm font-medium">No active exports</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Export jobs will appear here when you start an export
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed Jobs Toggle */}
      {completedJobs.length > 0 && (
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCompleted(!showCompleted)}
            className="text-muted-foreground"
          >
            {showCompleted ? 'Hide' : 'Show'} Completed ({completedJobs.length})
          </Button>
        </div>
      )}

      {/* Completed Jobs */}
      {showCompleted && completedJobs.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Completed Exports</h3>
          {completedJobs.map((job) => (
            <Card key={job.id} className="opacity-80">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(job.status)}
                      <CardTitle className="text-base">
                        {job.metadata.resolution} • {job.metadata.fps}fps • {job.metadata.format.toUpperCase()}
                      </CardTitle>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {getStatusLabel(job.status)} •
                      {job.completedAt && ` ${formatTimestamp(job.completedAt)}`}
                    </p>
                  </div>
                </div>
              </CardHeader>
              {job.errorMessage && (
                <CardContent>
                  <Alert variant="destructive">
                    <AlertDescription className="text-xs">{job.errorMessage}</AlertDescription>
                  </Alert>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default RenderQueuePanel;
