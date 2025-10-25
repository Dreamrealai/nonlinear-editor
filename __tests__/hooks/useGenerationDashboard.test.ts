/**
 * Test Suite: useGenerationDashboard Hook
 *
 * Tests generation dashboard functionality including:
 * - Job management (add, remove, clear)
 * - Job filtering by type and status
 * - State management
 * - Hook lifecycle
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useGenerationDashboard, type GenerationJob } from '@/lib/hooks/useGenerationDashboard';

// Mock fetch for status checks
global.fetch = jest.fn();

describe('useGenerationDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ done: false, progress: 50 }),
    });
  });

  const createMockJob = (
    overrides?: Partial<Omit<GenerationJob, 'startedAt'>>
  ): Omit<GenerationJob, 'startedAt'> => ({
    id: `job-${Date.now()}`,
    type: 'video',
    status: 'processing',
    progress: 0,
    title: 'Test Job',
    operationName: 'test-operation',
    projectId: 'project-1',
    ...overrides,
  });

  describe('Initial State', () => {
    it('should initialize with empty jobs list', () => {
      const { result } = renderHook(() => useGenerationDashboard());

      expect(result.current.jobs).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should initialize filtered lists as empty', () => {
      const { result } = renderHook(() => useGenerationDashboard());

      expect(result.current.videoJobs).toEqual([]);
      expect(result.current.audioJobs).toEqual([]);
      expect(result.current.imageJobs).toEqual([]);
      expect(result.current.activeJobs).toEqual([]);
      expect(result.current.completedJobs).toEqual([]);
      expect(result.current.failedJobs).toEqual([]);
    });
  });

  describe('addJob', () => {
    it('should add a job', () => {
      const { result } = renderHook(() => useGenerationDashboard());
      const job = createMockJob({ id: 'job-1' });

      act(() => {
        result.current.addJob(job);
      });

      expect(result.current.jobs).toHaveLength(1);
      expect(result.current.jobs[0]?.id).toBe('job-1');
    });

    it('should add startedAt timestamp', () => {
      const { result } = renderHook(() => useGenerationDashboard());
      const job = createMockJob();

      act(() => {
        result.current.addJob(job);
      });

      expect(result.current.jobs[0]?.startedAt).toBeInstanceOf(Date);
    });

    it('should not add duplicate job', () => {
      const { result } = renderHook(() => useGenerationDashboard());
      const job = createMockJob({ id: 'job-1' });

      act(() => {
        result.current.addJob(job);
        result.current.addJob(job);
      });

      expect(result.current.jobs).toHaveLength(1);
    });

    it('should add multiple different jobs', () => {
      const { result } = renderHook(() => useGenerationDashboard());

      act(() => {
        result.current.addJob(createMockJob({ id: 'job-1' }));
        result.current.addJob(createMockJob({ id: 'job-2' }));
        result.current.addJob(createMockJob({ id: 'job-3' }));
      });

      expect(result.current.jobs).toHaveLength(3);
    });
  });

  describe('removeJob', () => {
    it('should remove a job', () => {
      const { result } = renderHook(() => useGenerationDashboard());
      const job = createMockJob({ id: 'job-1' });

      act(() => {
        result.current.addJob(job);
        result.current.removeJob('job-1');
      });

      expect(result.current.jobs).toHaveLength(0);
    });

    it('should handle removing nonexistent job', () => {
      const { result } = renderHook(() => useGenerationDashboard());

      act(() => {
        result.current.removeJob('nonexistent-job');
      });

      expect(result.current.jobs).toHaveLength(0);
    });

    it('should remove specific job from multiple jobs', () => {
      const { result } = renderHook(() => useGenerationDashboard());

      act(() => {
        result.current.addJob(createMockJob({ id: 'job-1' }));
        result.current.addJob(createMockJob({ id: 'job-2' }));
        result.current.addJob(createMockJob({ id: 'job-3' }));
        result.current.removeJob('job-2');
      });

      expect(result.current.jobs).toHaveLength(2);
      expect(result.current.jobs.find((j) => j.id === 'job-2')).toBeUndefined();
    });
  });

  describe('clearCompleted', () => {
    it('should clear completed jobs', () => {
      const { result } = renderHook(() => useGenerationDashboard());

      act(() => {
        result.current.addJob(createMockJob({ id: 'job-1', status: 'completed' }));
        result.current.addJob(createMockJob({ id: 'job-2', status: 'processing' }));
        result.current.clearCompleted();
      });

      expect(result.current.jobs).toHaveLength(1);
      expect(result.current.jobs[0]?.status).toBe('processing');
    });

    it('should handle clearing when no completed jobs', () => {
      const { result } = renderHook(() => useGenerationDashboard());

      act(() => {
        result.current.addJob(createMockJob({ status: 'processing' }));
        result.current.clearCompleted();
      });

      expect(result.current.jobs).toHaveLength(1);
    });
  });

  describe('clearFailed', () => {
    it('should clear failed jobs', () => {
      const { result } = renderHook(() => useGenerationDashboard());

      act(() => {
        result.current.addJob(createMockJob({ id: 'job-1', status: 'failed' }));
        result.current.addJob(createMockJob({ id: 'job-2', status: 'processing' }));
        result.current.clearFailed();
      });

      expect(result.current.jobs).toHaveLength(1);
      expect(result.current.jobs[0]?.status).toBe('processing');
    });
  });

  describe('clearAll', () => {
    it('should clear all jobs', () => {
      const { result } = renderHook(() => useGenerationDashboard());

      act(() => {
        result.current.addJob(createMockJob({ id: 'job-1' }));
        result.current.addJob(createMockJob({ id: 'job-2' }));
        result.current.clearAll();
      });

      expect(result.current.jobs).toHaveLength(0);
    });
  });

  describe('Job Filtering by Type', () => {
    it('should filter video jobs', () => {
      const { result } = renderHook(() => useGenerationDashboard());

      act(() => {
        result.current.addJob(createMockJob({ type: 'video' }));
        result.current.addJob(createMockJob({ type: 'audio' }));
        result.current.addJob(createMockJob({ type: 'image' }));
      });

      expect(result.current.videoJobs).toHaveLength(1);
      expect(result.current.audioJobs).toHaveLength(1);
      expect(result.current.imageJobs).toHaveLength(1);
    });
  });

  describe('Job Filtering by Status', () => {
    it('should filter active jobs', () => {
      const { result } = renderHook(() => useGenerationDashboard());

      act(() => {
        result.current.addJob(createMockJob({ status: 'processing' }));
        result.current.addJob(createMockJob({ status: 'queued' }));
        result.current.addJob(createMockJob({ status: 'completed' }));
      });

      expect(result.current.activeJobs).toHaveLength(2);
    });

    it('should filter completed jobs', () => {
      const { result } = renderHook(() => useGenerationDashboard());

      act(() => {
        result.current.addJob(createMockJob({ status: 'completed' }));
        result.current.addJob(createMockJob({ status: 'processing' }));
      });

      expect(result.current.completedJobs).toHaveLength(1);
    });

    it('should filter failed jobs', () => {
      const { result } = renderHook(() => useGenerationDashboard());

      act(() => {
        result.current.addJob(createMockJob({ status: 'failed' }));
        result.current.addJob(createMockJob({ status: 'processing' }));
      });

      expect(result.current.failedJobs).toHaveLength(1);
    });
  });

  describe('Project Filtering', () => {
    it('should filter by project ID', () => {
      const { result } = renderHook(() => useGenerationDashboard({ projectId: 'project-1' }));

      act(() => {
        result.current.addJob(createMockJob({ projectId: 'project-1' }));
        result.current.addJob(createMockJob({ projectId: 'project-2' }));
      });

      expect(result.current.jobs).toHaveLength(1);
      expect(result.current.jobs[0]?.projectId).toBe('project-1');
    });
  });

  describe('Refresh', () => {
    it('should have refresh function', () => {
      const { result } = renderHook(() => useGenerationDashboard());

      expect(typeof result.current.refresh).toBe('function');
    });

    it('should handle refresh with no jobs', async () => {
      const { result } = renderHook(() => useGenerationDashboard({ enabled: false }));

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.jobs).toHaveLength(0);
    });
  });

  describe('Polling', () => {
    it('should respect enabled flag', () => {
      renderHook(() => useGenerationDashboard({ enabled: false }));

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Lifecycle', () => {
    it('should cleanup on unmount', () => {
      const { unmount } = renderHook(() => useGenerationDashboard());

      expect(() => unmount()).not.toThrow();
    });
  });
});
