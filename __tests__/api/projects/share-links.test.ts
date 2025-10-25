/**
 * Tests for /api/projects/[projectId]/share-links - Share Links
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/projects/[projectId]/share-links/route';
import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  resetAllMocks,
} from '@/__tests__/helpers/apiMocks';

jest.mock(
  '@/lib/api/withAuth',
  (): Record<string, unknown> => ({
    withAuth: jest.fn((handler) => async (req: NextRequest, context: any) => {
      const { createServerSupabaseClient } = require('@/lib/supabase');
      const supabase = await createServerSupabaseClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

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
      error: jest.fn(),
    },
  })
);

describe('GET /api/projects/[projectId]/share-links', () => {
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
      const request = new NextRequest(`http://localhost/api/projects/${projectId}/share-links`);
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

      const request = new NextRequest(`http://localhost/api/projects/${projectId}/share-links`);
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

      const request = new NextRequest(`http://localhost/api/projects/${projectId}/share-links`);
      const response = await GET(request, { params: Promise.resolve({ projectId }) });

      expect(response.status).toBe(403);
    });
  });

  describe('Success Cases', () => {
    it('should return active share links', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      const mockLinks = [
        { id: '1', token: 'abc123', role: 'viewer', is_active: true },
        { id: '2', token: 'def456', role: 'editor', is_active: true },
      ];

      const projectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { user_id: mockUser.id },
          error: null,
        }),
      };

      const linksQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockLinks,
          error: null,
        }),
      };

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? projectQuery : linksQuery;
      });

      const request = new NextRequest(`http://localhost/api/projects/${projectId}/share-links`);
      const response = await GET(request, { params: Promise.resolve({ projectId }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.links).toEqual(mockLinks);
    });
  });
});

describe('POST /api/projects/[projectId]/share-links', () => {
  let mockSupabase: any;
  const projectId = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';

  beforeEach((): void => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);
    process.env.NEXT_PUBLIC_APP_URL = 'https://example.com';
  });

  afterEach((): void => {
    resetAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockUnauthenticatedUser(mockSupabase);
      const request = new NextRequest(`http://localhost/api/projects/${projectId}/share-links`, {
        method: 'POST',
        body: JSON.stringify({ role: 'viewer' }),
      });
      const response = await POST(request, { params: Promise.resolve({ projectId }) });

      expect(response.status).toBe(401);
    });
  });

  describe('Input Validation', () => {
    it('should return 400 for invalid role', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      const request = new NextRequest(`http://localhost/api/projects/${projectId}/share-links`, {
        method: 'POST',
        body: JSON.stringify({ role: 'invalid' }),
      });
      const response = await POST(request, { params: Promise.resolve({ projectId }) });

      expect(response.status).toBe(400);
    });

    it('should return 400 for expires_in_hours out of range', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      const request = new NextRequest(`http://localhost/api/projects/${projectId}/share-links`, {
        method: 'POST',
        body: JSON.stringify({ role: 'viewer', expires_in_hours: 10000 }),
      });
      const response = await POST(request, { params: Promise.resolve({ projectId }) });

      expect(response.status).toBe(400);
    });

    it('should return 400 for max_uses out of range', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      const request = new NextRequest(`http://localhost/api/projects/${projectId}/share-links`, {
        method: 'POST',
        body: JSON.stringify({ role: 'viewer', max_uses: 10000 }),
      });
      const response = await POST(request, { params: Promise.resolve({ projectId }) });

      expect(response.status).toBe(400);
    });
  });

  describe('Success Cases', () => {
    it('should create share link successfully', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      const mockLink = {
        id: 'link-id',
        token: 'abc123def456',
        project_id: projectId,
        role: 'viewer',
        created_by: mockUser.id,
        expires_at: null,
        max_uses: null,
        is_active: true,
      };

      const projectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { user_id: mockUser.id, name: 'Test Project' },
          error: null,
        }),
      };

      const linkInsertQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockLink,
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
        if (table === 'share_links') return linkInsertQuery;
        if (table === 'collaboration_activity') return activityQuery;
        return {};
      });

      const request = new NextRequest(`http://localhost/api/projects/${projectId}/share-links`, {
        method: 'POST',
        body: JSON.stringify({ role: 'viewer' }),
      });
      const response = await POST(request, { params: Promise.resolve({ projectId }) });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.link).toEqual(mockLink);
      expect(data.url).toBe('https://example.com/join/abc123def456');
    });

    it('should accept valid roles', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const roles = ['viewer', 'editor'];

      for (const role of roles) {
        jest.clearAllMocks();

        const mockLink = {
          id: 'link-id',
          token: 'abc123',
          role,
        };

        const projectQuery = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { user_id: mockUser.id, name: 'Test Project' },
            error: null,
          }),
        };

        const linkInsertQuery = {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: mockLink,
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
          if (table === 'share_links') return linkInsertQuery;
          if (table === 'collaboration_activity') return activityQuery;
          return {};
        });

        const request = new NextRequest(`http://localhost/api/projects/${projectId}/share-links`, {
          method: 'POST',
          body: JSON.stringify({ role }),
        });
        const response = await POST(request, { params: Promise.resolve({ projectId }) });

        expect(response.status).toBe(201);
      }
    });

    it('should accept optional expiration and max uses', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      const projectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { user_id: mockUser.id, name: 'Test Project' },
          error: null,
        }),
      };

      const linkInsertQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'link-id', token: 'abc123' },
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
        if (table === 'share_links') return linkInsertQuery;
        if (table === 'collaboration_activity') return activityQuery;
        return {};
      });

      const request = new NextRequest(`http://localhost/api/projects/${projectId}/share-links`, {
        method: 'POST',
        body: JSON.stringify({
          role: 'viewer',
          expires_in_hours: 24,
          max_uses: 10,
        }),
      });
      const response = await POST(request, { params: Promise.resolve({ projectId }) });

      expect(response.status).toBe(201);
    });
  });
});
