/**
 * Tests for GET /api/audio/suno/status - Suno Music Generation Status
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/audio/suno/status/route';
import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  resetAllMocks,
} from '@/__tests__/helpers/apiMocks';

// Mock withAuth wrapper
jest.mock('@/lib/api/withAuth', (): Record<string, unknown> => ({
  withAuth: jest.fn((handler) => async (req: NextRequest, context: any) => {
    const { createServerSupabaseClient } = require('@/lib/supabase');
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    return handler(req, { user, supabase, params: context?.params || {} });
  }),
}));

// Mock project verification
jest.mock('@/lib/api/project-verification', (): Record<string, unknown> => ({
  verifyProjectOwnership: jest.fn(),
}));

// Mock the Supabase module
jest.mock('@/lib/supabase', (): Record<string, unknown> => ({
  createServerSupabaseClient: jest.fn(),
}));

// Mock server logger
jest.mock('@/lib/serverLogger', (): Record<string, unknown> => ({
  serverLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock global fetch
global.fetch = jest.fn();

describe('GET /api/audio/suno/status', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  const validProjectId = '550e8400-e29b-41d4-a716-446655440000';
  const validTaskId = 'task-123-abc';

  beforeEach((): void => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);

    // Set up environment variable
    process.env['COMET_API_KEY'] = 'test-comet-api-key';

    // Mock project verification to pass by default
    const { verifyProjectOwnership } = require('@/lib/api/project-verification');
    verifyProjectOwnership.mockResolvedValue({ hasAccess: true });
  });

  afterEach((): void => {
    resetAllMocks(mockSupabase);
    delete process.env['COMET_API_KEY'];
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockUnauthenticatedUser(mockSupabase);

      const mockRequest = new NextRequest(
        `http://localhost/api/audio/suno/status?taskId=${validTaskId}&projectId=${validProjectId}`,
        { method: 'GET' }
      );

      const response = await GET(mockRequest);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Input Validation', () => {
    it('should return 400 when taskId is missing', async () => {
      mockAuthenticatedUser(mockSupabase);

      const mockRequest = new NextRequest(
        `http://localhost/api/audio/suno/status?projectId=${validProjectId}`,
        { method: 'GET' }
      );

      const response = await GET(mockRequest);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Task ID is required');
    });

    it('should return 400 when projectId is missing', async () => {
      mockAuthenticatedUser(mockSupabase);

      const mockRequest = new NextRequest(
        `http://localhost/api/audio/suno/status?taskId=${validTaskId}`,
        { method: 'GET' }
      );

      const response = await GET(mockRequest);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Project ID is required');
    });

    it('should return 400 when both parameters are missing', async () => {
      mockAuthenticatedUser(mockSupabase);

      const mockRequest = new NextRequest('http://localhost/api/audio/suno/status', {
        method: 'GET',
      });

      const response = await GET(mockRequest);

      expect(response.status).toBe(400);
    });
  });

  describe('Project Ownership', () => {
    it('should return 403 when user does not own project', async () => {
      mockAuthenticatedUser(mockSupabase);
      const { verifyProjectOwnership } = require('@/lib/api/project-verification');
      verifyProjectOwnership.mockResolvedValue({
        hasAccess: false,
        error: 'Unauthorized access to project',
        status: 403,
      });

      const mockRequest = new NextRequest(
        `http://localhost/api/audio/suno/status?taskId=${validTaskId}&projectId=${validProjectId}`,
        { method: 'GET' }
      );

      const response = await GET(mockRequest);

      expect(response.status).toBe(403);
    });
  });

  describe('Success Cases', () => {
    it('should return status for a pending task', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockResponse = {
        code: 200,
        msg: 'Success',
        data: [
          {
            taskId: validTaskId,
            status: 'pending',
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const mockRequest = new NextRequest(
        `http://localhost/api/audio/suno/status?taskId=${validTaskId}&projectId=${validProjectId}`,
        { method: 'GET' }
      );

      const response = await GET(mockRequest);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.tasks).toHaveLength(1);
      expect(data.tasks[0].status).toBe('pending');
      expect(data.tasks[0].taskId).toBe(validTaskId);
    });

    it('should return status for a completed task with audio URL', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockResponse = {
        code: 200,
        msg: 'Success',
        data: [
          {
            taskId: validTaskId,
            status: 'completed',
            audioUrl: 'https://cdn.suno.ai/audio123.mp3',
            videoUrl: 'https://cdn.suno.ai/video123.mp4',
            title: 'Epic Background Music',
            prompt: 'Epic orchestral music for a game',
            tags: 'orchestral, epic, cinematic',
            duration: 30,
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const mockRequest = new NextRequest(
        `http://localhost/api/audio/suno/status?taskId=${validTaskId}&projectId=${validProjectId}`,
        { method: 'GET' }
      );

      const response = await GET(mockRequest);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.tasks[0].status).toBe('completed');
      expect(data.tasks[0].audioUrl).toBeTruthy();
      expect(data.tasks[0].title).toBe('Epic Background Music');
      expect(data.tasks[0].duration).toBe(30);
    });

    it('should call Comet API with correct parameters', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockResponse = {
        code: 200,
        msg: 'Success',
        data: [{ taskId: validTaskId, status: 'processing' }],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const mockRequest = new NextRequest(
        `http://localhost/api/audio/suno/status?taskId=${validTaskId}&projectId=${validProjectId}`,
        { method: 'GET' }
      );

      await GET(mockRequest);

      expect(global.fetch).toHaveBeenCalledWith(
        `https://api.cometapi.com/suno/fetch?ids=${validTaskId}`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-comet-api-key',
          }),
        })
      );
    });

    it('should handle multiple tasks in response', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockResponse = {
        code: 200,
        msg: 'Success',
        data: [
          { taskId: 'task-1', status: 'completed', audioUrl: 'https://cdn.suno.ai/1.mp3' },
          { taskId: 'task-2', status: 'processing' },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const mockRequest = new NextRequest(
        `http://localhost/api/audio/suno/status?taskId=task-1,task-2&projectId=${validProjectId}`,
        { method: 'GET' }
      );

      const response = await GET(mockRequest);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.tasks).toHaveLength(2);
    });
  });

  describe('Error Handling', () => {
    it('should return 500 when API key is not configured', async () => {
      delete process.env['COMET_API_KEY'];
      mockAuthenticatedUser(mockSupabase);

      const mockRequest = new NextRequest(
        `http://localhost/api/audio/suno/status?taskId=${validTaskId}&projectId=${validProjectId}`,
        { method: 'GET' }
      );

      const response = await GET(mockRequest);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain('not configured');
    });

    it('should return error when Comet API fails', async () => {
      mockAuthenticatedUser(mockSupabase);

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue('Internal Server Error'),
      });

      const mockRequest = new NextRequest(
        `http://localhost/api/audio/suno/status?taskId=${validTaskId}&projectId=${validProjectId}`,
        { method: 'GET' }
      );

      const response = await GET(mockRequest);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain('Failed to check status');
    });

    it('should handle API response with error code', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockResponse = {
        code: 404,
        msg: 'Task not found',
        data: [],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const mockRequest = new NextRequest(
        `http://localhost/api/audio/suno/status?taskId=${validTaskId}&projectId=${validProjectId}`,
        { method: 'GET' }
      );

      const response = await GET(mockRequest);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Task not found');
    });

    it('should handle network errors', async () => {
      mockAuthenticatedUser(mockSupabase);

      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const mockRequest = new NextRequest(
        `http://localhost/api/audio/suno/status?taskId=${validTaskId}&projectId=${validProjectId}`,
        { method: 'GET' }
      );

      await expect(GET(mockRequest)).rejects.toThrow('Network error');
    });
  });

  describe('Task Status Values', () => {
    const testStatuses = ['pending', 'processing', 'completed', 'failed'];

    testStatuses.forEach((status) => {
      it(`should handle ${status} status`, async () => {
        mockAuthenticatedUser(mockSupabase);
        const mockResponse = {
          code: 200,
          msg: 'Success',
          data: [{ taskId: validTaskId, status }],
        };

        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: jest.fn().mockResolvedValue(mockResponse),
        });

        const mockRequest = new NextRequest(
          `http://localhost/api/audio/suno/status?taskId=${validTaskId}&projectId=${validProjectId}`,
          { method: 'GET' }
        );

        const response = await GET(mockRequest);

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.tasks[0].status).toBe(status);
      });
    });
  });
});
