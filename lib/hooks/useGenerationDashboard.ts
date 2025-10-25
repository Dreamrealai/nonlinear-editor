/**
 * Generation Dashboard Hook
 *
 * Manages polling and state for all active AI generation jobs
 * Provides a unified view of video, audio, and image generations
 */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

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
  const addJob = useCallback((job: Omit<GenerationJob, 'startedAt'>): void => {
    const newJob: GenerationJob = {
      ...job,
      startedAt: new Date(),
    };

    setJobs((prev): GenerationJob[] => {
      // Check if job already exists
      const exists = prev.some((j): boolean => j.id === newJob.id);
      if (exists) {
        return prev;
      }
      return [...prev, newJob];
    });
  }, []);

  // Remove a job
  const removeJob = useCallback((jobId: string): void => {
    setJobs((prev): GenerationJob[] => prev.filter((j): boolean => j.id !== jobId));

    // Clear auto-remove timer if exists
    const timer = autoRemoveTimers.current.get(jobId);
    if (timer) {
      clearTimeout(timer);
      autoRemoveTimers.current.delete(jobId);
    }
  }, []);

  // Clear completed jobs
  const clearCompleted = useCallback((): void => {
    setJobs((prev): GenerationJob[] => prev.filter((j): boolean => j.status !== 'completed'));
  }, []);

  // Clear failed jobs
  const clearFailed = useCallback((): void => {
    setJobs((prev): GenerationJob[] => prev.filter((j): boolean => j.status !== 'failed'));
  }, []);

  // Clear all jobs
  const clearAll = useCallback((): void => {
    setJobs([]);
    // Clear all timers
    autoRemoveTimers.current.forEach((timer): void => clearTimeout(timer));
    autoRemoveTimers.current.clear();
  }, []);

  // Check status of a single job
  const checkJobStatus = useCallback(
    async (job: GenerationJob): Promise<Partial<GenerationJob> | null> => {
      try {
        let endpoint = '';
        const queryParams = new URLSearchParams();

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
    },
    []
  );

  // Refresh all job statuses
  // NOTE: Fixed circular dependency - use setJobs callback to access current jobs instead of depending on jobs state
  const refresh = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      // Use setJobs callback to get current jobs state without adding to dependencies
      await new Promise<void>((resolve) => {
        setJobs((currentJobs): GenerationJob[] => {
          // If no jobs, skip refresh
          if (currentJobs.length === 0) {
            setIsLoading(false);
            resolve();
            return currentJobs;
          }

          // Process job updates asynchronously
          void (async (): Promise<void> => {
            try {
              const updates = await Promise.all(
                currentJobs
                  .filter((job): boolean => job.status === 'processing' || job.status === 'queued')
                  .map(
                    async (
                      job
                    ): Promise<{ jobId: string; update: Partial<GenerationJob> | null }> => {
                      const update = await checkJobStatus(job);
                      return { jobId: job.id, update };
                    }
                  )
              );

              // Apply updates
              setJobs((prev): GenerationJob[] =>
                prev.map((job): GenerationJob => {
                  const updateEntry = updates.find((u): boolean => u.jobId === job.id);
                  if (updateEntry && updateEntry.update) {
                    const updatedJob = { ...job, ...updateEntry.update };

                    // Set auto-remove timer for completed jobs
                    if (
                      autoRemoveCompletedAfter &&
                      (updatedJob.status === 'completed' || updatedJob.status === 'failed') &&
                      !autoRemoveTimers.current.has(job.id)
                    ) {
                      const timer = setTimeout((): void => {
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
              const errorMessage =
                err instanceof Error ? err.message : 'Failed to refresh job statuses';
              setError(errorMessage);
              console.error('Error refreshing job statuses:', err);
            } finally {
              setIsLoading(false);
              resolve();
            }
          })();

          return currentJobs;
        });
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh job statuses';
      setError(errorMessage);
      console.error('Error refreshing job statuses:', err);
      setIsLoading(false);
    }
  }, [checkJobStatus, autoRemoveCompletedAfter, removeJob]);

  // Use polling for automatic refresh when jobs are active
  useEffect(() => {
    if (
      !enabled ||
      !jobs.some((j): boolean => j.status === 'processing' || j.status === 'queued')
    ) {
      return;
    }

    const intervalId = setInterval(() => {
      void refresh();
    }, pollingInterval);

    return () => clearInterval(intervalId);
  }, [enabled, jobs, pollingInterval, refresh]);

  // Filter jobs by type
  const videoJobs = jobs.filter((j): boolean => j.type === 'video');
  const audioJobs = jobs.filter((j): boolean => j.type === 'audio');
  const imageJobs = jobs.filter((j): boolean => j.type === 'image');

  // Filter by status
  const activeJobs = jobs.filter(
    (j): boolean => j.status === 'processing' || j.status === 'queued'
  );
  const completedJobs = jobs.filter((j): boolean => j.status === 'completed');
  const failedJobs = jobs.filter((j): boolean => j.status === 'failed');

  // Cleanup timers on unmount
  useEffect((): (() => void) => {
    return (): void => {
      autoRemoveTimers.current.forEach((timer): void => clearTimeout(timer));
      autoRemoveTimers.current.clear();
    };
  }, []);

  return {
    jobs: projectId ? jobs.filter((j): boolean => j.projectId === projectId) : jobs,
    videoJobs: projectId ? videoJobs.filter((j): boolean => j.projectId === projectId) : videoJobs,
    audioJobs: projectId ? audioJobs.filter((j): boolean => j.projectId === projectId) : audioJobs,
    imageJobs: projectId ? imageJobs.filter((j): boolean => j.projectId === projectId) : imageJobs,
    activeJobs: projectId
      ? activeJobs.filter((j): boolean => j.projectId === projectId)
      : activeJobs,
    completedJobs: projectId
      ? completedJobs.filter((j): boolean => j.projectId === projectId)
      : completedJobs,
    failedJobs: projectId
      ? failedJobs.filter((j): boolean => j.projectId === projectId)
      : failedJobs,
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
