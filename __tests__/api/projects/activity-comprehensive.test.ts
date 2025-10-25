/**
 * Comprehensive Tests for Project Activity API
 * - GET /api/projects/[projectId]/activity - Get activity log with pagination
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
 * Mock withAuth to handle dynamic routes with params
 */
jest.mock(
  '@/lib/api/withAuth',
  (): Record<string, unknown> => ({
    withAuth: (handler: any) => async (req: any, context: any) => {
      const { createServerSupabaseClient } = require('@/lib/supabase');
      const supabase = await createServerSupabaseClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
      }

      const authContext = { user, supabase };

      if (context?.params !== undefined) {
        const routeContext = { params: context.params };
        return handler(req, authContext, routeContext);
      } else {
        return handler(req, authContext);
      }
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
import { GET } from '@/app/api/projects/[projectId]/activity/route';

const validProjectId = '123e4567-e89b-12d3-a456-426614174000';
const validUserId = '550e8400-e29b-41d4-a716-446655440000';

const mockActivities = [
  {
    id: 'activity-1',
    project_id: validProjectId,
    user_id: validUserId,
    action: 'project.created',
    details: { title: 'New Project' },
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'activity-2',
    project_id: validProjectId,
    user_id: validUserId,
    action: 'clip.added',
    details: { clipId: 'clip-1' },
    created_at: '2024-01-01T01:00:00Z',
  },
];

describe('GET /api/projects/[projectId]/activity', () => {
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
      const response = await GET(
        new NextRequest(`http://localhost/api/projects/${validProjectId}/activity`),
        { params: Promise.resolve({ projectId: validProjectId }) }
      );

      // Assert
      expect(response.status).toBe(401);
    });
  });

  describe('Validation', () => {
    it('should return 400 when projectId is missing', async () => {
      // Arrange
      mockAuthenticatedUser(mockSupabase);

      // Act
      const response = await GET(new NextRequest('http://localhost/api/projects//activity'), {
        params: Promise.resolve({ projectId: '' }),
      });

      // Assert
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('required');
    });

    it('should return 400 for invalid limit parameter', async () => {
      // Arrange
      mockAuthenticatedUser(mockSupabase, { id: validUserId });

      // Mock project ownership check
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'projects') {
          mockSupabase.select.mockReturnValue(mockSupabase);
          mockSupabase.eq.mockReturnValue(mockSupabase);
          mockSupabase.single.mockResolvedValue({
            data: { user_id: validUserId },
            error: null,
          });
        }
        return mockSupabase;
      });

      // Act
      const response = await GET(
        new NextRequest(`http://localhost/api/projects/${validProjectId}/activity?limit=invalid`),
        { params: Promise.resolve({ projectId: validProjectId }) }
      );

      // Assert
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('limit');
    });

    it('should return 400 for limit exceeding maximum (100)', async () => {
      // Arrange
      mockAuthenticatedUser(mockSupabase, { id: validUserId });

      // Mock project ownership check
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'projects') {
          mockSupabase.select.mockReturnValue(mockSupabase);
          mockSupabase.eq.mockReturnValue(mockSupabase);
          mockSupabase.single.mockResolvedValue({
            data: { user_id: validUserId },
            error: null,
          });
        }
        return mockSupabase;
      });

      // Act
      const response = await GET(
        new NextRequest(`http://localhost/api/projects/${validProjectId}/activity?limit=150`),
        { params: Promise.resolve({ projectId: validProjectId }) }
      );

      // Assert
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('limit');
    });

    it('should return 400 for negative offset', async () => {
      // Arrange
      mockAuthenticatedUser(mockSupabase, { id: validUserId });

      // Mock project ownership check
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'projects') {
          mockSupabase.select.mockReturnValue(mockSupabase);
          mockSupabase.eq.mockReturnValue(mockSupabase);
          mockSupabase.single.mockResolvedValue({
            data: { user_id: validUserId },
            error: null,
          });
        }
        return mockSupabase;
      });

      // Act
      const response = await GET(
        new NextRequest(`http://localhost/api/projects/${validProjectId}/activity?offset=-1`),
        { params: Promise.resolve({ projectId: validProjectId }) }
      );

      // Assert
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('offset');
    });
  });

  describe('Authorization', () => {
    it('should return 404 when project not found', async () => {
      // Arrange
      mockAuthenticatedUser(mockSupabase, { id: validUserId });

      // Mock project not found
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'projects') {
          mockSupabase.select.mockReturnValue(mockSupabase);
          mockSupabase.eq.mockReturnValue(mockSupabase);
          mockSupabase.single.mockResolvedValue({
            data: null,
            error: { message: 'Not found' },
          });
        }
        return mockSupabase;
      });

      // Act
      const response = await GET(
        new NextRequest(`http://localhost/api/projects/${validProjectId}/activity`),
        { params: Promise.resolve({ projectId: validProjectId }) }
      );

      // Assert
      expect(response.status).toBe(404);
    });

    it('should return 403 when user is not owner and not collaborator', async () => {
      // Arrange
      const differentUserId = '999e9999-e99b-99d9-a999-999999999999';
      mockAuthenticatedUser(mockSupabase, { id: differentUserId });

      // Mock project owned by different user
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'projects') {
          mockSupabase.select.mockReturnValue(mockSupabase);
          mockSupabase.eq.mockReturnValue(mockSupabase);
          mockSupabase.single.mockResolvedValue({
            data: { user_id: validUserId },
            error: null,
          });
        } else if (table === 'project_collaborators') {
          mockSupabase.select.mockReturnValue(mockSupabase);
          mockSupabase.eq.mockReturnValue(mockSupabase);
          mockSupabase.single.mockResolvedValue({
            data: null,
            error: null,
          });
        }
        return mockSupabase;
      });

      // Act
      const response = await GET(
        new NextRequest(`http://localhost/api/projects/${validProjectId}/activity`),
        { params: Promise.resolve({ projectId: validProjectId }) }
      );

      // Assert
      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('Access denied');
    });

    it('should allow access for project owner', async () => {
      // Arrange
      mockAuthenticatedUser(mockSupabase, { id: validUserId });

      // Mock project ownership check
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'projects') {
          mockSupabase.select.mockReturnValue(mockSupabase);
          mockSupabase.eq.mockReturnValue(mockSupabase);
          mockSupabase.single.mockResolvedValue({
            data: { user_id: validUserId },
            error: null,
          });
        } else if (table === 'collaboration_activity') {
          mockSupabase.select.mockReturnValue(mockSupabase);
          mockSupabase.eq.mockReturnValue(mockSupabase);
          mockSupabase.order.mockReturnValue(mockSupabase);
          mockSupabase.range.mockResolvedValue({
            data: mockActivities,
            error: null,
            count: mockActivities.length,
          });
        }
        return mockSupabase;
      });

      // Act
      const response = await GET(
        new NextRequest(`http://localhost/api/projects/${validProjectId}/activity`),
        { params: Promise.resolve({ projectId: validProjectId }) }
      );

      // Assert
      expect(response.status).toBe(200);
    });

    it('should allow access for project collaborator', async () => {
      // Arrange
      const collaboratorId = '888e8888-e88b-88d8-a888-888888888888';
      mockAuthenticatedUser(mockSupabase, { id: collaboratorId });

      // Mock project owned by different user but user is collaborator
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'projects') {
          mockSupabase.select.mockReturnValue(mockSupabase);
          mockSupabase.eq.mockReturnValue(mockSupabase);
          mockSupabase.single.mockResolvedValue({
            data: { user_id: validUserId },
            error: null,
          });
        } else if (table === 'project_collaborators') {
          mockSupabase.select.mockReturnValue(mockSupabase);
          mockSupabase.eq.mockReturnValue(mockSupabase);
          mockSupabase.single.mockResolvedValue({
            data: { id: 'collab-1', user_id: collaboratorId },
            error: null,
          });
        } else if (table === 'collaboration_activity') {
          mockSupabase.select.mockReturnValue(mockSupabase);
          mockSupabase.eq.mockReturnValue(mockSupabase);
          mockSupabase.order.mockReturnValue(mockSupabase);
          mockSupabase.range.mockResolvedValue({
            data: mockActivities,
            error: null,
            count: mockActivities.length,
          });
        }
        return mockSupabase;
      });

      // Act
      const response = await GET(
        new NextRequest(`http://localhost/api/projects/${validProjectId}/activity`),
        { params: Promise.resolve({ projectId: validProjectId }) }
      );

      // Assert
      expect(response.status).toBe(200);
    });
  });

  describe('Success Cases', () => {
    beforeEach(() => {
      mockAuthenticatedUser(mockSupabase, { id: validUserId });

      // Mock project ownership check
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'projects') {
          mockSupabase.select.mockReturnValue(mockSupabase);
          mockSupabase.eq.mockReturnValue(mockSupabase);
          mockSupabase.single.mockResolvedValue({
            data: { user_id: validUserId },
            error: null,
          });
        } else if (table === 'collaboration_activity') {
          mockSupabase.select.mockReturnValue(mockSupabase);
          mockSupabase.eq.mockReturnValue(mockSupabase);
          mockSupabase.order.mockReturnValue(mockSupabase);
          mockSupabase.range.mockResolvedValue({
            data: mockActivities,
            error: null,
            count: mockActivities.length,
          });
        }
        return mockSupabase;
      });
    });

    it('should return activities with default pagination', async () => {
      // Act
      const response = await GET(
        new NextRequest(`http://localhost/api/projects/${validProjectId}/activity`),
        { params: Promise.resolve({ projectId: validProjectId }) }
      );

      // Assert
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.activities).toHaveLength(2);
      expect(data.total).toBe(2);
      expect(data.limit).toBe(50);
      expect(data.offset).toBe(0);
    });

    it('should respect custom limit parameter', async () => {
      // Act
      const response = await GET(
        new NextRequest(`http://localhost/api/projects/${validProjectId}/activity?limit=10`),
        { params: Promise.resolve({ projectId: validProjectId }) }
      );

      // Assert
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.limit).toBe(10);
    });

    it('should respect custom offset parameter', async () => {
      // Act
      const response = await GET(
        new NextRequest(`http://localhost/api/projects/${validProjectId}/activity?offset=20`),
        { params: Promise.resolve({ projectId: validProjectId }) }
      );

      // Assert
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.offset).toBe(20);
    });

    it('should cap limit at 100', async () => {
      // Act
      const response = await GET(
        new NextRequest(`http://localhost/api/projects/${validProjectId}/activity?limit=50`),
        { params: Promise.resolve({ projectId: validProjectId }) }
      );

      // Assert
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.limit).toBeLessThanOrEqual(100);
    });

    it('should return empty array when no activities', async () => {
      // Arrange
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'projects') {
          mockSupabase.select.mockReturnValue(mockSupabase);
          mockSupabase.eq.mockReturnValue(mockSupabase);
          mockSupabase.single.mockResolvedValue({
            data: { user_id: validUserId },
            error: null,
          });
        } else if (table === 'collaboration_activity') {
          mockSupabase.select.mockReturnValue(mockSupabase);
          mockSupabase.eq.mockReturnValue(mockSupabase);
          mockSupabase.order.mockReturnValue(mockSupabase);
          mockSupabase.range.mockResolvedValue({
            data: [],
            error: null,
            count: 0,
          });
        }
        return mockSupabase;
      });

      // Act
      const response = await GET(
        new NextRequest(`http://localhost/api/projects/${validProjectId}/activity`),
        { params: Promise.resolve({ projectId: validProjectId }) }
      );

      // Assert
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.activities).toEqual([]);
      expect(data.total).toBe(0);
    });

    it('should order activities by created_at descending', async () => {
      // Act
      const response = await GET(
        new NextRequest(`http://localhost/api/projects/${validProjectId}/activity`),
        { params: Promise.resolve({ projectId: validProjectId }) }
      );

      // Assert
      expect(response.status).toBe(200);
      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('should apply correct range for pagination', async () => {
      // Act
      await GET(
        new NextRequest(
          `http://localhost/api/projects/${validProjectId}/activity?limit=10&offset=5`
        ),
        { params: Promise.resolve({ projectId: validProjectId }) }
      );

      // Assert
      expect(mockSupabase.range).toHaveBeenCalledWith(5, 14); // offset to offset+limit-1
    });
  });

  describe('Error Handling', () => {
    it('should return 500 when database query fails', async () => {
      // Arrange
      mockAuthenticatedUser(mockSupabase, { id: validUserId });

      // Mock project ownership check success
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'projects') {
          mockSupabase.select.mockReturnValue(mockSupabase);
          mockSupabase.eq.mockReturnValue(mockSupabase);
          mockSupabase.single.mockResolvedValue({
            data: { user_id: validUserId },
            error: null,
          });
        } else if (table === 'collaboration_activity') {
          mockSupabase.select.mockReturnValue(mockSupabase);
          mockSupabase.eq.mockReturnValue(mockSupabase);
          mockSupabase.order.mockReturnValue(mockSupabase);
          mockSupabase.range.mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
            count: null,
          });
        }
        return mockSupabase;
      });

      // Act
      const response = await GET(
        new NextRequest(`http://localhost/api/projects/${validProjectId}/activity`),
        { params: Promise.resolve({ projectId: validProjectId }) }
      );

      // Assert
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain('Failed to fetch activity log');
    });

    it('should return 500 on unexpected error', async () => {
      // Arrange
      mockAuthenticatedUser(mockSupabase, { id: validUserId });

      // Mock project check to throw error
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      // Act
      const response = await GET(
        new NextRequest(`http://localhost/api/projects/${validProjectId}/activity`),
        { params: Promise.resolve({ projectId: validProjectId }) }
      );

      // Assert
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain('Internal server error');
    });
  });
});
