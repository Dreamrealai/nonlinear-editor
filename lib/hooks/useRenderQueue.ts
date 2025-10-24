/**
 * useRenderQueue Hook
 *
 * Manages the render queue for video exports
 * - Fetches active and completed export jobs
 * - Provides actions to pause, resume, cancel jobs
 * - Auto-refreshes queue status
 * - Supports priority management
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { browserLogger } from '@/lib/browserLogger';

export interface RenderJob {
  id: string;
  projectId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  priority: number;
  config: {
    timeline: {
      clips: Array<{
        id: string;
        assetId: string;
        start: number;
        end: number;
      }>;
    };
    outputSpec: {
      width: number;
      height: number;
      fps: number;
      format: string;
    };
  };
  metadata: {
    clipCount: number;
    format: string;
    resolution: string;
    fps: number;
  };
  errorMessage?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

interface UseRenderQueueOptions {
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
  includeCompleted?: boolean;
}

export interface UseRenderQueueReturn {
  jobs: RenderJob[];
  activeJobs: RenderJob[];
  completedJobs: RenderJob[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  cancelJob: (jobId: string) => Promise<boolean>;
  pauseJob: (jobId: string) => Promise<boolean>;
  resumeJob: (jobId: string) => Promise<boolean>;
  updatePriority: (jobId: string, priority: number) => Promise<boolean>;
}

export function useRenderQueue(options: UseRenderQueueOptions = {}): UseRenderQueueReturn {
  const {
    autoRefresh = true,
    refreshInterval = 5000, // 5 seconds
    includeCompleted = true,
  } = options;

  const [jobs, setJobs] = useState<RenderJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async (): Promise<void> => {
    try {
      const params = new URLSearchParams();
      if (includeCompleted) {
        params.append('includeCompleted', 'true');
      }

      const response = await fetch(`/api/export/queue?${params.toString()}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch render queue');
      }

      const data = await response.json();
      setJobs(data.data.jobs || []);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch render queue';
      setError(errorMessage);
      browserLogger.error({ error: err }, 'Failed to fetch render queue');
    } finally {
      setIsLoading(false);
    }
  }, [includeCompleted]);

  // Auto-refresh queue
  useEffect((): (() => void) | undefined => {
    fetchJobs();

    if (autoRefresh) {
      const interval = setInterval(fetchJobs, refreshInterval);
      return (): void => clearInterval(interval);
    }
  }, [fetchJobs, autoRefresh, refreshInterval]);

  const cancelJob = useCallback(async (jobId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/export/queue/${jobId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to cancel job');
      }

      // Refresh jobs list
      await fetchJobs();

      browserLogger.info({ jobId }, 'Job cancelled successfully');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel job';
      browserLogger.error({ error: err, jobId }, 'Failed to cancel job');
      throw new Error(errorMessage);
    }
  }, [fetchJobs]);

  const pauseJob = useCallback(async (jobId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/export/queue/${jobId}/pause`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to pause job');
      }

      // Refresh jobs list
      await fetchJobs();

      browserLogger.info({ jobId }, 'Job paused successfully');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to pause job';
      browserLogger.error({ error: err, jobId }, 'Failed to pause job');
      throw new Error(errorMessage);
    }
  }, [fetchJobs]);

  const resumeJob = useCallback(async (jobId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/export/queue/${jobId}/resume`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to resume job');
      }

      // Refresh jobs list
      await fetchJobs();

      browserLogger.info({ jobId }, 'Job resumed successfully');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resume job';
      browserLogger.error({ error: err, jobId }, 'Failed to resume job');
      throw new Error(errorMessage);
    }
  }, [fetchJobs]);

  const updatePriority = useCallback(async (jobId: string, priority: number): Promise<boolean> => {
    try {
      const response = await fetch(`/api/export/queue/${jobId}/priority`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priority }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update priority');
      }

      // Refresh jobs list
      await fetchJobs();

      browserLogger.info({ jobId, priority }, 'Job priority updated');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update priority';
      browserLogger.error({ error: err, jobId, priority }, 'Failed to update priority');
      throw new Error(errorMessage);
    }
  }, [fetchJobs]);

  const activeJobs = jobs.filter(job => job.status === 'pending' || job.status === 'processing');
  const completedJobs = jobs.filter(job =>
    job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled'
  );

  return {
    jobs,
    activeJobs,
    completedJobs,
    isLoading,
    error,
    refetch: fetchJobs,
    cancelJob,
    pauseJob,
    resumeJob,
    updatePriority,
  };
}
