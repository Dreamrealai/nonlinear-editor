/**
 * Tests for /api/join/[token] - Invitation and Share Link Handling
 *
 * Test coverage:
 * - POST: Accept share link or invite
 * - GET: Get info about share link/invite
 * - Authentication
 * - Token validation
 * - Share link vs invite logic
 * - Expiration handling
 * - Database RPC calls
 * - Error scenarios
 */

import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/join/[token]/route';
import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  resetAllMocks,
} from '@/test-utils';

// Mock withAuth wrapper
jest.mock(
  '@/lib/api/withAuth',
  () => ({
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
  () => ({
    createServerSupabaseClient: jest.fn(),
  })
);

jest.mock(
  '@/lib/serverLogger',
  () => ({
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
  () => ({
    RATE_LIMITS: {
      tier2_resource_creation: { requests: 10, window: 60 },
      tier3_status_read: { requests: 60, window: 60 },
    },
  })
);

describe('POST /api/join/[token]', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  const validToken = 'abc123def456ghi789';
  const projectId = 'project-123';

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

      const response = await POST(
        new NextRequest(`http://localhost/api/join/${validToken}`, { method: 'POST' }),
        { params: Promise.resolve({ token: validToken }) }
      );

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Token Validation', () => {
    it('should return 400 for empty token', async () => {
      mockAuthenticatedUser(mockSupabase);
      const emptyToken = '';

      const response = await POST(
        new NextRequest(`http://localhost/api/join/${emptyToken}`, { method: 'POST' }),
        { params: Promise.resolve({ token: emptyToken }) }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('token');
      expect(data.field).toBe('token');
    });

    it('should accept valid token string', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.rpc.mockResolvedValue({
        data: [{ link_valid: true, project_id: projectId, role: 'viewer' }],
        error: null,
      });

      const response = await POST(
        new NextRequest(`http://localhost/api/join/${validToken}`, { method: 'POST' }),
        { params: Promise.resolve({ token: validToken }) }
      );

      expect(response.status).toBe(200);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('use_share_link', {
        p_token: validToken,
      });
    });
  });

  describe('Share Link Handling', () => {
    it('should successfully accept valid share link', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.rpc.mockResolvedValue({
        data: [
          {
            link_valid: true,
            project_id: projectId,
            role: 'editor',
            error_message: null,
          },
        ],
        error: null,
      });

      const response = await POST(
        new NextRequest(`http://localhost/api/join/${validToken}`, { method: 'POST' }),
        { params: Promise.resolve({ token: validToken }) }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.project_id).toBe(projectId);
      expect(data.role).toBe('editor');
      expect(data.type).toBe('share_link');
    });

    it('should call use_share_link RPC with correct token', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.rpc.mockResolvedValue({
        data: [{ link_valid: true, project_id: projectId, role: 'viewer' }],
        error: null,
      });

      await POST(new NextRequest(`http://localhost/api/join/${validToken}`, { method: 'POST' }), {
        params: Promise.resolve({ token: validToken }),
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith('use_share_link', {
        p_token: validToken,
      });
    });

    it('should handle share link with viewer role', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.rpc.mockResolvedValue({
        data: [{ link_valid: true, project_id: projectId, role: 'viewer' }],
        error: null,
      });

      const response = await POST(
        new NextRequest(`http://localhost/api/join/${validToken}`, { method: 'POST' }),
        { params: Promise.resolve({ token: validToken }) }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.role).toBe('viewer');
    });

    it('should handle share link with editor role', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.rpc.mockResolvedValue({
        data: [{ link_valid: true, project_id: projectId, role: 'editor' }],
        error: null,
      });

      const response = await POST(
        new NextRequest(`http://localhost/api/join/${validToken}`, { method: 'POST' }),
        { params: Promise.resolve({ token: validToken }) }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.role).toBe('editor');
    });

    it('should try invite when share link is invalid', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.rpc
        .mockResolvedValueOnce({
          data: [{ link_valid: false }],
          error: null,
        })
        .mockResolvedValueOnce({
          data: [{ invite_valid: true, project_id: projectId, role: 'editor' }],
          error: null,
        });

      const response = await POST(
        new NextRequest(`http://localhost/api/join/${validToken}`, { method: 'POST' }),
        { params: Promise.resolve({ token: validToken }) }
      );

      expect(response.status).toBe(200);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('accept_project_invite', {
        p_token: validToken,
      });
    });
  });

  describe('Invite Handling', () => {
    it('should successfully accept valid invite', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.rpc
        .mockResolvedValueOnce({
          data: [],
          error: null,
        })
        .mockResolvedValueOnce({
          data: [
            {
              invite_valid: true,
              project_id: projectId,
              role: 'editor',
              error_message: null,
            },
          ],
          error: null,
        });

      const response = await POST(
        new NextRequest(`http://localhost/api/join/${validToken}`, { method: 'POST' }),
        { params: Promise.resolve({ token: validToken }) }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.project_id).toBe(projectId);
      expect(data.role).toBe('editor');
      expect(data.type).toBe('invite');
    });

    it('should return 400 when invite is invalid', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.rpc
        .mockResolvedValueOnce({
          data: [],
          error: null,
        })
        .mockResolvedValueOnce({
          data: [
            {
              invite_valid: false,
              error_message: 'Invite has expired',
            },
          ],
          error: null,
        });

      const response = await POST(
        new NextRequest(`http://localhost/api/join/${validToken}`, { method: 'POST' }),
        { params: Promise.resolve({ token: validToken }) }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('expired');
    });

    it('should return 400 when invite email mismatch occurs', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.rpc
        .mockResolvedValueOnce({
          data: [],
          error: null,
        })
        .mockResolvedValueOnce({
          data: [
            {
              invite_valid: false,
              error_message: 'Email does not match invite',
            },
          ],
          error: null,
        });

      const response = await POST(
        new NextRequest(`http://localhost/api/join/${validToken}`, { method: 'POST' }),
        { params: Promise.resolve({ token: validToken }) }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Email does not match');
    });
  });

  describe('Fallback and Error Handling', () => {
    it('should return 400 when both share link and invite are invalid', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.rpc
        .mockResolvedValueOnce({
          data: [{ link_valid: false }],
          error: null,
        })
        .mockResolvedValueOnce({
          data: [{ invite_valid: false }],
          error: null,
        });

      const response = await POST(
        new NextRequest(`http://localhost/api/join/${validToken}`, { method: 'POST' }),
        { params: Promise.resolve({ token: validToken }) }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid or expired');
    });

    it('should return 400 when both RPCs return empty arrays', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.rpc
        .mockResolvedValueOnce({
          data: [],
          error: null,
        })
        .mockResolvedValueOnce({
          data: [],
          error: null,
        });

      const response = await POST(
        new NextRequest(`http://localhost/api/join/${validToken}`, { method: 'POST' }),
        { params: Promise.resolve({ token: validToken }) }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid or expired');
    });

    it('should return 500 on unexpected RPC error', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.rpc.mockRejectedValue(new Error('Database connection lost'));

      const response = await POST(
        new NextRequest(`http://localhost/api/join/${validToken}`, { method: 'POST' }),
        { params: Promise.resolve({ token: validToken }) }
      );

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Internal server error');
    });

    it('should log errors on failure', async () => {
      const { serverLogger } = require('@/lib/serverLogger');
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.rpc.mockRejectedValue(new Error('RPC failed'));

      await POST(new NextRequest(`http://localhost/api/join/${validToken}`, { method: 'POST' }), {
        params: Promise.resolve({ token: validToken }),
      });

      expect(serverLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          token: validToken,
          userId: mockUser.id,
        }),
        expect.stringContaining('Error accepting')
      );
    });
  });
});

describe('GET /api/join/[token]', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  const validToken = 'abc123def456ghi789';
  const projectId = 'project-123';
  const projectName = 'Test Project';

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

      const response = await GET(
        new NextRequest(`http://localhost/api/join/${validToken}`, { method: 'GET' }),
        { params: Promise.resolve({ token: validToken }) }
      );

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Token Validation', () => {
    it('should return 400 for empty token', async () => {
      mockAuthenticatedUser(mockSupabase);
      const emptyToken = '';

      const response = await GET(
        new NextRequest(`http://localhost/api/join/${emptyToken}`, { method: 'GET' }),
        { params: Promise.resolve({ token: emptyToken }) }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('token');
    });
  });

  describe('Share Link Info Retrieval', () => {
    it('should return share link information when active', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            project_id: projectId,
            role: 'editor',
            expires_at: '2025-12-31T23:59:59Z',
            max_uses: 10,
            current_uses: 3,
            is_active: true,
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { name: projectName },
          error: null,
        });

      const response = await GET(
        new NextRequest(`http://localhost/api/join/${validToken}`, { method: 'GET' }),
        { params: Promise.resolve({ token: validToken }) }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.type).toBe('share_link');
      expect(data.project_name).toBe(projectName);
      expect(data.role).toBe('editor');
      expect(data.expires_at).toBe('2025-12-31T23:59:59Z');
      expect(data.is_valid).toBe(true);
    });

    it('should query share_links table with correct token', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      await GET(new NextRequest(`http://localhost/api/join/${validToken}`, { method: 'GET' }), {
        params: Promise.resolve({ token: validToken }),
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('share_links');
      expect(mockSupabase.eq).toHaveBeenCalledWith('token', validToken);
    });

    it('should handle inactive share link', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            project_id: projectId,
            role: 'viewer',
            expires_at: '2025-12-31T23:59:59Z',
            max_uses: 10,
            current_uses: 3,
            is_active: false,
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: null,
        });

      const response = await GET(
        new NextRequest(`http://localhost/api/join/${validToken}`, { method: 'GET' }),
        { params: Promise.resolve({ token: validToken }) }
      );

      // Should check invite next since share link is inactive
      expect(mockSupabase.from).toHaveBeenCalledWith('project_invites');
    });
  });

  describe('Invite Info Retrieval', () => {
    it('should return invite information when valid', async () => {
      mockAuthenticatedUser(mockSupabase);
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      mockSupabase.single
        .mockResolvedValueOnce({
          data: null,
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            project_id: projectId,
            email: 'test@example.com',
            role: 'editor',
            expires_at: futureDate,
            status: 'pending',
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { name: projectName },
          error: null,
        });

      const response = await GET(
        new NextRequest(`http://localhost/api/join/${validToken}`, { method: 'GET' }),
        { params: Promise.resolve({ token: validToken }) }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.type).toBe('invite');
      expect(data.project_name).toBe(projectName);
      expect(data.role).toBe('editor');
      expect(data.email).toBe('test@example.com');
      expect(data.is_valid).toBe(true);
    });

    it('should mark expired invite as invalid', async () => {
      mockAuthenticatedUser(mockSupabase);
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      mockSupabase.single
        .mockResolvedValueOnce({
          data: null,
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            project_id: projectId,
            email: 'test@example.com',
            role: 'editor',
            expires_at: pastDate,
            status: 'pending',
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { name: projectName },
          error: null,
        });

      const response = await GET(
        new NextRequest(`http://localhost/api/join/${validToken}`, { method: 'GET' }),
        { params: Promise.resolve({ token: validToken }) }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.is_valid).toBe(false);
    });

    it('should mark accepted invite as invalid', async () => {
      mockAuthenticatedUser(mockSupabase);
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      mockSupabase.single
        .mockResolvedValueOnce({
          data: null,
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            project_id: projectId,
            email: 'test@example.com',
            role: 'editor',
            expires_at: futureDate,
            status: 'accepted',
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { name: projectName },
          error: null,
        });

      const response = await GET(
        new NextRequest(`http://localhost/api/join/${validToken}`, { method: 'GET' }),
        { params: Promise.resolve({ token: validToken }) }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.is_valid).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 when token not found', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.single
        .mockResolvedValueOnce({
          data: null,
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: null,
        });

      const response = await GET(
        new NextRequest(`http://localhost/api/join/${validToken}`, { method: 'GET' }),
        { params: Promise.resolve({ token: validToken }) }
      );

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toContain('Link/invite not found');
    });

    it('should return 500 on database error', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockRejectedValue(new Error('Database error'));

      const response = await GET(
        new NextRequest(`http://localhost/api/join/${validToken}`, { method: 'GET' }),
        { params: Promise.resolve({ token: validToken }) }
      );

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Internal server error');
    });

    it('should handle missing project name gracefully', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            project_id: projectId,
            role: 'editor',
            expires_at: '2025-12-31T23:59:59Z',
            max_uses: 10,
            current_uses: 3,
            is_active: true,
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: null,
        });

      const response = await GET(
        new NextRequest(`http://localhost/api/join/${validToken}`, { method: 'GET' }),
        { params: Promise.resolve({ token: validToken }) }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.project_name).toBe('Unknown Project');
    });

    it('should log errors on failure', async () => {
      const { serverLogger } = require('@/lib/serverLogger');
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockRejectedValue(new Error('Query failed'));

      await GET(new NextRequest(`http://localhost/api/join/${validToken}`, { method: 'GET' }), {
        params: Promise.resolve({ token: validToken }),
      });

      expect(serverLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          token: validToken,
        }),
        expect.stringContaining('Error fetching')
      );
    });
  });
});
