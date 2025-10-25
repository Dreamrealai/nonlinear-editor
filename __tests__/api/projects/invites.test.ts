/**
 * Tests for /api/projects/[projectId]/invites - Project Invites
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/projects/[projectId]/invites/route';
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

describe('GET /api/projects/[projectId]/invites', () => {
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
      const request = new NextRequest(`http://localhost/api/projects/${projectId}/invites`);
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

      const request = new NextRequest(`http://localhost/api/projects/${projectId}/invites`);
      const response = await GET(request, { params: Promise.resolve({ projectId }) });

      expect(response.status).toBe(404);
    });

    it('should return 403 when user is not owner', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { user_id: 'different-user-id' },
          error: null,
        }),
      });

      const request = new NextRequest(`http://localhost/api/projects/${projectId}/invites`);
      const response = await GET(request, { params: Promise.resolve({ projectId }) });

      expect(response.status).toBe(403);
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

      const invitesQuery = {
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
        return callCount === 1 ? projectQuery : invitesQuery;
      });

      const request = new NextRequest(`http://localhost/api/projects/${projectId}/invites`);
      const response = await GET(request, { params: Promise.resolve({ projectId }) });

      expect(response.status).toBe(200);
    });
  });

  describe('Success Cases', () => {
    it('should return list of invites', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      const mockInvites = [
        { id: '1', email: 'user1@example.com', role: 'editor', status: 'pending' },
        { id: '2', email: 'user2@example.com', role: 'viewer', status: 'pending' },
      ];

      const projectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { user_id: mockUser.id },
          error: null,
        }),
      };

      const invitesQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockInvites,
          error: null,
        }),
      };

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? projectQuery : invitesQuery;
      });

      const request = new NextRequest(`http://localhost/api/projects/${projectId}/invites`);
      const response = await GET(request, { params: Promise.resolve({ projectId }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.invites).toEqual(mockInvites);
    });
  });
});

describe('POST /api/projects/[projectId]/invites', () => {
  let mockSupabase: any;
  const projectId = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';

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
      const request = new NextRequest(`http://localhost/api/projects/${projectId}/invites`, {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com', role: 'editor' }),
      });
      const response = await POST(request, { params: Promise.resolve({ projectId }) });

      expect(response.status).toBe(401);
    });
  });

  describe('Input Validation', () => {
    it('should return 400 for invalid email', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      const request = new NextRequest(`http://localhost/api/projects/${projectId}/invites`, {
        method: 'POST',
        body: JSON.stringify({ email: 'invalid-email', role: 'editor' }),
      });
      const response = await POST(request, { params: Promise.resolve({ projectId }) });

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid role', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      const request = new NextRequest(`http://localhost/api/projects/${projectId}/invites`, {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com', role: 'invalid' }),
      });
      const response = await POST(request, { params: Promise.resolve({ projectId }) });

      expect(response.status).toBe(400);
    });

    it('should return 400 for missing email', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      const request = new NextRequest(`http://localhost/api/projects/${projectId}/invites`, {
        method: 'POST',
        body: JSON.stringify({ role: 'editor' }),
      });
      const response = await POST(request, { params: Promise.resolve({ projectId }) });

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

      const request = new NextRequest(`http://localhost/api/projects/${projectId}/invites`, {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com', role: 'editor' }),
      });
      const response = await POST(request, { params: Promise.resolve({ projectId }) });

      expect(response.status).toBe(404);
    });

    it('should return 403 when user is not owner', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { user_id: 'different-user-id', name: 'Test Project' },
          error: null,
        }),
      });

      const request = new NextRequest(`http://localhost/api/projects/${projectId}/invites`, {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com', role: 'editor' }),
      });
      const response = await POST(request, { params: Promise.resolve({ projectId }) });

      expect(response.status).toBe(403);
    });
  });

  describe('Success Cases', () => {
    it('should create invite successfully', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      const mockInvite = {
        id: 'invite-id',
        project_id: projectId,
        email: 'test@example.com',
        role: 'editor',
        token: 'invite-token',
      };

      const projectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { user_id: mockUser.id, name: 'Test Project' },
          error: null,
        }),
      };

      const collabCheckQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      const inviteInsertQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockInvite,
          error: null,
        }),
      };

      const activityQuery = {
        insert: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      const callCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'projects') return projectQuery;
        if (table === 'project_collaborators') return collabCheckQuery;
        if (table === 'project_invites') return inviteInsertQuery;
        if (table === 'collaboration_activity') return activityQuery;
        return {};
      });

      const request = new NextRequest(`http://localhost/api/projects/${projectId}/invites`, {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com', role: 'editor' }),
      });
      const response = await POST(request, { params: Promise.resolve({ projectId }) });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.invite).toEqual(mockInvite);
    });

    it('should accept valid roles', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      const roles = ['viewer', 'editor', 'admin'];

      for (const role of roles) {
        jest.clearAllMocks();

        const mockInvite = {
          id: 'invite-id',
          project_id: projectId,
          email: 'test@example.com',
          role,
          token: 'invite-token',
        };

        const projectQuery = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { user_id: mockUser.id, name: 'Test Project' },
            error: null,
          }),
        };

        const collabCheckQuery = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        };

        const inviteInsertQuery = {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: mockInvite,
            error: null,
          }),
        };

        const activityQuery = {
          insert: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        };

        mockSupabase.from.mockImplementation((table: string) => {
          if (table === 'projects') return projectQuery;
          if (table === 'project_collaborators') return collabCheckQuery;
          if (table === 'project_invites') return inviteInsertQuery;
          if (table === 'collaboration_activity') return activityQuery;
          return {};
        });

        const request = new NextRequest(`http://localhost/api/projects/${projectId}/invites`, {
          method: 'POST',
          body: JSON.stringify({ email: 'test@example.com', role }),
        });
        const response = await POST(request, { params: Promise.resolve({ projectId }) });

        expect(response.status).toBe(201);
      }
    });
  });

  describe('Error Handling', () => {
    it('should return 400 when duplicate invite exists', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      const projectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { user_id: mockUser.id, name: 'Test Project' },
          error: null,
        }),
      };

      const collabCheckQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      const inviteInsertQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: '23505' }, // Unique constraint violation
        }),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'projects') return projectQuery;
        if (table === 'project_collaborators') return collabCheckQuery;
        if (table === 'project_invites') return inviteInsertQuery;
        return {};
      });

      const request = new NextRequest(`http://localhost/api/projects/${projectId}/invites`, {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com', role: 'editor' }),
      });
      const response = await POST(request, { params: Promise.resolve({ projectId }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('An invite for this email already exists');
    });
  });
});
