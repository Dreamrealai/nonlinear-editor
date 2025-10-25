/**
 * Tests for Export Queue Lifecycle and State Transitions
 *
 * Test coverage:
 * - Complete job lifecycle: pending → processing → completed
 * - Failed job lifecycle: pending → processing → failed
 * - Pause/resume workflow
 * - Priority changes during different states
 * - Concurrent operations on same job
 * - State transition validation
 * - Idempotency of operations
 */

import { NextRequest } from 'next/server';
import { DELETE as cancelJob } from '@/app/api/export/queue/[jobId]/route';
import { POST as pauseJob } from '@/app/api/export/queue/[jobId]/pause/route';
import { POST as resumeJob } from '@/app/api/export/queue/[jobId]/resume/route';
import { PATCH as updatePriority } from '@/app/api/export/queue/[jobId]/priority/route';
import { createMockSupabaseClient, mockAuthenticatedUser, resetAllMocks } from '@/test-utils';

// Mock withAuth wrapper
jest.mock(
  '@/lib/api/withAuth',
  () => ({
    withAuth: jest.fn((handler) => async (req: NextRequest, context: any) => {
      const { createServerSupabaseClient } = require('@/lib/supabase');
      const supabase = await createServerSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
      return handler(req, { user, supabase, params: context?.params || {} });
    }),
  })
);

jest.mock(
  '@/lib/supabase',
  () => ({
    createServerSupabaseClient: jest.fn(),
  })
);

jest.mock(
  '@/lib/serverLogger',
  () => ({
    serverLogger: {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
  })
);

jest.mock(
  '@/lib/rateLimit',
  () => ({
    RATE_LIMITS: { tier2_resource_creation: { requests: 10, window: 60 } },
  })
);

describe('Export Queue Lifecycle Tests', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  const validJobId = '123e4567-e89b-12d3-a456-426614174000';
  const projectId = 'test-project-id';

  beforeEach((): void => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);
  });

  afterEach((): void => {
    resetAllMocks();
  });

  describe('Complete Job Lifecycle: Pending → Processing → Completed', () => {
    it('should transition from pending to processing via resume', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      // Initial state: pending
      mockSupabase.single.mockResolvedValue({
        data: {
          id: validJobId,
          user_id: mockUser.id,
          status: 'pending',
          job_type: 'video-export',
          project_id: projectId,
          priority: 10,
        },
        error: null,
      });
      mockSupabase.eq.mockResolvedValue({ error: null });

      const response = await resumeJob(
        new NextRequest(`http://localhost/api/export/queue/${validJobId}/resume`, {
          method: 'POST',
        }),
        { params: Promise.resolve({ jobId: validJobId }) }
      );

      expect(response.status).toBe(200);
      expect(mockSupabase.update).toHaveBeenCalledWith({ status: 'processing' });
    });

    it('should not allow pause on pending job', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      mockSupabase.single.mockResolvedValue({
        data: {
          id: validJobId,
          user_id: mockUser.id,
          status: 'pending',
          job_type: 'video-export',
          project_id: projectId,
        },
        error: null,
      });

      const response = await pauseJob(
        new NextRequest(`http://localhost/api/export/queue/${validJobId}/pause`, {
          method: 'POST',
        }),
        { params: Promise.resolve({ jobId: validJobId }) }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Cannot pause');
      expect(data.error).toContain('pending');
    });

    it('should not allow operations on completed job', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      mockSupabase.single.mockResolvedValue({
        data: {
          id: validJobId,
          user_id: mockUser.id,
          status: 'completed',
          job_type: 'video-export',
          project_id: projectId,
        },
        error: null,
      });

      // Try to cancel completed job
      const cancelResponse = await cancelJob(
        new NextRequest(`http://localhost/api/export/queue/${validJobId}`, { method: 'DELETE' }),
        { params: Promise.resolve({ jobId: validJobId }) }
      );

      expect(cancelResponse.status).toBe(400);
      const cancelData = await cancelResponse.json();
      expect(cancelData.error).toContain('Cannot cancel job');
      expect(cancelData.error).toContain('completed');
    });
  });

  describe('Pause and Resume Workflow', () => {
    it('should pause processing job and then resume it', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      // Step 1: Pause processing job
      mockSupabase.single.mockResolvedValue({
        data: {
          id: validJobId,
          user_id: mockUser.id,
          status: 'processing',
          job_type: 'video-export',
          project_id: projectId,
          progress_percentage: 35,
        },
        error: null,
      });
      mockSupabase.eq.mockResolvedValue({ error: null });

      const pauseResponse = await pauseJob(
        new NextRequest(`http://localhost/api/export/queue/${validJobId}/pause`, {
          method: 'POST',
        }),
        { params: Promise.resolve({ jobId: validJobId }) }
      );

      expect(pauseResponse.status).toBe(200);
      expect(mockSupabase.update).toHaveBeenCalledWith({ status: 'pending' });

      // Step 2: Resume paused job (now pending)
      jest.clearAllMocks();
      mockSupabase.single.mockResolvedValue({
        data: {
          id: validJobId,
          user_id: mockUser.id,
          status: 'pending',
          job_type: 'video-export',
          project_id: projectId,
          progress_percentage: 35,
        },
        error: null,
      });
      mockSupabase.eq.mockResolvedValue({ error: null });

      const resumeResponse = await resumeJob(
        new NextRequest(`http://localhost/api/export/queue/${validJobId}/resume`, {
          method: 'POST',
        }),
        { params: Promise.resolve({ jobId: validJobId }) }
      );

      expect(resumeResponse.status).toBe(200);
      expect(mockSupabase.update).toHaveBeenCalledWith({ status: 'processing' });
    });

    it('should not allow resume on processing job', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      mockSupabase.single.mockResolvedValue({
        data: {
          id: validJobId,
          user_id: mockUser.id,
          status: 'processing',
          job_type: 'video-export',
          project_id: projectId,
        },
        error: null,
      });

      const response = await resumeJob(
        new NextRequest(`http://localhost/api/export/queue/${validJobId}/resume`, {
          method: 'POST',
        }),
        { params: Promise.resolve({ jobId: validJobId }) }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Cannot resume job');
      expect(data.error).toContain('processing');
    });

    it('should not allow pause on completed job', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      mockSupabase.single.mockResolvedValue({
        data: {
          id: validJobId,
          user_id: mockUser.id,
          status: 'completed',
          job_type: 'video-export',
          project_id: projectId,
        },
        error: null,
      });

      const response = await pauseJob(
        new NextRequest(`http://localhost/api/export/queue/${validJobId}/pause`, {
          method: 'POST',
        }),
        { params: Promise.resolve({ jobId: validJobId }) }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Cannot pause job');
    });
  });

  describe('Priority Management During Lifecycle', () => {
    it('should allow priority update on pending job', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      mockSupabase.single.mockResolvedValue({
        data: {
          id: validJobId,
          user_id: mockUser.id,
          status: 'pending',
          job_type: 'video-export',
          project_id: projectId,
          priority: 10,
        },
        error: null,
      });
      mockSupabase.eq.mockResolvedValue({ error: null });

      const response = await updatePriority(
        new NextRequest(`http://localhost/api/export/queue/${validJobId}/priority`, {
          method: 'PATCH',
          body: JSON.stringify({ priority: 90 }),
        }),
        { params: Promise.resolve({ jobId: validJobId }) }
      );

      expect(response.status).toBe(200);
      expect(mockSupabase.update).toHaveBeenCalledWith({ priority: 90 });
    });

    it('should not allow priority update on processing job', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      mockSupabase.single.mockResolvedValue({
        data: {
          id: validJobId,
          user_id: mockUser.id,
          status: 'processing',
          job_type: 'video-export',
          project_id: projectId,
          priority: 10,
        },
        error: null,
      });

      const response = await updatePriority(
        new NextRequest(`http://localhost/api/export/queue/${validJobId}/priority`, {
          method: 'PATCH',
          body: JSON.stringify({ priority: 90 }),
        }),
        { params: Promise.resolve({ jobId: validJobId }) }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Cannot update priority');
      expect(data.error).toContain('processing');
    });

    it('should not allow priority update on completed job', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      mockSupabase.single.mockResolvedValue({
        data: {
          id: validJobId,
          user_id: mockUser.id,
          status: 'completed',
          job_type: 'video-export',
          project_id: projectId,
          priority: 10,
        },
        error: null,
      });

      const response = await updatePriority(
        new NextRequest(`http://localhost/api/export/queue/${validJobId}/priority`, {
          method: 'PATCH',
          body: JSON.stringify({ priority: 90 }),
        }),
        { params: Promise.resolve({ jobId: validJobId }) }
      );

      expect(response.status).toBe(400);
    });
  });

  describe('Failed Job Lifecycle', () => {
    it('should not allow resume on failed job', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      mockSupabase.single.mockResolvedValue({
        data: {
          id: validJobId,
          user_id: mockUser.id,
          status: 'failed',
          job_type: 'video-export',
          project_id: projectId,
          error_message: 'Processing failed',
        },
        error: null,
      });

      const response = await resumeJob(
        new NextRequest(`http://localhost/api/export/queue/${validJobId}/resume`, {
          method: 'POST',
        }),
        { params: Promise.resolve({ jobId: validJobId }) }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Cannot resume job');
      expect(data.error).toContain('failed');
    });

    it('should not allow cancel on failed job', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      mockSupabase.single.mockResolvedValue({
        data: {
          id: validJobId,
          user_id: mockUser.id,
          status: 'failed',
          job_type: 'video-export',
          project_id: projectId,
          error_message: 'Processing failed',
        },
        error: null,
      });

      const response = await cancelJob(
        new NextRequest(`http://localhost/api/export/queue/${validJobId}`, { method: 'DELETE' }),
        { params: Promise.resolve({ jobId: validJobId }) }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Cannot cancel job');
      expect(data.error).toContain('failed');
    });
  });

  describe('Cancelled Job State', () => {
    it('should not allow operations on cancelled job', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      mockSupabase.single.mockResolvedValue({
        data: {
          id: validJobId,
          user_id: mockUser.id,
          status: 'cancelled',
          job_type: 'video-export',
          project_id: projectId,
          error_message: 'Cancelled by user',
        },
        error: null,
      });

      // Try to resume
      const resumeResponse = await resumeJob(
        new NextRequest(`http://localhost/api/export/queue/${validJobId}/resume`, {
          method: 'POST',
        }),
        { params: Promise.resolve({ jobId: validJobId }) }
      );
      expect(resumeResponse.status).toBe(400);

      // Try to pause
      const pauseResponse = await pauseJob(
        new NextRequest(`http://localhost/api/export/queue/${validJobId}/pause`, {
          method: 'POST',
        }),
        { params: Promise.resolve({ jobId: validJobId }) }
      );
      expect(pauseResponse.status).toBe(400);

      // Try to cancel again
      const cancelResponse = await cancelJob(
        new NextRequest(`http://localhost/api/export/queue/${validJobId}`, { method: 'DELETE' }),
        { params: Promise.resolve({ jobId: validJobId }) }
      );
      expect(cancelResponse.status).toBe(400);
    });
  });

  describe('State Transition Validation', () => {
    it('should validate all possible state transitions', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const states = ['pending', 'processing', 'completed', 'failed', 'cancelled'];

      for (const status of states) {
        jest.clearAllMocks();
        mockSupabase.single.mockResolvedValue({
          data: {
            id: validJobId,
            user_id: mockUser.id,
            status,
            job_type: 'video-export',
            project_id: projectId,
          },
          error: null,
        });

        // Test pause operation
        const pauseResponse = await pauseJob(
          new NextRequest(`http://localhost/api/export/queue/${validJobId}/pause`, {
            method: 'POST',
          }),
          { params: Promise.resolve({ jobId: validJobId }) }
        );

        if (status === 'processing') {
          expect(pauseResponse.status).toBe(200);
        } else {
          expect(pauseResponse.status).toBe(400);
        }

        // Test resume operation
        jest.clearAllMocks();
        mockSupabase.single.mockResolvedValue({
          data: {
            id: validJobId,
            user_id: mockUser.id,
            status,
            job_type: 'video-export',
            project_id: projectId,
          },
          error: null,
        });

        const resumeResponse = await resumeJob(
          new NextRequest(`http://localhost/api/export/queue/${validJobId}/resume`, {
            method: 'POST',
          }),
          { params: Promise.resolve({ jobId: validJobId }) }
        );

        if (status === 'pending') {
          expect(resumeResponse.status).toBe(200);
        } else {
          expect(resumeResponse.status).toBe(400);
        }

        // Test cancel operation
        jest.clearAllMocks();
        mockSupabase.single.mockResolvedValue({
          data: {
            id: validJobId,
            user_id: mockUser.id,
            status,
            job_type: 'video-export',
            project_id: projectId,
          },
          error: null,
        });
        mockSupabase.eq.mockResolvedValue({ error: null });

        const cancelResponse = await cancelJob(
          new NextRequest(`http://localhost/api/export/queue/${validJobId}`, { method: 'DELETE' }),
          { params: Promise.resolve({ jobId: validJobId }) }
        );

        if (status === 'pending' || status === 'processing') {
          expect(cancelResponse.status).toBe(200);
        } else {
          expect(cancelResponse.status).toBe(400);
        }
      }
    });
  });

  describe('Concurrent Operation Handling', () => {
    it('should handle race condition when cancelling while pausing', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      mockSupabase.single.mockResolvedValue({
        data: {
          id: validJobId,
          user_id: mockUser.id,
          status: 'processing',
          job_type: 'video-export',
          project_id: projectId,
        },
        error: null,
      });
      mockSupabase.eq.mockResolvedValue({ error: null });

      // Both operations should succeed when job is processing
      const pausePromise = pauseJob(
        new NextRequest(`http://localhost/api/export/queue/${validJobId}/pause`, {
          method: 'POST',
        }),
        { params: Promise.resolve({ jobId: validJobId }) }
      );

      const cancelPromise = cancelJob(
        new NextRequest(`http://localhost/api/export/queue/${validJobId}`, { method: 'DELETE' }),
        { params: Promise.resolve({ jobId: validJobId }) }
      );

      const [pauseResponse, cancelResponse] = await Promise.all([pausePromise, cancelPromise]);

      // Both should succeed (in real scenario, one would win due to DB transaction)
      expect([pauseResponse.status, cancelResponse.status]).toEqual(expect.arrayContaining([200]));
    });

    it('should handle multiple priority updates on same job', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      mockSupabase.single.mockResolvedValue({
        data: {
          id: validJobId,
          user_id: mockUser.id,
          status: 'pending',
          job_type: 'video-export',
          project_id: projectId,
          priority: 10,
        },
        error: null,
      });
      mockSupabase.eq.mockResolvedValue({ error: null });

      // Simulate multiple priority updates
      const updates = [
        updatePriority(
          new NextRequest(`http://localhost/api/export/queue/${validJobId}/priority`, {
            method: 'PATCH',
            body: JSON.stringify({ priority: 50 }),
          }),
          { params: Promise.resolve({ jobId: validJobId }) }
        ),
        updatePriority(
          new NextRequest(`http://localhost/api/export/queue/${validJobId}/priority`, {
            method: 'PATCH',
            body: JSON.stringify({ priority: 75 }),
          }),
          { params: Promise.resolve({ jobId: validJobId }) }
        ),
        updatePriority(
          new NextRequest(`http://localhost/api/export/queue/${validJobId}/priority`, {
            method: 'PATCH',
            body: JSON.stringify({ priority: 100 }),
          }),
          { params: Promise.resolve({ jobId: validJobId }) }
        ),
      ];

      const responses = await Promise.all(updates);

      // All should succeed (last one wins in DB)
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Idempotency', () => {
    it('should handle multiple cancel requests idempotently', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      // First cancel - job is processing
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: validJobId,
          user_id: mockUser.id,
          status: 'processing',
          job_type: 'video-export',
          project_id: projectId,
        },
        error: null,
      });
      mockSupabase.eq.mockResolvedValue({ error: null });

      const firstCancel = await cancelJob(
        new NextRequest(`http://localhost/api/export/queue/${validJobId}`, { method: 'DELETE' }),
        { params: Promise.resolve({ jobId: validJobId }) }
      );

      expect(firstCancel.status).toBe(200);

      // Second cancel - job is now cancelled
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: validJobId,
          user_id: mockUser.id,
          status: 'cancelled',
          job_type: 'video-export',
          project_id: projectId,
        },
        error: null,
      });

      const secondCancel = await cancelJob(
        new NextRequest(`http://localhost/api/export/queue/${validJobId}`, { method: 'DELETE' }),
        { params: Promise.resolve({ jobId: validJobId }) }
      );

      expect(secondCancel.status).toBe(400);
      const data = await secondCancel.json();
      expect(data.error).toContain('Cannot cancel job');
    });

    it('should handle multiple pause requests consistently', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      // First pause - job is processing
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: validJobId,
          user_id: mockUser.id,
          status: 'processing',
          job_type: 'video-export',
          project_id: projectId,
        },
        error: null,
      });
      mockSupabase.eq.mockResolvedValue({ error: null });

      const firstPause = await pauseJob(
        new NextRequest(`http://localhost/api/export/queue/${validJobId}/pause`, {
          method: 'POST',
        }),
        { params: Promise.resolve({ jobId: validJobId }) }
      );

      expect(firstPause.status).toBe(200);

      // Second pause - job is now pending (paused)
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: validJobId,
          user_id: mockUser.id,
          status: 'pending',
          job_type: 'video-export',
          project_id: projectId,
        },
        error: null,
      });

      const secondPause = await pauseJob(
        new NextRequest(`http://localhost/api/export/queue/${validJobId}/pause`, {
          method: 'POST',
        }),
        { params: Promise.resolve({ jobId: validJobId }) }
      );

      expect(secondPause.status).toBe(400);
      const data = await secondPause.json();
      expect(data.error).toContain('Cannot pause job');
    });
  });
});
