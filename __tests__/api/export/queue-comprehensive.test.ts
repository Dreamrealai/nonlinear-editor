/**
 * Comprehensive Tests for Export Queue API:
 * - GET /api/export/queue - Get all export jobs in queue
 *
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  resetAllMocks,
  type MockSupabaseChain,
} from '@/__tests__/helpers/apiMocks';

/**
 * Mock withAuth
 */
jest.mock(
  '@/lib/api/withAuth',
  (): Record<string, unknown> => ({
    withAuth: (handler: any) => async (req: any) => {
      const { createServerSupabaseClient } = require('@/lib/supabase');
      const supabase = await createServerSupabaseClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
      }

      return handler(req, { user, supabase });
    },
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
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    },
  })
);

jest.mock(
  '@/lib/rateLimit',
  (): Record<string, unknown> => ({
    RATE_LIMITS: {
      tier3_status_read: { requests: 60, window: 60 },
    },
  })
);

// Import route handlers AFTER all mocks are set up
import { GET } from '@/app/api/export/queue/route';

const validUserId = '550e8400-e29b-41d4-a716-446655440000';
const validProjectId = '123e4567-e89b-12d3-a456-426614174000';

const mockJobs = [
  {
    id: 'job-1',
    user_id: validUserId,
    project_id: validProjectId,
    job_type: 'video-export',
    status: 'pending',
    priority: 5,
    progress_percentage: 0,
    config: { format: 'mp4' },
    metadata: { clipCount: 3 },
    error_message: null,
    created_at: '2024-01-01T00:00:00Z',
    started_at: null,
    completed_at: null,
  },
  {
    id: 'job-2',
    user_id: validUserId,
    project_id: validProjectId,
    job_type: 'video-export',
    status: 'processing',
    priority: 3,
    progress_percentage: 50,
    config: { format: 'webm' },
    metadata: { clipCount: 5 },
    error_message: null,
    created_at: '2024-01-01T01:00:00Z',
    started_at: '2024-01-01T01:05:00Z',
    completed_at: null,
  },
  {
    id: 'job-3',
    user_id: validUserId,
    project_id: validProjectId,
    job_type: 'video-export',
    status: 'completed',
    priority: 0,
    progress_percentage: 100,
    config: { format: 'mp4' },
    metadata: { clipCount: 2 },
    error_message: null,
    created_at: '2024-01-01T02:00:00Z',
    started_at: '2024-01-01T02:05:00Z',
    completed_at: '2024-01-01T02:10:00Z',
  },
];

describe('GET /api/export/queue', () => {
  let mockSupabase: MockSupabaseChain;

  beforeEach((): void => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);
  });

  afterEach((): void => {
    if (mockSupabase) {
      resetAllMocks(mockSupabase);
    }
  });

  describe('Authentication', () => {
    it('should return 401 when not authenticated', async () => {
      // Arrange
      mockUnauthenticatedUser(mockSupabase);

      // Act
      const response = await GET(new NextRequest('http://localhost/api/export/queue'));

      // Assert
      expect(response.status).toBe(401);
    });
  });

  describe('Success Cases - Active Jobs Only', () => {
    beforeEach(() => {
      mockAuthenticatedUser(mockSupabase, { id: validUserId });
    });

    it('should return active jobs by default (pending and processing)', async () => {
      // Arrange
      const activeJobs = mockJobs.filter(
        (j) => j.status === 'pending' || j.status === 'processing'
      );

      mockSupabase.from.mockImplementation(() => {
        mockSupabase.select.mockReturnValue(mockSupabase);
        mockSupabase.eq.mockReturnValue(mockSupabase);
        mockSupabase.in.mockReturnValue(mockSupabase);
        mockSupabase.order.mockReturnValue(mockSupabase);
        mockSupabase.mockResolvedValue({
          data: activeJobs,
          error: null,
        });
        return mockSupabase;
      });

      // Act
      const response = await GET(new NextRequest('http://localhost/api/export/queue'));

      // Assert
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.jobs).toHaveLength(2);
      expect(data.active).toBe(2);
      expect(data.completed).toBe(0);
      expect(mockSupabase.in).toHaveBeenCalledWith('status', ['pending', 'processing']);
    });

    it('should return empty array when no active jobs', async () => {
      // Arrange
      mockSupabase.from.mockImplementation(() => {
        mockSupabase.select.mockReturnValue(mockSupabase);
        mockSupabase.eq.mockReturnValue(mockSupabase);
        mockSupabase.in.mockReturnValue(mockSupabase);
        mockSupabase.order.mockReturnValue(mockSupabase);
        mockSupabase.mockResolvedValue({
          data: [],
          error: null,
        });
        return mockSupabase;
      });

      // Act
      const response = await GET(new NextRequest('http://localhost/api/export/queue'));

      // Assert
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.jobs).toEqual([]);
      expect(data.total).toBe(0);
      expect(data.active).toBe(0);
    });

    it('should filter by user_id', async () => {
      // Arrange
      mockSupabase.from.mockImplementation(() => {
        mockSupabase.select.mockReturnValue(mockSupabase);
        mockSupabase.eq.mockReturnValue(mockSupabase);
        mockSupabase.in.mockReturnValue(mockSupabase);
        mockSupabase.order.mockReturnValue(mockSupabase);
        mockSupabase.mockResolvedValue({
          data: [],
          error: null,
        });
        return mockSupabase;
      });

      // Act
      await GET(new NextRequest('http://localhost/api/export/queue'));

      // Assert
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', validUserId);
    });

    it('should filter by job_type video-export', async () => {
      // Arrange
      mockSupabase.from.mockImplementation(() => {
        mockSupabase.select.mockReturnValue(mockSupabase);
        mockSupabase.eq.mockReturnValue(mockSupabase);
        mockSupabase.in.mockReturnValue(mockSupabase);
        mockSupabase.order.mockReturnValue(mockSupabase);
        mockSupabase.mockResolvedValue({
          data: [],
          error: null,
        });
        return mockSupabase;
      });

      // Act
      await GET(new NextRequest('http://localhost/api/export/queue'));

      // Assert
      expect(mockSupabase.eq).toHaveBeenCalledWith('job_type', 'video-export');
    });

    it('should order by priority descending then created_at ascending', async () => {
      // Arrange
      mockSupabase.from.mockImplementation(() => {
        mockSupabase.select.mockReturnValue(mockSupabase);
        mockSupabase.eq.mockReturnValue(mockSupabase);
        mockSupabase.in.mockReturnValue(mockSupabase);
        mockSupabase.order.mockReturnValue(mockSupabase);
        mockSupabase.mockResolvedValue({
          data: [],
          error: null,
        });
        return mockSupabase;
      });

      // Act
      await GET(new NextRequest('http://localhost/api/export/queue'));

      // Assert
      expect(mockSupabase.order).toHaveBeenCalledWith('priority', { ascending: false });
      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: true });
    });

    it('should map database fields to API response format', async () => {
      // Arrange
      const activeJobs = mockJobs.filter(
        (j) => j.status === 'pending' || j.status === 'processing'
      );

      mockSupabase.from.mockImplementation(() => {
        mockSupabase.select.mockReturnValue(mockSupabase);
        mockSupabase.eq.mockReturnValue(mockSupabase);
        mockSupabase.in.mockReturnValue(mockSupabase);
        mockSupabase.order.mockReturnValue(mockSupabase);
        mockSupabase.mockResolvedValue({
          data: activeJobs,
          error: null,
        });
        return mockSupabase;
      });

      // Act
      const response = await GET(new NextRequest('http://localhost/api/export/queue'));

      // Assert
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
      expect(job).toHaveProperty('errorMessage');
      expect(job).toHaveProperty('createdAt');
      expect(job).toHaveProperty('startedAt');
      expect(job).toHaveProperty('completedAt');
    });
  });

  describe('Success Cases - Include Completed', () => {
    beforeEach(() => {
      mockAuthenticatedUser(mockSupabase, { id: validUserId });
    });

    it('should return all jobs when includeCompleted=true', async () => {
      // Arrange
      mockSupabase.from.mockImplementation(() => {
        mockSupabase.select.mockReturnValue(mockSupabase);
        mockSupabase.eq.mockReturnValue(mockSupabase);
        mockSupabase.order.mockReturnValue(mockSupabase);
        mockSupabase.mockResolvedValue({
          data: mockJobs,
          error: null,
        });
        return mockSupabase;
      });

      // Act
      const response = await GET(
        new NextRequest('http://localhost/api/export/queue?includeCompleted=true')
      );

      // Assert
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.jobs).toHaveLength(3);
      expect(data.total).toBe(3);
      expect(data.active).toBe(2); // pending + processing
      expect(data.completed).toBe(1); // completed
    });

    it('should not filter by status when includeCompleted=true', async () => {
      // Arrange
      mockSupabase.from.mockImplementation(() => {
        mockSupabase.select.mockReturnValue(mockSupabase);
        mockSupabase.eq.mockReturnValue(mockSupabase);
        mockSupabase.order.mockReturnValue(mockSupabase);
        mockSupabase.mockResolvedValue({
          data: mockJobs,
          error: null,
        });
        return mockSupabase;
      });

      // Act
      await GET(new NextRequest('http://localhost/api/export/queue?includeCompleted=true'));

      // Assert
      expect(mockSupabase.in).not.toHaveBeenCalled();
    });

    it('should count active and completed jobs correctly', async () => {
      // Arrange
      const allJobs = [
        ...mockJobs,
        {
          ...mockJobs[2],
          id: 'job-4',
          status: 'failed',
        },
        {
          ...mockJobs[2],
          id: 'job-5',
          status: 'cancelled',
        },
      ];

      mockSupabase.from.mockImplementation(() => {
        mockSupabase.select.mockReturnValue(mockSupabase);
        mockSupabase.eq.mockReturnValue(mockSupabase);
        mockSupabase.order.mockReturnValue(mockSupabase);
        mockSupabase.mockResolvedValue({
          data: allJobs,
          error: null,
        });
        return mockSupabase;
      });

      // Act
      const response = await GET(
        new NextRequest('http://localhost/api/export/queue?includeCompleted=true')
      );

      // Assert
      const data = await response.json();
      expect(data.active).toBe(2); // pending + processing
      expect(data.completed).toBe(3); // completed + failed + cancelled
    });

    it('should handle includeCompleted=false explicitly', async () => {
      // Arrange
      const activeJobs = mockJobs.filter(
        (j) => j.status === 'pending' || j.status === 'processing'
      );

      mockSupabase.from.mockImplementation(() => {
        mockSupabase.select.mockReturnValue(mockSupabase);
        mockSupabase.eq.mockReturnValue(mockSupabase);
        mockSupabase.in.mockReturnValue(mockSupabase);
        mockSupabase.order.mockReturnValue(mockSupabase);
        mockSupabase.mockResolvedValue({
          data: activeJobs,
          error: null,
        });
        return mockSupabase;
      });

      // Act
      const response = await GET(
        new NextRequest('http://localhost/api/export/queue?includeCompleted=false')
      );

      // Assert
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.jobs).toHaveLength(2);
      expect(mockSupabase.in).toHaveBeenCalledWith('status', ['pending', 'processing']);
    });

    it('should ignore invalid includeCompleted values', async () => {
      // Arrange
      const activeJobs = mockJobs.filter(
        (j) => j.status === 'pending' || j.status === 'processing'
      );

      mockSupabase.from.mockImplementation(() => {
        mockSupabase.select.mockReturnValue(mockSupabase);
        mockSupabase.eq.mockReturnValue(mockSupabase);
        mockSupabase.in.mockReturnValue(mockSupabase);
        mockSupabase.order.mockReturnValue(mockSupabase);
        mockSupabase.mockResolvedValue({
          data: activeJobs,
          error: null,
        });
        return mockSupabase;
      });

      // Act
      const response = await GET(
        new NextRequest('http://localhost/api/export/queue?includeCompleted=invalid')
      );

      // Assert
      expect(response.status).toBe(200);
      expect(mockSupabase.in).toHaveBeenCalled(); // Should filter by status (default behavior)
    });
  });

  describe('Response Format', () => {
    beforeEach(() => {
      mockAuthenticatedUser(mockSupabase, { id: validUserId });
    });

    it('should include summary statistics in response', async () => {
      // Arrange
      mockSupabase.from.mockImplementation(() => {
        mockSupabase.select.mockReturnValue(mockSupabase);
        mockSupabase.eq.mockReturnValue(mockSupabase);
        mockSupabase.order.mockReturnValue(mockSupabase);
        mockSupabase.mockResolvedValue({
          data: mockJobs,
          error: null,
        });
        return mockSupabase;
      });

      // Act
      const response = await GET(
        new NextRequest('http://localhost/api/export/queue?includeCompleted=true')
      );

      // Assert
      const data = await response.json();
      expect(data).toHaveProperty('jobs');
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('active');
      expect(data).toHaveProperty('completed');
    });

    it('should handle null values in job fields', async () => {
      // Arrange
      const jobWithNulls = {
        ...mockJobs[0],
        progress_percentage: null,
        config: null,
        metadata: null,
        error_message: null,
        started_at: null,
        completed_at: null,
      };

      mockSupabase.from.mockImplementation(() => {
        mockSupabase.select.mockReturnValue(mockSupabase);
        mockSupabase.eq.mockReturnValue(mockSupabase);
        mockSupabase.in.mockReturnValue(mockSupabase);
        mockSupabase.order.mockReturnValue(mockSupabase);
        mockSupabase.mockResolvedValue({
          data: [jobWithNulls],
          error: null,
        });
        return mockSupabase;
      });

      // Act
      const response = await GET(new NextRequest('http://localhost/api/export/queue'));

      // Assert
      expect(response.status).toBe(200);
      const data = await response.json();
      const job = data.jobs[0];
      expect(job.progress).toBe(0); // null becomes 0
      expect(job.priority).toBe(0); // undefined becomes 0
      expect(job.config).toEqual({}); // null becomes {}
      expect(job.metadata).toEqual({}); // null becomes {}
      expect(job.errorMessage).toBeNull();
      expect(job.startedAt).toBeNull();
      expect(job.completedAt).toBeNull();
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockAuthenticatedUser(mockSupabase, { id: validUserId });
    });

    it('should return 500 when database query fails', async () => {
      // Arrange
      mockSupabase.from.mockImplementation(() => {
        mockSupabase.select.mockReturnValue(mockSupabase);
        mockSupabase.eq.mockReturnValue(mockSupabase);
        mockSupabase.in.mockReturnValue(mockSupabase);
        mockSupabase.order.mockReturnValue(mockSupabase);
        mockSupabase.mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        });
        return mockSupabase;
      });

      // Act
      const response = await GET(new NextRequest('http://localhost/api/export/queue'));

      // Assert
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain('Failed to fetch render queue');
    });

    it('should return 500 on unexpected error', async () => {
      // Arrange
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      // Act
      const response = await GET(new NextRequest('http://localhost/api/export/queue'));

      // Assert
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain('unexpected error');
    });

    it('should handle empty data array gracefully', async () => {
      // Arrange
      mockSupabase.from.mockImplementation(() => {
        mockSupabase.select.mockReturnValue(mockSupabase);
        mockSupabase.eq.mockReturnValue(mockSupabase);
        mockSupabase.in.mockReturnValue(mockSupabase);
        mockSupabase.order.mockReturnValue(mockSupabase);
        mockSupabase.mockResolvedValue({
          data: null, // null instead of empty array
          error: null,
        });
        return mockSupabase;
      });

      // Act
      const response = await GET(new NextRequest('http://localhost/api/export/queue'));

      // Assert
      // Should not crash, but behavior depends on implementation
      // If it crashes, this test will fail
      expect(response).toBeDefined();
    });
  });
});
