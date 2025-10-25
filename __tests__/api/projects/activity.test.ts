/**
 * Tests for GET /api/projects/[projectId]/activity - Project Activity Log
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/projects/[projectId]/activity/route';
import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  resetAllMocks,
} from '@/__tests__/helpers/apiMocks';

/**
 * Mock withAuth to handle both 2-param and 3-param handler signatures
 * - 2-param: handler(request, authContext) - for routes without params
 * - 3-param: handler(request, authContext, routeContext) - for routes with params like [projectId]
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

      // Check if this is a dynamic route (has params)
      if (context?.params !== undefined) {
        // 3-param signature: handler(request, authContext, routeContext)
        const routeContext = { params: context.params };
        return handler(req, authContext, routeContext);
      } else {
        // 2-param signature: handler(request, authContext)
        return handler(req, authContext);
      }
    },
  })
);

// Mock the Supabase module
jest.mock(
  '@/lib/supabase',
  (): Record<string, unknown> => ({
    createServerSupabaseClient: jest.fn(),
  })
);

// Mock server logger
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

describe('GET /api/projects/[projectId]/activity', () => {
  let mockSupabase: any;
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

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockUnauthenticatedUser(mockSupabase);
      const request = new NextRequest(`http://localhost/api/projects/${projectId}/activity`);
      const response = await GET(request, { params: Promise.resolve({ projectId }) });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Input Validation', () => {
    it('should return 400 when project ID is missing', async () => {
      mockAuthenticatedUser(mockSupabase);
      const request = new NextRequest('http://localhost/api/projects//activity');
      const response = await GET(request, { params: Promise.resolve({ projectId: '' }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Project ID is required');
    });

    it('should validate limit parameter is within bounds', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { user_id: mockUser.id },
          error: null,
        }),
      });

      const request = new NextRequest(
        `http://localhost/api/projects/${projectId}/activity?limit=101`
      );
      const response = await GET(request, { params: Promise.resolve({ projectId }) });

      expect(response.status).toBe(400);
    });

    it('should validate offset parameter is non-negative', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { user_id: mockUser.id },
          error: null,
        }),
      });

      const request = new NextRequest(
        `http://localhost/api/projects/${projectId}/activity?offset=-1`
      );
      const response = await GET(request, { params: Promise.resolve({ projectId }) });

      expect(response.status).toBe(400);
    });
  });

  describe('Authorization', () => {
    it('should return 404 when project does not exist', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      });

      const request = new NextRequest(`http://localhost/api/projects/${projectId}/activity`);
      const response = await GET(request, { params: Promise.resolve({ projectId }) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Project not found');
    });

    it('should return 403 when user is not owner or collaborator', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      // Mock project owned by different user
      const projectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { user_id: 'different-user-id' },
          error: null,
        }),
      };

      // Mock no collaborator relationship
      const collabQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? projectQuery : collabQuery;
      });

      const request = new NextRequest(`http://localhost/api/projects/${projectId}/activity`);
      const response = await GET(request, { params: Promise.resolve({ projectId }) });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Access denied');
    });

    it('should allow access when user is owner', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      const projectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { user_id: mockUser.id },
          error: null,
        }),
      };

      const activityQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      };

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? projectQuery : activityQuery;
      });

      const request = new NextRequest(`http://localhost/api/projects/${projectId}/activity`);
      const response = await GET(request, { params: Promise.resolve({ projectId }) });

      expect(response.status).toBe(200);
    });

    it('should allow access when user is collaborator', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      const projectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { user_id: 'different-user-id' },
          error: null,
        }),
      };

      const collabQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'collab-id' },
          error: null,
        }),
      };

      const activityQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      };

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return projectQuery;
        if (callCount === 2) return collabQuery;
        return activityQuery;
      });

      const request = new NextRequest(`http://localhost/api/projects/${projectId}/activity`);
      const response = await GET(request, { params: Promise.resolve({ projectId }) });

      expect(response.status).toBe(200);
    });
  });

  describe('Success Cases', () => {
    it('should return activities with default pagination', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      const mockActivities = [
        { id: '1', action: 'created', created_at: new Date().toISOString() },
        { id: '2', action: 'updated', created_at: new Date().toISOString() },
      ];

      const projectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { user_id: mockUser.id },
          error: null,
        }),
      };

      const activityQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: mockActivities,
          error: null,
          count: 2,
        }),
      };

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? projectQuery : activityQuery;
      });

      const request = new NextRequest(`http://localhost/api/projects/${projectId}/activity`);
      const response = await GET(request, { params: Promise.resolve({ projectId }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.activities).toEqual(mockActivities);
      expect(data.total).toBe(2);
      expect(data.limit).toBe(50);
      expect(data.offset).toBe(0);
    });

    it('should return activities with custom pagination', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      const projectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { user_id: mockUser.id },
          error: null,
        }),
      };

      const activityQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      };

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? projectQuery : activityQuery;
      });

      const request = new NextRequest(
        `http://localhost/api/projects/${projectId}/activity?limit=10&offset=5`
      );
      const response = await GET(request, { params: Promise.resolve({ projectId }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.limit).toBe(10);
      expect(data.offset).toBe(5);
    });

    it('should cap limit at 100', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      const projectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { user_id: mockUser.id },
          error: null,
        }),
      };

      const activityQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      };

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? projectQuery : activityQuery;
      });

      const request = new NextRequest(
        `http://localhost/api/projects/${projectId}/activity?limit=100`
      );
      const response = await GET(request, { params: Promise.resolve({ projectId }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.limit).toBe(100);
    });
  });

  describe('Error Handling', () => {
    it('should return 500 when database query fails', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      const projectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { user_id: mockUser.id },
          error: null,
        }),
      };

      const activityQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
          count: null,
        }),
      };

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? projectQuery : activityQuery;
      });

      const request = new NextRequest(`http://localhost/api/projects/${projectId}/activity`);
      const response = await GET(request, { params: Promise.resolve({ projectId }) });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to fetch activity log');
    });
  });
});
