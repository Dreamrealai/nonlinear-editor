/**
 * Tests for GET /api/export/queue - Get Export Queue
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/export/queue/route';
import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  resetAllMocks,
} from '@/__tests__/helpers/apiMocks';

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

jest.mock('@/lib/supabase', (): Record<string, unknown> => ({
  createServerSupabaseClient: jest.fn(),
}));

jest.mock('@/lib/serverLogger', (): Record<string, unknown> => ({
  serverLogger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/rateLimit', (): Record<string, unknown> => ({
  RATE_LIMITS: { tier3_status_read: { requests: 60, window: 60 } },
}));

describe('GET /api/export/queue', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach((): void => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);

    // Default mock response
    mockSupabase.select.mockResolvedValue({
      data: [
        {
          id: 'job-1',
          user_id: 'test-user-id',
          project_id: 'project-1',
          job_type: 'video-export',
          status: 'processing',
          progress_percentage: 50,
          priority: 10,
          config: {},
          metadata: {},
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'job-2',
          user_id: 'test-user-id',
          project_id: 'project-1',
          job_type: 'video-export',
          status: 'pending',
          progress_percentage: 0,
          priority: 5,
          config: {},
          metadata: {},
          created_at: '2024-01-01T00:01:00Z',
        },
      ],
      error: null,
    });
  });

  afterEach((): void => {
    resetAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockUnauthenticatedUser(mockSupabase);

      const response = await GET(
        new NextRequest('http://localhost/api/export/queue', { method: 'GET' }),
        { params: Promise.resolve({}) }
      );

      expect(response.status).toBe(401);
    });
  });

  describe('Success Cases', () => {
    it('should return active jobs by default', async () => {
      mockAuthenticatedUser(mockSupabase);

      const response = await GET(
        new NextRequest('http://localhost/api/export/queue', { method: 'GET' }),
        { params: Promise.resolve({}) }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.jobs).toHaveLength(2);
      expect(data.total).toBe(2);
      expect(data.active).toBe(2);
      expect(data.completed).toBe(0);
      expect(mockSupabase.in).toHaveBeenCalledWith('status', ['pending', 'processing']);
    });

    it('should include completed jobs when requested', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.select.mockResolvedValue({
        data: [
          { id: 'job-1', status: 'processing', progress_percentage: 50, priority: 10, config: {}, metadata: {}, created_at: '2024-01-01' },
          { id: 'job-2', status: 'completed', progress_percentage: 100, priority: 5, config: {}, metadata: {}, created_at: '2024-01-01' },
        ],
        error: null,
      });

      const response = await GET(
        new NextRequest('http://localhost/api/export/queue?includeCompleted=true', { method: 'GET' }),
        { params: Promise.resolve({}) }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.jobs).toHaveLength(2);
      expect(data.active).toBe(1);
      expect(data.completed).toBe(1);
      expect(mockSupabase.in).not.toHaveBeenCalled();
    });

    it('should filter by user_id', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      const response = await GET(
        new NextRequest('http://localhost/api/export/queue', { method: 'GET' }),
        { params: Promise.resolve({}) }
      );

      expect(response.status).toBe(200);
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', mockUser.id);
    });

    it('should filter by job_type video-export', async () => {
      mockAuthenticatedUser(mockSupabase);

      const response = await GET(
        new NextRequest('http://localhost/api/export/queue', { method: 'GET' }),
        { params: Promise.resolve({}) }
      );

      expect(response.status).toBe(200);
      expect(mockSupabase.eq).toHaveBeenCalledWith('job_type', 'video-export');
    });

    it('should order by priority descending', async () => {
      mockAuthenticatedUser(mockSupabase);

      const response = await GET(
        new NextRequest('http://localhost/api/export/queue', { method: 'GET' }),
        { params: Promise.resolve({}) }
      );

      expect(response.status).toBe(200);
      expect(mockSupabase.order).toHaveBeenCalledWith('priority', { ascending: false });
    });

    it('should order by created_at ascending', async () => {
      mockAuthenticatedUser(mockSupabase);

      const response = await GET(
        new NextRequest('http://localhost/api/export/queue', { method: 'GET' }),
        { params: Promise.resolve({}) }
      );

      expect(response.status).toBe(200);
      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: true });
    });

    it('should return empty queue when no jobs exist', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.select.mockResolvedValue({ data: [], error: null });

      const response = await GET(
        new NextRequest('http://localhost/api/export/queue', { method: 'GET' }),
        { params: Promise.resolve({}) }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.jobs).toEqual([]);
      expect(data.total).toBe(0);
      expect(data.active).toBe(0);
    });

    it('should map database fields to API response format', async () => {
      mockAuthenticatedUser(mockSupabase);

      const response = await GET(
        new NextRequest('http://localhost/api/export/queue', { method: 'GET' }),
        { params: Promise.resolve({}) }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      const job = data.jobs[0];
      expect(job).toHaveProperty('id');
      expect(job).toHaveProperty('projectId');
      expect(job).toHaveProperty('status');
      expect(job).toHaveProperty('progress');
      expect(job).toHaveProperty('priority');
      expect(job).toHaveProperty('config');
      expect(job).toHaveProperty('metadata');
      expect(job).toHaveProperty('createdAt');
    });
  });

  describe('Error Handling', () => {
    it('should return 500 when database query fails', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.select.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const response = await GET(
        new NextRequest('http://localhost/api/export/queue', { method: 'GET' }),
        { params: Promise.resolve({}) }
      );

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to fetch render queue');
    });
  });
});
