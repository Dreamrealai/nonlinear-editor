/**
 * Generation Dashboard Hook
 *
 * Manages polling and state for all active AI generation jobs
 * Provides a unified view of video, audio, and image generations
 */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePolling } from '@/lib/hooks/usePolling';

export type GenerationType = 'video' | 'audio' | 'image';
export type GenerationStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface GenerationJob {
  /** Unique job identifier */
  id: string;
  /** Type of generation */
  type: GenerationType;
  /** Current status */
  status: GenerationStatus;
  /** Progress percentage (0-100) */
  progress: number;
  /** Human-readable title/description */
  title: string;
  /** Prompt or input used for generation */
  prompt?: string;
  /** Model/provider used */
  model?: string;
  /** Operation name for status polling */
  operationName: string;
  /** Project ID this belongs to */
  projectId: string;
  /** Start time */
  startedAt: Date;
  /** Completion time */
  completedAt?: Date;
  /** Error message if failed */
  error?: string;
  /** Result asset ID if completed */
  assetId?: string;
  /** Result URL if available */
  resultUrl?: string;
  /** Estimated time remaining (seconds) */
  estimatedTimeRemaining?: number;
  /** Metadata specific to generation type */
  metadata?: Record<string, unknown>;
}

interface UseGenerationDashboardOptions {
  /** Project ID to filter jobs */
  projectId?: string;
  /** Enable polling */
  enabled?: boolean;
  /** Polling interval in ms (default: 10000 - 10 seconds) */
  pollingInterval?: number;
  /** Auto-remove completed jobs after N milliseconds */
  autoRemoveCompletedAfter?: number;
}

interface UseGenerationDashboardReturn {
  /** All active generation jobs */
  jobs: GenerationJob[];
  /** Jobs filtered by type */
  videoJobs: GenerationJob[];
  audioJobs: GenerationJob[];
  imageJobs: GenerationJob[];
  /** Active (processing/queued) jobs */
  activeJobs: GenerationJob[];
  /** Completed jobs */
  completedJobs: GenerationJob[];
  /** Failed jobs */
  failedJobs: GenerationJob[];
  /** Add a new job to track */
  addJob: (job: Omit<GenerationJob, 'startedAt'>) => void;
  /** Remove a job by ID */
  removeJob: (jobId: string) => void;
  /** Clear all completed jobs */
  clearCompleted: () => void;
  /** Clear all failed jobs */
  clearFailed: () => void;
  /** Clear all jobs */
  clearAll: () => void;
  /** Manually refresh job statuses */
  refresh: () => Promise<void>;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: string | null;
}

/**
 * Hook to manage and track all AI generation jobs across the dashboard
 */
export function useGenerationDashboard({
  projectId,
  enabled = true,
  pollingInterval = 10000,
  autoRemoveCompletedAfter,
}: UseGenerationDashboardOptions = {}): UseGenerationDashboardReturn {
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoRemoveTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Add a new job to track
  const addJob = useCallback((job: Omit<GenerationJob, 'startedAt'>) => {
    const newJob: GenerationJob = {
      ...job,
      startedAt: new Date(),
    };

    setJobs((prev) => {
      // Check if job already exists
      const exists = prev.some((j) => j.id === newJob.id);
      if (exists) {
        return prev;
      }
      return [...prev, newJob];
    });
  }, []);

  // Remove a job
  const removeJob = useCallback((jobId: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== jobId));

    // Clear auto-remove timer if exists
    const timer = autoRemoveTimers.current.get(jobId);
    if (timer) {
      clearTimeout(timer);
      autoRemoveTimers.current.delete(jobId);
    }
  }, []);

  // Clear completed jobs
  const clearCompleted = useCallback(() => {
    setJobs((prev) => prev.filter((j) => j.status !== 'completed'));
  }, []);

  // Clear failed jobs
  const clearFailed = useCallback(() => {
    setJobs((prev) => prev.filter((j) => j.status !== 'failed'));
  }, []);

  // Clear all jobs
  const clearAll = useCallback(() => {
    setJobs([]);
    // Clear all timers
    autoRemoveTimers.current.forEach((timer) => clearTimeout(timer));
    autoRemoveTimers.current.clear();
  }, []);

  // Check status of a single job
  const checkJobStatus = useCallback(async (job: GenerationJob): Promise<Partial<GenerationJob> | null> => {
    try {
      let endpoint = '';
      let queryParams = new URLSearchParams();

      // Determine endpoint based on job type
      if (job.type === 'video') {
        endpoint = '/api/video/status';
        queryParams.append('operationName', job.operationName);
        queryParams.append('projectId', job.projectId);
      } else if (job.type === 'audio') {
        // Determine audio endpoint based on operation name
        if (job.operationName.startsWith('suno:')) {
          endpoint = '/api/audio/suno/status';
          const taskId = job.operationName.replace('suno:', '');
          queryParams.append('taskId', taskId);
          queryParams.append('projectId', job.projectId);
        } else if (job.operationName.startsWith('elevenlabs:')) {
          endpoint = '/api/audio/elevenlabs/status';
          const requestId = job.operationName.replace('elevenlabs:', '');
          queryParams.append('requestId', requestId);
          queryParams.append('projectId', job.projectId);
        } else {
          return null;
        }
      } else if (job.type === 'image') {
        // Image generation status endpoint (if exists)
        endpoint = '/api/image/status';
        queryParams.append('operationName', job.operationName);
        queryParams.append('projectId', job.projectId);
      }

      const response = await fetch(`${endpoint}?${queryParams.toString()}`);

      if (!response.ok) {
        throw new Error(`Status check failed: ${response.status}`);
      }

      const data = await response.json();

      // Parse response based on type
      if (job.type === 'video') {
        if (data.done) {
          return {
            status: data.error ? 'failed' : 'completed',
            progress: 100,
            completedAt: new Date(),
            error: data.error,
            assetId: data.asset?.id,
            resultUrl: data.asset?.storage_url,
          };
        } else {
          return {
            status: 'processing',
            progress: data.progress || 0,
          };
        }
      } else if (job.type === 'audio') {
        // Suno response
        if (data.tasks && data.tasks.length > 0) {
          const task = data.tasks[0];
          if (task.status === 'completed' || task.audioUrl) {
            return {
              status: 'completed',
              progress: 100,
              completedAt: new Date(),
              resultUrl: task.audioUrl,
            };
          } else if (task.status === 'failed') {
            return {
              status: 'failed',
              progress: 0,
              completedAt: new Date(),
              error: 'Audio generation failed',
            };
          } else {
            return {
              status: 'processing',
              progress: task.status === 'processing' ? 50 : 0,
            };
          }
        }
      }

      return null;
    } catch (err) {
      console.error(`Error checking status for job ${job.id}:`, err);
      return null;
    }
  }, []);

  // Refresh all job statuses
  const refresh = useCallback(async () => {
    if (jobs.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const updates = await Promise.all(
        jobs
          .filter((job) => job.status === 'processing' || job.status === 'queued')
          .map(async (job) => {
            const update = await checkJobStatus(job);
            return { jobId: job.id, update };
          })
      );

      // Apply updates
      setJobs((prev) =>
        prev.map((job) => {
          const updateEntry = updates.find((u) => u.jobId === job.id);
          if (updateEntry && updateEntry.update) {
            const updatedJob = { ...job, ...updateEntry.update };

            // Set auto-remove timer for completed jobs
            if (
              autoRemoveCompletedAfter &&
              (updatedJob.status === 'completed' || updatedJob.status === 'failed') &&
              !autoRemoveTimers.current.has(job.id)
            ) {
              const timer = setTimeout(() => {
                removeJob(job.id);
              }, autoRemoveCompletedAfter);
              autoRemoveTimers.current.set(job.id, timer);
            }

            return updatedJob;
          }
          return job;
        })
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh job statuses';
      setError(errorMessage);
      console.error('Error refreshing job statuses:', err);
    } finally {
      setIsLoading(false);
    }
  }, [jobs, checkJobStatus, autoRemoveCompletedAfter, removeJob]);

  // Use polling hook for automatic refresh
  usePolling({
    callback: refresh,
    interval: pollingInterval,
    enabled: enabled && jobs.some((j) => j.status === 'processing' || j.status === 'queued'),
  });

  // Filter jobs by type
  const videoJobs = jobs.filter((j) => j.type === 'video');
  const audioJobs = jobs.filter((j) => j.type === 'audio');
  const imageJobs = jobs.filter((j) => j.type === 'image');

  // Filter by status
  const activeJobs = jobs.filter((j) => j.status === 'processing' || j.status === 'queued');
  const completedJobs = jobs.filter((j) => j.status === 'completed');
  const failedJobs = jobs.filter((j) => j.status === 'failed');

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      autoRemoveTimers.current.forEach((timer) => clearTimeout(timer));
      autoRemoveTimers.current.clear();
    };
  }, []);

  return {
    jobs: projectId ? jobs.filter((j) => j.projectId === projectId) : jobs,
    videoJobs: projectId ? videoJobs.filter((j) => j.projectId === projectId) : videoJobs,
    audioJobs: projectId ? audioJobs.filter((j) => j.projectId === projectId) : audioJobs,
    imageJobs: projectId ? imageJobs.filter((j) => j.projectId === projectId) : imageJobs,
    activeJobs: projectId ? activeJobs.filter((j) => j.projectId === projectId) : activeJobs,
    completedJobs: projectId ? completedJobs.filter((j) => j.projectId === projectId) : completedJobs,
    failedJobs: projectId ? failedJobs.filter((j) => j.projectId === projectId) : failedJobs,
    addJob,
    removeJob,
    clearCompleted,
    clearFailed,
    clearAll,
    refresh,
    isLoading,
    error,
  };
}
