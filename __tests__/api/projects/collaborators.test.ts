/**
 * Tests for GET /api/projects/[projectId]/collaborators - Project Collaborators
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/projects/[projectId]/collaborators/route';
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
    },
  })
);

describe('GET /api/projects/[projectId]/collaborators', () => {
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
      const request = new NextRequest(`http://localhost/api/projects/${projectId}/collaborators`);
      const response = await GET(request, { params: Promise.resolve({ projectId }) });

      expect(response.status).toBe(401);
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

      const request = new NextRequest(`http://localhost/api/projects/${projectId}/collaborators`);
      const response = await GET(request, { params: Promise.resolve({ projectId }) });

      expect(response.status).toBe(404);
    });

    it('should return 403 when user is not owner or collaborator', async () => {
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
          data: null,
          error: null,
        }),
      };

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? projectQuery : collabQuery;
      });

      const request = new NextRequest(`http://localhost/api/projects/${projectId}/collaborators`);
      const response = await GET(request, { params: Promise.resolve({ projectId }) });

      expect(response.status).toBe(403);
    });

    it('should allow access when user is owner', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      const mockCollaborators = [
        { id: '1', user_id: 'user-1', role: 'editor' },
        { id: '2', user_id: 'user-2', role: 'viewer' },
      ];

      const projectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { user_id: mockUser.id },
          error: null,
        }),
      };

      const collabQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockCollaborators,
          error: null,
        }),
      };

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? projectQuery : collabQuery;
      });

      const request = new NextRequest(`http://localhost/api/projects/${projectId}/collaborators`);
      const response = await GET(request, { params: Promise.resolve({ projectId }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.collaborators).toEqual(mockCollaborators);
    });
  });

  describe('Success Cases', () => {
    it('should return empty array when no collaborators exist', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      const projectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { user_id: mockUser.id },
          error: null,
        }),
      };

      const collabQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? projectQuery : collabQuery;
      });

      const request = new NextRequest(`http://localhost/api/projects/${projectId}/collaborators`);
      const response = await GET(request, { params: Promise.resolve({ projectId }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.collaborators).toEqual([]);
    });

    it('should return ordered collaborators', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      const mockCollaborators = [
        { id: '1', user_id: 'user-1', role: 'editor', created_at: '2024-01-02' },
        { id: '2', user_id: 'user-2', role: 'viewer', created_at: '2024-01-01' },
      ];

      const projectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { user_id: mockUser.id },
          error: null,
        }),
      };

      const collabQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockCollaborators,
          error: null,
        }),
      };

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? projectQuery : collabQuery;
      });

      const request = new NextRequest(`http://localhost/api/projects/${projectId}/collaborators`);
      const response = await GET(request, { params: Promise.resolve({ projectId }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.collaborators).toEqual(mockCollaborators);
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

      const collabQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? projectQuery : collabQuery;
      });

      const request = new NextRequest(`http://localhost/api/projects/${projectId}/collaborators`);
      const response = await GET(request, { params: Promise.resolve({ projectId }) });

      expect(response.status).toBe(500);
    });
  });
});
