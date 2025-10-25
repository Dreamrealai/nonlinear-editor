/**
 * Tests for DELETE /api/projects/[projectId]/invites/[inviteId] - Revoke Invite
 */

import { NextRequest } from 'next/server';
import { DELETE } from '@/app/api/projects/[projectId]/invites/[inviteId]/route';
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
jest.mock('@/lib/api/withAuth', () => ({
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
}));

jest.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(),
}));

jest.mock('@/lib/serverLogger', () => ({
  serverLogger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('DELETE /api/projects/[projectId]/invites/[inviteId]', () => {
  let mockSupabase: any;
  const projectId = 'test-project-id';
  const inviteId = 'test-invite-id';

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);
  });

  afterEach(() => {
    resetAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockUnauthenticatedUser(mockSupabase);
      const request = new NextRequest(
        `http://localhost/api/projects/${projectId}/invites/${inviteId}`,
        { method: 'DELETE' }
      );
      const response = await DELETE(request, {
        params: Promise.resolve({ projectId, inviteId }),
      });

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

      const request = new NextRequest(
        `http://localhost/api/projects/${projectId}/invites/${inviteId}`,
        { method: 'DELETE' }
      );
      const response = await DELETE(request, {
        params: Promise.resolve({ projectId, inviteId }),
      });

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

      const request = new NextRequest(
        `http://localhost/api/projects/${projectId}/invites/${inviteId}`,
        { method: 'DELETE' }
      );
      const response = await DELETE(request, {
        params: Promise.resolve({ projectId, inviteId }),
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Success Cases', () => {
    it('should revoke invite successfully', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      const projectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { user_id: mockUser.id },
          error: null,
        }),
      };

      const updateQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: null,
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
        if (table === 'project_invites') return updateQuery;
        if (table === 'collaboration_activity') return activityQuery;
        return {};
      });

      const request = new NextRequest(
        `http://localhost/api/projects/${projectId}/invites/${inviteId}`,
        { method: 'DELETE' }
      );
      const response = await DELETE(request, {
        params: Promise.resolve({ projectId, inviteId }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should log activity when revoking invite', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      const projectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { user_id: mockUser.id },
          error: null,
        }),
      };

      const updateQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      const activityInsert = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const activityQuery = {
        insert: activityInsert,
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'projects') return projectQuery;
        if (table === 'project_invites') return updateQuery;
        if (table === 'collaboration_activity') return activityQuery;
        return {};
      });

      const request = new NextRequest(
        `http://localhost/api/projects/${projectId}/invites/${inviteId}`,
        { method: 'DELETE' }
      );
      await DELETE(request, {
        params: Promise.resolve({ projectId, inviteId }),
      });

      expect(activityInsert).toHaveBeenCalledWith({
        project_id: projectId,
        user_id: mockUser.id,
        action: 'revoked_invite',
        details: { invite_id: inviteId },
      });
    });
  });

  describe('Error Handling', () => {
    it('should return 500 when update fails', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      const projectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { user_id: mockUser.id },
          error: null,
        }),
      };

      const updateQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'projects') return projectQuery;
        if (table === 'project_invites') return updateQuery;
        return {};
      });

      const request = new NextRequest(
        `http://localhost/api/projects/${projectId}/invites/${inviteId}`,
        { method: 'DELETE' }
      );
      const response = await DELETE(request, {
        params: Promise.resolve({ projectId, inviteId }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to revoke invite');
    });
  });
});
