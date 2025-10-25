/**
 * Tests for DELETE /api/export/queue/[jobId] - Cancel/Delete Job
 *
 * Test coverage:
 * - Authentication and authorization
 * - Input validation (jobId UUID)
 * - Job ownership verification
 * - Status transition rules (can only cancel pending/processing)
 * - Database error handling
 * - Success response format
 */

import { NextRequest } from 'next/server';
import { DELETE } from '@/app/api/export/queue/[jobId]/route';
import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  resetAllMocks,
} from '@/test-utils';

// Mock withAuth wrapper
jest.mock(
  '@/lib/api/withAuth',
  (): Record<string, unknown> => ({
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
  (): Record<string, unknown> => ({
    createServerSupabaseClient: jest.fn(),
  })
);

jest.mock(
  '@/lib/serverLogger',
  (): Record<string, unknown> => ({
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
  (): Record<string, unknown> => ({
    RATE_LIMITS: { tier2_resource_creation: { requests: 10, window: 60 } },
  })
);

describe('DELETE /api/export/queue/[jobId]', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  const validJobId = '123e4567-e89b-12d3-a456-426614174000';
  const testUserId = 'test-user-id';
  const otherUserId = 'other-user-id';

  beforeEach((): void => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);
  });

  afterEach((): void => {
    resetAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockUnauthenticatedUser(mockSupabase);

      const response = await DELETE(
        new NextRequest(`http://localhost/api/export/queue/${validJobId}`, { method: 'DELETE' }),
        { params: Promise.resolve({ jobId: validJobId }) }
      );

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Input Validation', () => {
    it('should return 400 for invalid jobId UUID format', async () => {
      mockAuthenticatedUser(mockSupabase);
      const invalidJobId = 'not-a-uuid';

      const response = await DELETE(
        new NextRequest(`http://localhost/api/export/queue/${invalidJobId}`, { method: 'DELETE' }),
        { params: Promise.resolve({ jobId: invalidJobId }) }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('jobId');
      expect(data.field).toBe('jobId');
    });

    it('should return 400 for empty jobId', async () => {
      mockAuthenticatedUser(mockSupabase);
      const emptyJobId = '';

      const response = await DELETE(
        new NextRequest(`http://localhost/api/export/queue/${emptyJobId}`, { method: 'DELETE' }),
        { params: Promise.resolve({ jobId: emptyJobId }) }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('jobId');
    });

    it('should return 400 for malformed UUID', async () => {
      mockAuthenticatedUser(mockSupabase);
      const malformedJobId = '123e4567-e89b-12d3-a456';

      const response = await DELETE(
        new NextRequest(`http://localhost/api/export/queue/${malformedJobId}`, {
          method: 'DELETE',
        }),
        { params: Promise.resolve({ jobId: malformedJobId }) }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('jobId');
    });
  });

  describe('Job Authorization', () => {
    it('should return 404 when job does not exist', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Not found', code: 'PGRST116' },
      });

      const response = await DELETE(
        new NextRequest(`http://localhost/api/export/queue/${validJobId}`, { method: 'DELETE' }),
        { params: Promise.resolve({ jobId: validJobId }) }
      );

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toContain('Export job');
    });

    it('should return 404 when job belongs to different user', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: null,
      });

      const response = await DELETE(
        new NextRequest(`http://localhost/api/export/queue/${validJobId}`, { method: 'DELETE' }),
        { params: Promise.resolve({ jobId: validJobId }) }
      );

      expect(response.status).toBe(404);
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', mockUser.id);
    });

    it('should verify job_type is video-export', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: null,
      });

      await DELETE(
        new NextRequest(`http://localhost/api/export/queue/${validJobId}`, { method: 'DELETE' }),
        { params: Promise.resolve({ jobId: validJobId }) }
      );

      expect(mockSupabase.eq).toHaveBeenCalledWith('job_type', 'video-export');
    });
  });

  describe('Status Transition Rules', () => {
    it('should return 400 when trying to cancel completed job', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: {
          id: validJobId,
          user_id: mockUser.id,
          status: 'completed',
          job_type: 'video-export',
          project_id: 'test-project-id',
        },
        error: null,
      });

      const response = await DELETE(
        new NextRequest(`http://localhost/api/export/queue/${validJobId}`, { method: 'DELETE' }),
        { params: Promise.resolve({ jobId: validJobId }) }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Cannot cancel job');
      expect(data.error).toContain('completed');
      expect(mockSupabase.update).not.toHaveBeenCalled();
    });

    it('should return 400 when trying to cancel failed job', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: {
          id: validJobId,
          user_id: mockUser.id,
          status: 'failed',
          job_type: 'video-export',
          project_id: 'test-project-id',
        },
        error: null,
      });

      const response = await DELETE(
        new NextRequest(`http://localhost/api/export/queue/${validJobId}`, { method: 'DELETE' }),
        { params: Promise.resolve({ jobId: validJobId }) }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Cannot cancel job');
      expect(data.error).toContain('failed');
    });

    it('should return 400 when trying to cancel already cancelled job', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: {
          id: validJobId,
          user_id: mockUser.id,
          status: 'cancelled',
          job_type: 'video-export',
          project_id: 'test-project-id',
        },
        error: null,
      });

      const response = await DELETE(
        new NextRequest(`http://localhost/api/export/queue/${validJobId}`, { method: 'DELETE' }),
        { params: Promise.resolve({ jobId: validJobId }) }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Cannot cancel job');
      expect(data.error).toContain('cancelled');
    });

    it('should successfully cancel pending job', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: {
          id: validJobId,
          user_id: mockUser.id,
          status: 'pending',
          job_type: 'video-export',
          project_id: 'test-project-id',
        },
        error: null,
      });
      mockSupabase.eq.mockResolvedValue({ error: null });

      const response = await DELETE(
        new NextRequest(`http://localhost/api/export/queue/${validJobId}`, { method: 'DELETE' }),
        { params: Promise.resolve({ jobId: validJobId }) }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toContain('cancelled successfully');
      expect(data.jobId).toBe(validJobId);
      expect(mockSupabase.update).toHaveBeenCalledWith({
        status: 'cancelled',
        error_message: 'Cancelled by user',
      });
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', validJobId);
    });

    it('should successfully cancel processing job', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: {
          id: validJobId,
          user_id: mockUser.id,
          status: 'processing',
          job_type: 'video-export',
          project_id: 'test-project-id',
          progress_percentage: 45,
        },
        error: null,
      });
      mockSupabase.eq.mockResolvedValue({ error: null });

      const response = await DELETE(
        new NextRequest(`http://localhost/api/export/queue/${validJobId}`, { method: 'DELETE' }),
        { params: Promise.resolve({ jobId: validJobId }) }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toContain('cancelled successfully');
      expect(data.jobId).toBe(validJobId);
      expect(mockSupabase.update).toHaveBeenCalledWith({
        status: 'cancelled',
        error_message: 'Cancelled by user',
      });
    });
  });

  describe('Database Error Handling', () => {
    it('should return 500 when update operation fails', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: {
          id: validJobId,
          user_id: mockUser.id,
          status: 'processing',
          job_type: 'video-export',
          project_id: 'test-project-id',
        },
        error: null,
      });
      mockSupabase.eq.mockResolvedValue({
        error: { message: 'Update failed', code: 'UPDATE_ERROR' },
      });

      const response = await DELETE(
        new NextRequest(`http://localhost/api/export/queue/${validJobId}`, { method: 'DELETE' }),
        { params: Promise.resolve({ jobId: validJobId }) }
      );

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to cancel job');
    });

    it('should return 500 on unexpected database error during fetch', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Connection lost', code: 'CONNECTION_ERROR' },
      });

      const response = await DELETE(
        new NextRequest(`http://localhost/api/export/queue/${validJobId}`, { method: 'DELETE' }),
        { params: Promise.resolve({ jobId: validJobId }) }
      );

      expect(response.status).toBe(404);
    });

    it('should handle unexpected exceptions gracefully', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockRejectedValue(new Error('Unexpected error'));

      const response = await DELETE(
        new NextRequest(`http://localhost/api/export/queue/${validJobId}`, { method: 'DELETE' }),
        { params: Promise.resolve({ jobId: validJobId }) }
      );

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('An unexpected error occurred');
    });
  });

  describe('Response Format', () => {
    it('should return correct success response structure', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: {
          id: validJobId,
          user_id: mockUser.id,
          status: 'pending',
          job_type: 'video-export',
          project_id: 'test-project-id',
        },
        error: null,
      });
      mockSupabase.eq.mockResolvedValue({ error: null });

      const response = await DELETE(
        new NextRequest(`http://localhost/api/export/queue/${validJobId}`, { method: 'DELETE' }),
        { params: Promise.resolve({ jobId: validJobId }) }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('message');
      expect(data).toHaveProperty('jobId');
      expect(typeof data.message).toBe('string');
      expect(data.jobId).toBe(validJobId);
    });

    it('should include proper error structure on validation failure', async () => {
      mockAuthenticatedUser(mockSupabase);
      const invalidJobId = 'invalid';

      const response = await DELETE(
        new NextRequest(`http://localhost/api/export/queue/${invalidJobId}`, { method: 'DELETE' }),
        { params: Promise.resolve({ jobId: invalidJobId }) }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('field');
      expect(data.field).toBe('jobId');
    });
  });

  describe('Logging Behavior', () => {
    it('should log successful cancellation', async () => {
      const { serverLogger } = require('@/lib/serverLogger');
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const projectId = 'test-project-id';

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

      await DELETE(
        new NextRequest(`http://localhost/api/export/queue/${validJobId}`, { method: 'DELETE' }),
        { params: Promise.resolve({ jobId: validJobId }) }
      );

      expect(serverLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: validJobId,
          userId: mockUser.id,
          projectId: projectId,
        }),
        expect.stringContaining('cancelled')
      );
    });

    it('should log error on update failure', async () => {
      const { serverLogger } = require('@/lib/serverLogger');
      const mockUser = mockAuthenticatedUser(mockSupabase);

      mockSupabase.single.mockResolvedValue({
        data: {
          id: validJobId,
          user_id: mockUser.id,
          status: 'processing',
          job_type: 'video-export',
          project_id: 'test-project-id',
        },
        error: null,
      });
      mockSupabase.eq.mockResolvedValue({
        error: { message: 'Update failed' },
      });

      await DELETE(
        new NextRequest(`http://localhost/api/export/queue/${validJobId}`, { method: 'DELETE' }),
        { params: Promise.resolve({ jobId: validJobId }) }
      );

      expect(serverLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: validJobId,
          userId: mockUser.id,
        }),
        expect.stringContaining('Failed to cancel job')
      );
    });
  });
});
